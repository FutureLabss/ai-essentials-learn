import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, weeks: numWeeks = 6, lessonsPerWeek = 3 } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert curriculum designer. Generate a comprehensive online course structure.
Return your response ONLY as a valid JSON object (no markdown, no code fences) with this exact schema:
{
  "name": "Course Title",
  "description": "A 2-3 sentence course description",
  "duration_weeks": <number>,
  "weeks": [
    {
      "title": "Week title",
      "description": "Brief week description",
      "lessons": [
        {
          "title": "Lesson title",
          "content": "Detailed lesson content (3-5 paragraphs of educational material covering the topic thoroughly. Include key concepts, explanations, and examples.)",
          "learning_objective": "What learners will achieve",
          "practical_task": "A hands-on exercise or assignment"
        }
      ]
    }
  ]
}

Guidelines:
- Make content educational, detailed, and practical
- Each lesson's content should be 3-5 substantive paragraphs
- Learning objectives should be specific and measurable
- Practical tasks should be actionable and reinforce the lesson
- Build concepts progressively across weeks
- Use clear, accessible language`;

    const userPrompt = `Create a ${numWeeks}-week course about "${topic}" with ${lessonsPerWeek} lessons per week.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Strip possible markdown code fences
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const course = JSON.parse(cleaned);

    return new Response(JSON.stringify(course), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-course error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
