import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  created_at: string;
  last_message_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface ConversationDetail {
  conversation: Conversation;
  otherParticipant: ConversationParticipant | null;
  lastMessage: Message | null;
  unreadCount: number;
}

interface MessagingContextType {
  conversations: ConversationDetail[];
  unreadCount: number;
  loading: boolean;
  refreshConversations: () => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch all conversations this user is part of
      const { data: myParticipants, error: cpError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
        
      if (cpError) throw cpError;
      
      const convIds = myParticipants?.map(p => p.conversation_id) || [];
      
      if (convIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }
      
      // Fetch conversations
      const { data: convsData } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('last_message_at', { ascending: false });
        
      // Fetch other participants
      const { data: othersData } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id, created_at, profiles(full_name, avatar_url, role)')
        .in('conversation_id', convIds)
        .neq('user_id', user.id);
        
      // Fetch last messages and unread counts
      // Since Supabase doesn't support complex aggregations easily over JS without RPC, 
      // we'll fetch all unread messages for this user in these convs, and the very last message for each.
      
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      const builtConvs: ConversationDetail[] = [];
      
      for (const conv of convsData || []) {
        const otherParticipant = othersData?.find(p => p.conversation_id === conv.id) || null;
        const convMessages = messagesData?.filter(m => m.conversation_id === conv.id) || [];
        const lastMessage = convMessages[0] || null;
        
        // Unread: message sender is NOT me, and read_at is null
        const unreadCount = convMessages.filter(m => m.sender_id !== user.id && !m.read_at).length;
        
        builtConvs.push({
          conversation: conv,
          otherParticipant: otherParticipant as any,
          lastMessage,
          unreadCount
        });
      }
      
      setConversations(builtConvs);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to new messages where we are a recipient or sender
    // We can just listen to 'messages' because RLS ensures we only receive events for our conversations
    const messageChannel = supabase
      .channel('messages-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          // When any message changes, simplest is to refetch all, 
          // or we can optimistically update. Let's just refetch for simplicity and accuracy.
          fetchConversations();
        }
      )
      .subscribe();
      
    const convChannel = supabase
      .channel('conversations-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(convChannel);
    };
  }, [user, fetchConversations]);

  const markConversationAsRead = async (conversationId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);
        
      // Optimistic update
      setConversations(prev => prev.map(c => {
        if (c.conversation.id === conversationId) {
          return { ...c, unreadCount: 0 };
        }
        return c;
      }));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const globalUnreadCount = conversations.reduce((acc, curr) => acc + curr.unreadCount, 0);

  return (
    <MessagingContext.Provider value={{
      conversations,
      unreadCount: globalUnreadCount,
      loading,
      refreshConversations: fetchConversations,
      markConversationAsRead
    }}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within MessagingProvider');
  return ctx;
}
