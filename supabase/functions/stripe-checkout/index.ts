const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO")!;

interface Body {
  tier: "pro";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await userRes.json();
    const userId = user.id;

    const body = (await req.json()) as Body;
    const tier = body.tier || "pro";

    const cancelUrl = `${req.headers.get("origin") || "https://crystal-pool.app"}/?upgrade=cancel`;
    const successUrl = `${req.headers.get("origin") || "https://crystal-pool.app"}/?upgrade=success`;

    const createRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "customer": "{}", 
        "line_items[0][price]": STRIPE_PRICE_PRO,
        "line_items[0][quantity]": "1",
        "success_url": successUrl,
        "cancel_url": cancelUrl,
        "metadata[user_id]": userId,
        "metadata[tier]": tier,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error("Stripe error:", err);
      return new Response(JSON.stringify({ error: "Failed to create checkout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await createRes.json();
    
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ stripe_customer_id: session.customer }),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});