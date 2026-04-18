// Crystal Pool — AI diagnosis edge function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT = 10; // Max requests per minute per IP
const USER_DAILY_LIMIT = 1; // Free daily rescue for guests (as per spec)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const rateLimit = new Map<string, number>();

interface Body {
  photo?: string | null;
  symptoms?: string[];
  volumeLiters?: number;
}

const tool = {
  type: "function",
  function: {
    name: "submit_diagnosis",
    description: "Return a structured pool water diagnosis with dosage and recovery steps.",
    parameters: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
        problem: { type: "string", description: "Short title of the main problem (3-6 words)" },
        cause: { type: "string", description: "1-2 sentence explanation of the most likely cause" },
        steps: {
          type: "array",
          items: { type: "string" },
          description: "Ordered recovery steps, 4-7 items, each one short actionable sentence",
        },
        chemicals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              amount: { type: "string", description: "Quantity with unit, sized to provided pool volume" },
              note: { type: "string" },
            },
            required: ["name", "amount"],
            additionalProperties: false,
          },
        },
        timeline: { type: "string", description: "Expected recovery time, e.g. '24-48 hours'" },
      },
      required: ["severity", "problem", "cause", "steps", "chemicals", "timeline"],
      additionalProperties: false,
    },
  },
};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const lastReset = rateLimit.get(ip) || 0;
  if (now - lastReset > windowMs) {
    rateLimit.set(ip, now);
    rateLimit.set(`${ip}:count`, 1);
    return true;
  }
  
  const count = (rateLimit.get(`${ip}:count`) || 0) + 1;
  rateLimit.set(`${ip}:count`, count);
  return count <= RATE_LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Rate limiting by IP (10 req/min)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests. Try again shortly." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Supabase JWT and extract user_id
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 
          apikey: SUPABASE_KEY, 
          Authorization: `Bearer ${token}` 
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userId = userData.id;
      } else if (authHeader.length > 20) {
        // Has auth header but invalid token - reject unauthenticated access
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check guest daily limit (1 free rescue per day for guests)
    const today = new Date().toISOString().split("T")[0];
    
    if (!userId) {
      // Guest IP-based limit would go here, but we require auth for proper access
      return new Response(JSON.stringify({ 
        error: "Authentication required. Sign in to use AI diagnosis." 
      }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user's rescue count today from Supabase
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pool_logs?user_id=eq.${userId}&type=eq.rescue&created_at=gte.${today}T00:00:00&select=id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rescueLogs = await checkRes.json();
    if (Array.isArray(rescueLogs) && rescueLogs.length >= USER_DAILY_LIMIT) {
      return new Response(JSON.stringify({ 
        error: "Daily limit reached (1 free diagnosis/day). Come back tomorrow, or sign in to unlock unlimited AI diagnoses." 
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    
    // Validate required fields
    if (!body.volumeLiters || body.volumeLiters < 100) {
      return new Response(JSON.stringify({ error: "Pool volume is required and must be at least 100 liters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const symptoms = Array.isArray(body.symptoms) ? body.symptoms : [];
    const volume = body.volumeLiters;

    const userText = `Diagnose this pool. Volume: ${volume} liters (${(volume * 0.264).toFixed(0)} US gallons).
Reported symptoms: ${symptoms.length ? symptoms.join(", ") : "none provided"}.
${body.photo ? "A photo of the pool is attached — analyze water color, clarity, surface, and any visible debris." : "No photo provided — base diagnosis on symptoms only."}
Provide chemical dosages SIZED to this exact pool volume. Use common consumer products (liquid chlorine 12.5%, pH increaser/decreaser, algaecide, clarifier, shock). Keep steps practical and safe.`;

    const content: any[] = [{ type: "text", text: userText }];
    if (body.photo && typeof body.photo === "string" && body.photo.startsWith("data:image")) {
      content.push({ type: "image_url", image_url: { url: body.photo } });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert pool chemistry technician. Always return your answer by calling the submit_diagnosis tool. Be precise, safety-first, and size dosages to the user's pool volume." },
          { role: "user", content },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_diagnosis" } },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, text);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited (429). Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted (402). Add funds in Cloud → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error", detail: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      console.error("Missing tool call in response", JSON.stringify(data).slice(0, 600));
      return new Response(JSON.stringify({ error: "AI did not return a structured diagnosis" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("diagnose-pool error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});