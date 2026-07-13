// Shared rate-limiting utility for Vercel Edge AI endpoints
// Uses the Supabase `check_and_increment_rate_limit` RPC for atomic enforcement

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
 * Fetch the user's active subscription plan from Supabase.
 */
async function getUserPlan(
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}&status=eq.active&select=plan_id&order=started_at.desc&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) return 'free';
    const data = await res.json();
    return data?.[0]?.plan_id ?? 'free';
  } catch {
    return 'free';
  }
}

/**
 * Check and enforce rate limiting for an AI endpoint.
 * Returns the rate limit result with plan context.
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // If Supabase is not configured, allow the request (fail open)
    return {
      allowed: true,
      currentCount: 0,
      maxCount: 999,
      windowReset: new Date(Date.now() + 86400000).toISOString(),
      planId: 'unknown',
    };
  }

  const planId = await getUserPlan(userId, supabaseUrl, supabaseKey);
  const endpointLimits = RATE_LIMITS[endpoint] ?? RATE_LIMITS['ai-mentor'];
  const maxCount = endpointLimits[planId] ?? endpointLimits['free'] ?? 5;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_endpoint: endpoint,
        p_max_count: maxCount,
      }),
    });

    if (!res.ok) {
      // If the RPC fails, allow the request (fail open)
      console.error('Rate limit RPC error:', await res.text());
      return {
        allowed: true,
        currentCount: 0,
        maxCount,
        windowReset: new Date(Date.now() + 86400000).toISOString(),
        planId,
      };
    }

    const result = await res.json();
    return {
      allowed: result.allowed,
      currentCount: result.current_count,
      maxCount: result.max_count,
      windowReset: result.window_reset,
      planId,
    };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    return {
      allowed: true,
      currentCount: 0,
      maxCount,
      windowReset: new Date(Date.now() + 86400000).toISOString(),
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
