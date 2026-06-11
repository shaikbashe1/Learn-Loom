
CREATE OR REPLACE FUNCTION increment_credits(p_user_id uuid, p_amount int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET credits = COALESCE(credits, 0) + p_amount WHERE id = p_user_id;
END;
$$;
