import { adminDb } from './firebase-setup';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxCount: number;
  windowReset: string; // ISO timestamp
  planId: string;
}

// Tier-based limits: { endpoint: { planId: maxPerDay } }
const RATE_LIMITS: Record<string, Record<string, number>> = {
  'ai-mentor': {
    free: 5,
    pro: 100,
    elite: 500,
  },
  'ai-roadmap': {
    free: 3,
    pro: 20,
    elite: 500,
  },
  'coding-ai': {
    free: 5,
    pro: 50,
    elite: 500,
  },
};

/**
 * Fetch the user's active subscription plan from Firestore.
 */
async function getUserPlan(userId: string): Promise<string> {
  try {
    const subscriptionsRef = adminDb.collection('subscriptions');
    const snapshot = await subscriptionsRef
      .where('user_id', '==', userId)
      .where('status', '==', 'active')
      .orderBy('started_at', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return 'free';
    const data = snapshot.docs[0].data();
    return data.plan_id ?? 'free';
  } catch (err) {
    return 'free';
  }
}

/**
 * Check and enforce rate limiting for an AI endpoint using Firestore transactions.
 * Returns the rate limit result with plan context.
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const planId = await getUserPlan(userId);
  const endpointLimits = RATE_LIMITS[endpoint] ?? RATE_LIMITS['ai-mentor'];
  const maxCount = endpointLimits[planId] ?? endpointLimits['free'] ?? 5;

  const today = new Date().toISOString().split('T')[0];
  const rateLimitRef = adminDb.collection('rate_limits').doc(`${userId}_${endpoint}_${today}`);
  const windowReset = new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString();

  try {
    const result = await adminDb.runTransaction(async (t) => {
      const doc = await t.get(rateLimitRef);
      
      if (!doc.exists) {
        t.set(rateLimitRef, {
          user_id: userId,
          endpoint,
          date: today,
          count: 1,
        });
        return { allowed: true, current_count: 1 };
      }
      
      const currentCount = doc.data()?.count || 0;
      if (currentCount >= maxCount) {
        return { allowed: false, current_count: currentCount };
      }
      
      t.update(rateLimitRef, { count: currentCount + 1 });
      return { allowed: true, current_count: currentCount + 1 };
    });

    return {
      allowed: result.allowed,
      currentCount: result.current_count,
      maxCount,
      windowReset,
      planId,
    };
  } catch (err) {
    console.error('Rate limit transaction failed:', err);
    // Fail open
    return {
      allowed: true,
      currentCount: 0,
      maxCount,
      windowReset,
      planId,
    };
  }
}

/**
 * Build a 429 response with standard rate limit headers and upgrade CTA.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const resetDate = new Date(result.windowReset);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetDate.getTime() - Date.now()) / 1000));

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: result.planId === 'free'
        ? 'You\'ve reached your daily AI message limit. Upgrade to Pro for 100 messages/day!'
        : 'You\'ve reached your daily AI message limit. Please try again tomorrow.',
      limit: result.maxCount,
      remaining: 0,
      resetAt: result.windowReset,
      planId: result.planId,
      upgradeUrl: '/pricing',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Limit': String(result.maxCount),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.windowReset,
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Build rate limit headers to attach to successful responses.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.maxCount),
    'X-RateLimit-Remaining': String(Math.max(0, result.maxCount - result.currentCount)),
    'X-RateLimit-Reset': result.windowReset,
  };
}
