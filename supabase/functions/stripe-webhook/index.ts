import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature', { status: 400, headers: corsHeaders });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err);
    return new Response('Invalid signature', { status: 400, headers: corsHeaders });
  }

  const userId = (event.data.object as any).metadata?.supabase_user_id;
  const customerId = (event.data.object as any).customer;

  if (event.type === 'checkout.session.completed' && userId) {
    await supabase.from('profiles').upsert({
      id: userId,
      subscription_tier: 'pro',
      stripe_customer_id: customerId,
      subscription_status: 'active',
    });
  }

  if (event.type === 'customer.subscription.deleted' && customerId) {
    await supabase.from('profiles').update({
      subscription_tier: 'homeowner',
      subscription_status: 'canceled',
      subscription_id: null,
    }).eq('stripe_customer_id', customerId);
  }

  if (event.type === 'customer.subscription.updated' && customerId) {
    const sub = event.data.object as Stripe.Subscription;
    await supabase.from('profiles').update({
      subscription_status: sub.status,
      subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    }).eq('stripe_customer_id', customerId);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});