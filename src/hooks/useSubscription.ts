import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
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
    supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_inr')
      .then(({ data }) => setPlans((data as SubscriptionPlan[]) ?? []));
  }, []);

  useEffect(() => {
    if (!user) { setActiveSub(null); setLoading(false); return; }
    supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setActiveSub(data ?? null);
        setLoading(false);
      });
  }, [user]);

  const isPro   = activeSub?.plan_id === 'pro'   || activeSub?.plan_id === 'elite';
  const isElite = activeSub?.plan_id === 'elite';
  const currentPlanId = activeSub?.plan_id ?? 'free';

  return { plans, activeSub, loading, isPro, isElite, currentPlanId };
}
