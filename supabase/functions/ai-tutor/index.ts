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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { messages, courseId } = await req.json();

    // Fetch course curriculum for context
    let curriculumContext = "";
    if (courseId) {
      const { data: course } = await supabase
        .from("courses")
        .select("name, description")
        .eq("id", courseId)
        .single();

      const { data: weeks } = await supabase
        .from("weeks")
        .select("week_number, title, description")
        .eq("course_id", courseId)
        .order("week_number");

      const weekIds = (weeks || []).map((w: any) => w.id);
      let lessons: any[] = [];
      if (weekIds.length > 0) {
        const { data } = await supabase
          .from("lessons")
          .select("title, content, learning_objective, practical_task, lesson_number, week_id")
          .in("week_id", (weeks || []).map((w: any) => w.id))
          .order("lesson_number");
        lessons = data || [];
      }

      // Build weeks query with IDs for lesson matching
      const { data: weeksWithIds } = await supabase
        .from("weeks")
        .select("id, week_number, title, description")
        .eq("course_id", courseId)
        .order("week_number");

      curriculumContext = `COURSE: ${course?.name}\n${course?.description}\n\n`;
      for (const week of weeksWithIds || []) {
        curriculumContext += `WEEK ${week.week_number}: ${week.title}\n${week.description || ""}\n`;
        const weekLessons = lessons.filter((l: any) => l.week_id === week.id);
        for (const lesson of weekLessons) {
          curriculumContext += `  Lesson ${lesson.lesson_number}: ${lesson.title}\n`;
          curriculumContext += `  Objective: ${lesson.learning_objective || "N/A"}\n`;
          curriculumContext += `  Content: ${lesson.content}\n`;
          if (lesson.practical_task) curriculumContext += `  Task: ${lesson.practical_task}\n`;
          curriculumContext += "\n";
        }
      }
    }

    const systemPrompt = `You are an expert AI Tutor specializing in artificial intelligence, machine learning, deep learning, generative AI, and all emerging AI trends. You are deeply knowledgeable about:

- Large Language Models (LLMs) like GPT, Gemini, Claude, Llama, Mistral, Grok
- AI agents, tool use, RAG (Retrieval-Augmented Generation), and agentic workflows
- Computer vision, NLP, reinforcement learning, and multimodal AI
- AI ethics, safety, alignment, and regulation
- AI industry trends: open-source vs closed-source, edge AI, AI hardware, AI startups
- Prompt engineering, fine-tuning, embeddings, vector databases
- AI applications in business, healthcare, education, creative arts, and more
- Latest AI research breakthroughs and model releases

You help students learn about AI by answering questions based on the course curriculum AND your broad knowledge of AI. If a question relates to AI but goes beyond the curriculum, still answer it helpfully using your expertise. Only decline questions completely unrelated to AI/technology.

Keep answers clear, concise, and encouraging. Use real-world examples and analogies. Format responses with markdown for readability. Stay up to date with the latest AI developments.

${curriculumContext ? `--- COURSE CURRICULUM ---\n${curriculumContext}` : "No course curriculum loaded, but you can still answer any AI-related questions."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
