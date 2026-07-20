import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { db } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, onSnapshot, documentId } from 'firebase/firestore';
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
  const [convIds, setConvIds] = useState<string[]>([]);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      setConvIds([]);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch all conversations this user is part of
      const cpQuery = query(collection(db, 'conversation_participants'), where('user_id', '==', user.id));
      const cpSnap = await getDocs(cpQuery);
      
      const myIds = cpSnap.docs.map(d => d.data().conversation_id as string);
      setConvIds(prev => JSON.stringify(prev) === JSON.stringify(myIds) ? prev : myIds);
      
      if (myIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }
      
      const chunkArray = (arr: string[], size: number) => 
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

      const myIdChunks = chunkArray(myIds, 30);
      
      // Fetch conversations
      const convsData: any[] = [];
      for (const chunk of myIdChunks) {
        await Promise.all(chunk.map(async (id) => {
           const d = await getDoc(doc(db, 'conversations', id));
           if (d.exists()) convsData.push({ id: d.id, ...d.data() });
        }));
      }
      
      convsData.sort((a, b) => {
         const tA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
         const tB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
         return tB - tA;
      });

      // Fetch other participants
      const othersData: any[] = [];
      for (const chunk of myIdChunks) {
        const q = query(collection(db, 'conversation_participants'), where('conversation_id', 'in', chunk));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
           const data = d.data();
           if (data.user_id !== user.id) othersData.push(data);
        });
      }

      // Fetch profiles for other participants
      const otherUserIds = [...new Set(othersData.map(p => p.user_id))];
      const profilesData: Record<string, any> = {};
      
      await Promise.all(otherUserIds.map(async (uid) => {
         const docSnap = await getDoc(doc(db, 'profiles', uid));
         if (docSnap.exists()) {
            profilesData[uid] = docSnap.data();
         }
      }));
      
      othersData.forEach(p => {
         p.profiles = profilesData[p.user_id] || { full_name: 'Unknown User', avatar_url: null, role: 'user' };
      });

      // Fetch last messages and unread counts
      const messagesData: any[] = [];
      for (const chunk of myIdChunks) {
        const q = query(collection(db, 'messages'), where('conversation_id', 'in', chunk));
        const snap = await getDocs(q);
        snap.docs.forEach(d => messagesData.push({ id: d.id, ...d.data() }));
      }
      messagesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const builtConvs: ConversationDetail[] = [];
      
      for (const conv of convsData) {
        const otherParticipant = othersData.find(p => p.conversation_id === conv.id) || null;
        const convMessages = messagesData.filter(m => m.conversation_id === conv.id) || [];
        const lastMessage = convMessages[0] || null;
        
        // Unread: message sender is NOT me, and read_at is null
        const unreadCount = convMessages.filter(m => m.sender_id !== user.id && !m.read_at).length;
        
        builtConvs.push({
          conversation: conv as Conversation,
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
    
    // Listen to our participants to detect new conversations
    const qCp = query(collection(db, 'conversation_participants'), where('user_id', '==', user.id));
    let initialCp = true;
    const unsubCp = onSnapshot(qCp, () => {
        if (initialCp) {
            initialCp = false;
        } else {
            fetchConversations();
        }
    });

    return () => unsubCp();
  }, [user, fetchConversations]);

  useEffect(() => {
    if (!user || convIds.length === 0) return;

    const chunkArray = (arr: string[], size: number) => 
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

    const unsubs: (() => void)[] = [];
    const myIdChunks = chunkArray(convIds, 30);
    
    myIdChunks.forEach(chunk => {
       const qMsg = query(collection(db, 'messages'), where('conversation_id', 'in', chunk));
       let initialMsg = true;
       const unsubMsg = onSnapshot(qMsg, () => {
         if (initialMsg) {
             initialMsg = false;
         } else {
             fetchConversations();
         }
       });
       unsubs.push(unsubMsg);
       
       const qConv = query(collection(db, 'conversations'), where(documentId(), 'in', chunk));
       let initialConv = true;
       const unsubConv = onSnapshot(qConv, () => {
         if (initialConv) {
             initialConv = false;
         } else {
             fetchConversations();
         }
       });
       unsubs.push(unsubConv);
    });

    return () => {
       unsubs.forEach(u => u());
    };
  }, [user, convIds, fetchConversations]);

  const markConversationAsRead = async (conversationId: string) => {
    if (!user) return;
    try {
      const q = query(
         collection(db, 'messages'),
         where('conversation_id', '==', conversationId),
         where('sender_id', '!=', user.id)
      );
      const snap = await getDocs(q);
      
      const updatePromises = snap.docs
         .filter(d => !d.data().read_at)
         .map(d => updateDoc(doc(db, 'messages', d.id), { read_at: new Date().toISOString() }));
         
      await Promise.all(updatePromises);
        
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
