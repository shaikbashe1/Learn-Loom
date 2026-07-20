import { useState, useEffect } from 'react';
import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_inr: number;  // paise
  features: string[];
  credits_per_month: number;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [plans, setPlans]           = useState<SubscriptionPlan[]>([]);
  const [activeSub, setActiveSub]   = useState<UserSubscription | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    getDocs(query(
      collection(db, 'subscription_plans'),
      where('is_active', '==', true),
      orderBy('price_inr')
    )).then((snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan)));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) { setActiveSub(null); setLoading(false); return; }
    getDocs(query(
      collection(db, 'user_subscriptions'),
      where('user_id', '==', user.id),
      where('status', '==', 'active'),
      orderBy('started_at', 'desc'),
      limit(1)
    )).then((snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setActiveSub({ id: docSnap.id, ...docSnap.data() } as UserSubscription);
      } else {
        setActiveSub(null);
      }
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setActiveSub(null);
      setLoading(false);
    });
  }, [user]);

  const isPro   = activeSub?.plan_id === 'pro'   || activeSub?.plan_id === 'elite';
  const isElite = activeSub?.plan_id === 'elite';
  const currentPlanId = activeSub?.plan_id ?? 'free';

  return { plans, activeSub, loading, isPro, isElite, currentPlanId };
}
