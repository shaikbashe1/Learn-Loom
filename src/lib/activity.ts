import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { DBActivityLog } from '@/types/types';

export async function logUserActivity(
  userId: string, 
  actionType: DBActivityLog['action_type'], 
  description?: string
) {
  try {
    const logData: any = {
      user_id: userId,
      action_type: actionType,
    };
    if (description !== undefined) {
      logData.description = description;
    }
    
    await addDoc(collection(db, 'user_activity_logs'), logData);
  } catch (err) {
    console.error('Activity logging exception:', err);
  }
}
