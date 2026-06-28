-- ============================================================
-- LearnLoom Migration 20260628200900 — Messaging Portal
-- ============================================================

-- Helper: Check if a user can message another user
CREATE OR REPLACE FUNCTION public.can_message_user(u1 uuid, u2 uuid)
RETURNS boolean AS $$
DECLARE
  u1_role public.user_role;
  u2_role public.user_role;
BEGIN
  -- Get roles
  SELECT role INTO u1_role FROM public.profiles WHERE id = u1;
  SELECT role INTO u2_role FROM public.profiles WHERE id = u2;

  -- If either is an admin-level user, allow
  IF u1_role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'org_admin'::public.user_role) 
     OR u2_role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'org_admin'::public.user_role) THEN
    RETURN true;
  END IF;

  -- Check if they have a student-instructor relationship via enrollments
  -- (u1 is student, u2 is instructor)
  IF EXISTS (
    SELECT 1 FROM public.user_course_enrollments e
    JOIN public.courses c ON e.course_id = c.id
    WHERE e.user_id = u1 AND c.created_by = u2
  ) THEN
    RETURN true;
  END IF;

  -- (u2 is student, u1 is instructor)
  IF EXISTS (
    SELECT 1 FROM public.user_course_enrollments e
    JOIN public.courses c ON e.course_id = c.id
    WHERE e.user_id = u2 AND c.created_by = u1
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 1. Conversations Table ───────────────────────────────────────────────────
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ── 2. Conversation Participants ─────────────────────────────────────────────
CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- ── 3. Messages ─────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ── 4. Triggers ──────────────────────────────────────────────────────────────

-- Update last_message_at on the conversation
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_conv_last_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Notify recipient
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name text;
BEGIN
  -- Get sender name
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- Get recipient
  SELECT user_id INTO v_recipient_id 
  FROM public.conversation_participants 
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LIMIT 1;
  
  -- Insert notification
  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (v_recipient_id, 'info', COALESCE(v_sender_name, 'Someone') || ' sent you a message.');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_new_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- ── 5. RLS Policies ──────────────────────────────────────────────────────────

-- Conversations
CREATE POLICY "Participant can view conversations" ON public.conversations
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid())
);
CREATE POLICY "Authenticated users can insert conversations" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Participant can update conversations" ON public.conversations
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid())
);

-- Conversation Participants
CREATE POLICY "Participant can view conversation participants" ON public.conversation_participants
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Users can add themselves and others if permitted" ON public.conversation_participants
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id OR public.can_message_user(auth.uid(), user_id)
);

-- Messages
CREATE POLICY "Participant can view messages" ON public.messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Participant can insert messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Participant can update messages" ON public.messages
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid())
);

-- ── 6. Realtime Configuration ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
