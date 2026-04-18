const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Invalid webhook" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier || "pro";

      if (userId) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            stripe_customer_id: session.customer,
            subscription_id: session.subscription,
            subscription_tier: tier,
            subscription_status: "active",
          }),
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const updates: Record<string, unknown> = {
        subscription_status: subscription.status,
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      };

      if (subscription.status === "canceled" || subscription.status === "unpaid") {
        updates.subscription_tier = "homeowner";
        updates.subscription_id = null;
      }

      await fetch(`${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(updates),
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      await fetch(`${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          subscription_tier: "homeowner",
          subscription_status: "canceled",
          subscription_id: null,
        }),
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});