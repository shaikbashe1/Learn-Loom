import { supabase } from '@/db/supabase';
import type { DBActivityLog } from '@/types/types';

export async function logUserActivity(
  userId: string, 
  actionType: DBActivityLog['action_type'], 
  description?: string
) {
  try {
    const { error } = await supabase.from('user_activity_logs').insert({
      user_id: userId,
      action_type: actionType,
      description
    });
    
    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Activity logging exception:', err);
  }
}
