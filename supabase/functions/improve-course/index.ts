import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { courseId, instructions } = await req.json();
    if (!courseId) {
      return new Response(JSON.stringify({ error: "courseId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch course with all weeks and lessons
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();
    if (courseErr) throw courseErr;

    const { data: weeks, error: weeksErr } = await supabase
      .from("weeks")
      .select("*")
      .eq("course_id", courseId)
      .order("week_number");
    if (weeksErr) throw weeksErr;

    const weekIds = (weeks || []).map((w: any) => w.id);
    let lessons: any[] = [];
    if (weekIds.length > 0) {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .in("week_id", weekIds)
        .order("lesson_number");
      if (error) throw error;
      lessons = data || [];
    }

    // Build current course structure for AI
    const currentStructure = {
      name: course.name,
      description: course.description,
      duration_weeks: course.duration_weeks,
      weeks: (weeks || []).map((w: any) => ({
        title: w.title,
        description: w.description,
        lessons: lessons
          .filter((l: any) => l.week_id === w.id)
          .map((l: any) => ({
            title: l.title,
            content: l.content,
            learning_objective: l.learning_objective,
            practical_task: l.practical_task,
          })),
      })),
    };

    const systemPrompt = `You are an expert curriculum designer and course improvement specialist.
You will receive an existing course structure and optional improvement instructions.
Your job is to improve the course while maintaining its core topic and structure.

Improvements may include:
- Enriching lesson content with more depth, examples, and clarity
- Improving learning objectives to be more specific and measurable
- Adding better practical tasks and exercises
- Improving week/lesson titles and descriptions
- Fixing any gaps in the curriculum flow
- Adding more real-world examples and case studies

Return your response ONLY as a valid JSON object (no markdown, no code fences) with this exact schema:
{
  "name": "Course Title",
  "description": "Improved course description",
  "duration_weeks": <number>,
  "weeks": [
    {
      "title": "Week title",
      "description": "Week description",
      "lessons": [
        {
          "title": "Lesson title",
          "content": "Improved detailed lesson content (3-5 paragraphs)",
          "learning_objective": "Specific measurable objective",
          "practical_task": "Actionable hands-on exercise"
        }
      ]
    }
  ]
}

Keep the same number of weeks and lessons unless the instructions say otherwise.
Make every improvement meaningful — don't just rephrase, genuinely enhance the educational value.`;

    const userPrompt = `Here is the current course structure:
${JSON.stringify(currentStructure, null, 2)}

${instructions ? `Specific improvement instructions: ${instructions}` : "Please improve this course's content quality, learning objectives, and practical tasks. Make the content more detailed, engaging, and educational."}`;

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
      throw new Error("AI improvement failed");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const improved = JSON.parse(cleaned);

    return new Response(JSON.stringify(improved), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("improve-course error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
