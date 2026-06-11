import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createHmac } from 'node:crypto';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment parameters' }, 400);
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) return json({ error: 'Razorpay not configured' }, 500);

    // ── HMAC-SHA256 signature verification ──
    const body       = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected   = createHmac('sha256', keySecret).update(body).digest('hex');
    const isValid    = expected === razorpay_signature;

    if (!isValid) {
      return json({ error: 'Signature verification failed — possible tampered request' }, 400);
    }

    // ── Fetch pending order ──
    const { data: order, error: orderErr } = await supabase
      .from('payment_orders')
      .select('id, user_id, plan_id, status')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (orderErr || !order) return json({ error: 'Order not found' }, 404);
    if (order.status === 'paid') return json({ success: true, already_processed: true });

    // ── Mark order paid (optimistic lock on status='created') ──
    const { error: updateErr } = await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        razorpay_payment_id,
        razorpay_signature,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'created');

    if (updateErr) {
      console.error('Order update failed:', updateErr);
      return json({ error: 'Failed to record payment' }, 500);
    }

    // ── Activate subscription ──
    // Deactivate any existing active sub
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .neq('plan_id', 'free');

    // Insert new active subscription (30-day expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase.from('user_subscriptions').insert({
      user_id: user.id,
      plan_id: order.plan_id,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    // ── Award monthly credits ──
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('credits_per_month')
      .eq('id', order.plan_id)
      .maybeSingle();

    if (plan?.credits_per_month) {
      await supabase.rpc('increment_credits', {
        p_user_id: user.id,
        p_amount: plan.credits_per_month,
      });
    }

    return json({ success: true, plan_id: order.plan_id });
  } catch (err) {
    console.error('verify-razorpay-payment error:', err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
