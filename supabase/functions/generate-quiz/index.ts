import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { courseId, weekId, quizType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch course info
    const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).single();
    if (!course) throw new Error("Course not found");

    // Fetch lessons content based on quiz type
    let lessons: any[] = [];
    let quizTitle = "";
    let quizDescription = "";

    if (quizType === "weekly" && weekId) {
      const { data: week } = await supabase.from("weeks").select("*").eq("id", weekId).single();
      const { data: weekLessons } = await supabase.from("lessons").select("*").eq("week_id", weekId).order("lesson_number");
      lessons = weekLessons || [];
      quizTitle = `Week ${week?.week_number} Quiz: ${week?.title}`;
      quizDescription = `Quiz covering Week ${week?.week_number} content`;
    } else {
      // Final quiz - get all lessons
      const { data: weeks } = await supabase.from("weeks").select("id").eq("course_id", courseId);
      if (weeks && weeks.length > 0) {
        const { data: allLessons } = await supabase.from("lessons").select("*").in("week_id", weeks.map(w => w.id)).order("lesson_number");
        lessons = allLessons || [];
      }
      quizTitle = `Final Quiz: ${course.name}`;
      quizDescription = `Comprehensive quiz covering all course content`;
    }

    if (lessons.length === 0) throw new Error("No lessons found to generate quiz from");

    // Build content summary for AI
    const contentSummary = lessons.map(l =>
      `Lesson: ${l.title}\nObjective: ${l.learning_objective || "N/A"}\nContent: ${l.content.substring(0, 500)}`
    ).join("\n\n");

    const numQuestions = quizType === "final" ? 15 : 8;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a quiz generator for an online learning platform. Generate quiz questions based on lesson content."
          },
          {
            role: "user",
            content: `Generate ${numQuestions} quiz questions based on this course content. Mix multiple choice (mcq) and true/false questions (roughly 70% mcq, 30% true_false).

Course: ${course.name}
Content:
${contentSummary}

Return the questions as a JSON array.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_questions",
            description: "Generate quiz questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question_text: { type: "string" },
                      question_type: { type: "string", enum: ["mcq", "true_false"] },
                      options: {
                        type: "array",
                        items: { type: "string" },
                        description: "For mcq: 4 options. For true_false: ['True', 'False']"
                      },
                      correct_answer: { type: "string", description: "The correct option text" },
                      explanation: { type: "string", description: "Brief explanation of why the answer is correct" }
                    },
                    required: ["question_text", "question_type", "options", "correct_answer", "explanation"],
                    additionalProperties: false
                  }
                }
              },
              required: ["questions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_questions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No quiz questions generated");

    const { questions } = JSON.parse(toolCall.function.arguments);

    // Create quiz record
    const { data: quiz, error: quizError } = await supabase.from("quizzes").insert({
      course_id: courseId,
      week_id: weekId || null,
      title: quizTitle,
      description: quizDescription,
      quiz_type: quizType,
    }).select().single();

    if (quizError) throw quizError;

    // Insert questions
    const questionRows = questions.map((q: any, i: number) => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
      question_order: i + 1,
    }));

    const { error: qError } = await supabase.from("quiz_questions").insert(questionRows);
    if (qError) throw qError;

    return new Response(JSON.stringify({ quiz, questions: questionRows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
