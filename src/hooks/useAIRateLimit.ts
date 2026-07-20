import { useState, useEffect, useCallback } from 'react';
import { db } from '@/db/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';

// Must match the server-side limits in api/_shared/rate-limit.ts
const RATE_LIMITS: Record<string, Record<string, number>> = {
  'ai-mentor': { free: 5, pro: 100, elite: 500 },
  'ai-roadmap': { free: 3, pro: 20, elite: 500 },
  'coding-ai': { free: 5, pro: 50, elite: 500 },
};

export interface AIRateLimitState {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string | null;
  planId: string;
  loading: boolean;
  /** Percentage of limit used (0-100) */
  usagePercent: number;
  /** Refetch usage from the server */
  refetch: () => void;
  /** Optimistically increment usage after a successful message */
  incrementUsed: () => void;
}

export function useAIRateLimit(endpoint: string = 'ai-mentor'): AIRateLimitState {
  const { user } = useAuth();
  const { currentPlanId } = useSubscription();
  const [used, setUsed] = useState(0);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const endpointLimits = RATE_LIMITS[endpoint] ?? RATE_LIMITS['ai-mentor'];
  const limit = endpointLimits[currentPlanId] ?? endpointLimits['free'] ?? 5;

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'rate_limits'),
        where('user_id', '==', user.id),
        where('endpoint', '==', endpoint)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        
        // Check if window has expired
        const resetTime = data.window_reset ? new Date(data.window_reset).getTime() : 0;
        const isExpired = resetTime > 0 && resetTime < Date.now();
        
        if (isExpired) {
          setUsed(0);
          setResetAt(null);
        } else {
          setUsed(data.current_count ?? 0);
          setResetAt(data.window_reset ?? null);
        }
      } else {
        setUsed(0);
        setResetAt(null);
      }
    } catch (err) {
      console.error('Rate limit fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, endpoint]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const incrementUsed = useCallback(() => {
    setUsed(prev => prev + 1);
  }, []);

  const remaining = Math.max(0, limit - used);
  const usagePercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return {
    used,
    limit,
    remaining,
    resetAt,
    planId: currentPlanId,
    loading,
    usagePercent,
    refetch: fetchUsage,
    incrementUsed,
  };
}
