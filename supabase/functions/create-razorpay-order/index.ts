import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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

    const { plan_id } = await req.json();
    if (!plan_id || plan_id === 'free') return json({ error: 'Invalid plan' }, 400);

    // Fetch plan from DB (server-side price — never trust client)
    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('id, name, price_inr')
      .eq('id', plan_id)
      .eq('is_active', true)
      .maybeSingle();
    if (planErr || !plan) return json({ error: 'Plan not found' }, 404);

    const keyId     = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Razorpay not configured' }, 500);

    // Create Razorpay order via REST API
    const basicAuth = btoa(`${keyId}:${keySecret}`);
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        amount: plan.price_inr,   // paise
        currency: 'INR',
        receipt: `ll_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { plan_id: plan.id, user_id: user.id },
      }),
    });

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text();
      console.error('Razorpay order error:', errBody);
      return json({ error: 'Failed to create Razorpay order' }, 502);
    }
    const rzpOrder = await rzpRes.json();

    // Persist order in DB
    const { data: order, error: dbErr } = await supabase
      .from('payment_orders')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_paise: plan.price_inr,
        currency: 'INR',
        status: 'created',
        razorpay_order_id: rzpOrder.id,
      })
      .select('id')
      .single();
    if (dbErr) throw dbErr;

    return json({
      order_id: rzpOrder.id,
      amount: plan.price_inr,
      currency: 'INR',
      key_id: keyId,
      db_order_id: order.id,
      plan_name: plan.name,
    });
  } catch (err) {
    console.error('create-razorpay-order error:', err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
