// Crystal Pool — AI diagnosis edge function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const symptoms = Array.isArray(body.symptoms) ? body.symptoms : [];
    const volume = body.volumeLiters ?? 50000;

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
