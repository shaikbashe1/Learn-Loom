import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react';
import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import type { DBNotification } from '@/types/types';

interface NotificationContextType {
  notifications: DBNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', user.id),
        orderBy('created_at', 'desc'),
        limit(30)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DBNotification));
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc'),
      limit(30)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DBNotification));
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.id),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(document => 
      updateDoc(doc(db, 'notifications', document.id), { read: true })
    );
    await Promise.all(updatePromises);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, loading }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
