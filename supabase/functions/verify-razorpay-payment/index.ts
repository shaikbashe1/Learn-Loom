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

    // ── Send receipt email via Resend ──
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const title = 'Payment Receipt & Subscription Upgrade';
        const formattedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f6f9fc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f6f9fc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .banner {
      background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .content {
      padding: 40px;
      color: #334155;
      line-height: 1.6;
      font-size: 15px;
    }
    h1 {
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 20px;
    }
    p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    .receipt-details {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .receipt-row:last-child {
      margin-bottom: 0;
      padding-top: 8px;
      border-top: 1px dashed #e2e8f0;
      font-weight: bold;
      color: #0f172a;
    }
    .receipt-label {
      color: #64748b;
    }
    .receipt-value {
      color: #0f172a;
    }
    .cta-container {
      margin: 30px 0;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(109, 40, 217, 0.15);
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      color: #64748b;
      font-size: 12px;
      margin: 0 0 8px 0;
      font-weight: 500;
    }
    .footer-tagline {
      color: #94a3b8;
      font-size: 11px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="banner">
        <h2 class="logo-text">LearnLoom</h2>
      </div>
      <div class="content">
        <h1>Welcome to LearnLoom Premium!</h1>
        <p>Hi there,</p>
        <p>Thank you for subscribing! Your payment has been verified successfully, and your account has been upgraded to the Premium plan.</p>
        
        <div class="receipt-details">
          <div class="receipt-row">
            <span class="receipt-label">Order ID</span>
            <span class="receipt-value">${razorpay_order_id}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Payment ID</span>
            <span class="receipt-value">${razorpay_payment_id}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Plan</span>
            <span class="receipt-value">${order.plan_id.toUpperCase()}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Credits Credited</span>
            <span class="receipt-value">${plan?.credits_per_month || 0} credits</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Status</span>
            <span class="receipt-value" style="color: #10b981;">Active</span>
          </div>
        </div>

        <p>Your subscription is active and all premium benefits (unlimited coding sandbox compile time, AI-mentoring tools, and dynamic roadmaps) have been unlocked.</p>

        <div class="cta-container">
          <a href="https://learnloom.vercel.app/dashboard" class="cta-button" target="_blank">Go to Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">You are receiving this because you made a purchase on LearnLoom.</p>
        <p class="footer-tagline">LearnLoom — Engineer your potential with AI-driven learning.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'LearnLoom <onboarding@resend.dev>',
            to: [user.email || ''],
            subject: 'Thank you for your purchase - LearnLoom',
            html: formattedHtml,
          }),
        });

        if (!emailRes.ok) {
          console.error('Failed to send purchase confirmation email via Resend:', await emailRes.text());
        } else {
          console.log('Purchase confirmation email sent successfully via Resend to:', user.email);
        }
      } catch (emailErr) {
        console.error('Error sending purchase confirmation email:', emailErr);
      }
    } else {
      console.log('RESEND_API_KEY not configured. Skipping purchase confirmation email.');
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
