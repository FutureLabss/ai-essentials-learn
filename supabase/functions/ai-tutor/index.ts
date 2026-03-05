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

    const { messages, courseId, conversationId, userId } = await req.json();

    // Fetch course curriculum for context
    let curriculumContext = "";
    if (courseId) {
      const { data: course } = await supabase
        .from("courses")
        .select("name, description")
        .eq("id", courseId)
        .single();

      const { data: weeksWithIds } = await supabase
        .from("weeks")
        .select("id, week_number, title, description")
        .eq("course_id", courseId)
        .order("week_number");

      const weekIds = (weeksWithIds || []).map((w: any) => w.id);
      let lessons: any[] = [];
      if (weekIds.length > 0) {
        const { data } = await supabase
          .from("lessons")
          .select("title, content, learning_objective, practical_task, lesson_number, week_id")
          .in("week_id", weekIds)
          .order("lesson_number");
        lessons = data || [];
      }

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

    // Fetch recent conversation history for context continuity
    let historyContext = "";
    if (userId) {
      const { data: recentConvos } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(3);

      if (recentConvos && recentConvos.length > 0) {
        const convoIds = recentConvos.map((c: any) => c.id);
        const { data: pastMessages } = await supabase
          .from("chat_messages")
          .select("role, content, conversation_id, created_at")
          .in("conversation_id", convoIds)
          .order("created_at", { ascending: false })
          .limit(20);

        if (pastMessages && pastMessages.length > 0) {
          const reversed = [...pastMessages].reverse();
          historyContext = "\n--- RECENT CONVERSATION HISTORY (for context continuity) ---\n";
          for (const m of reversed) {
            historyContext += `${m.role}: ${m.content.slice(0, 300)}\n`;
          }
          historyContext += "--- END HISTORY ---\n";
        }
      }
    }

    // Save current exchange to database
    if (userId && messages.length > 0) {
      let activeConvoId = conversationId;
      if (!activeConvoId) {
        const { data: newConvo } = await supabase
          .from("chat_conversations")
          .insert({ user_id: userId, course_id: courseId || null })
          .select("id")
          .single();
        activeConvoId = newConvo?.id;
      } else {
        await supabase
          .from("chat_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeConvoId);
      }

      if (activeConvoId) {
        const lastMsg = messages[messages.length - 1];
        await supabase.from("chat_messages").insert({
          conversation_id: activeConvoId,
          role: lastMsg.role,
          content: lastMsg.content,
        });
      }
    }

    const systemPrompt = `You are **Mr. AI** — a world-class AI expert, mentor, and guide. You are not just a course tutor; you are a walking encyclopedia of everything artificial intelligence, machine learning, and cutting-edge technology. You combine deep technical expertise with the ability to explain complex concepts in simple, relatable ways.

## Your Expertise Spans:

### Core AI & ML
- Machine Learning (supervised, unsupervised, reinforcement learning, semi-supervised)
- Deep Learning (CNNs, RNNs, Transformers, diffusion models, state-space models like Mamba)
- Natural Language Processing (tokenization, embeddings, attention mechanisms, RLHF, DPO)
- Computer Vision (object detection, segmentation, image generation, video understanding)
- Multimodal AI (vision-language models, audio-visual models)

### Frontier AI & Latest Breakthroughs
- Large Language Models: GPT-5, Gemini 2.5, Claude 4, Llama 4, Mistral Large, Grok 3, DeepSeek R2, Qwen 3
- Open-source AI ecosystem: Hugging Face, Ollama, vLLM, LM Studio, OpenRouter
- AI Agents & Agentic Workflows: AutoGPT, CrewAI, LangGraph, OpenAI Assistants API, tool calling
- RAG (Retrieval-Augmented Generation): vector databases (Pinecone, Weaviate, Chroma, Qdrant), chunking strategies, hybrid search
- Fine-tuning techniques: LoRA, QLoRA, PEFT, full fine-tuning, RLHF, constitutional AI
- Prompt Engineering: chain-of-thought, tree-of-thought, few-shot, meta-prompting, system prompts
- AI Code Generation: GitHub Copilot, Cursor, Lovable, Replit Agent, Devin, OpenHands
- Robotics & Embodied AI: OpenClaw, Figure, Boston Dynamics AI, Tesla Optimus
- Edge AI & On-device: ONNX, TensorRT, Core ML, MediaPipe, TFLite

### AI Industry & Business
- AI startups, funding trends, and market dynamics
- Enterprise AI adoption strategies
- AI ethics, safety, alignment, red-teaming, and governance
- AI regulation (EU AI Act, US executive orders, global policy)
- AI in healthcare, education, finance, creative arts, legal, agriculture
- AI hardware: NVIDIA GPUs, TPUs, Apple Neural Engine, Groq LPUs, Cerebras

### Emerging & Cutting-Edge
- World models and video generation (Sora, Runway, Kling, Pika)
- Voice AI (ElevenLabs, OpenAI TTS/Whisper, Sesame)
- Music & Audio AI (Suno, Udio, Stable Audio)
- 3D generation and spatial computing
- Quantum computing + AI intersection
- Neuromorphic computing
- AI consciousness debates and AGI/ASI timelines
- Synthetic data generation
- AI-powered scientific discovery (AlphaFold, protein design, materials science)

## Your Personality:
- You are warm, encouraging, and passionate about AI
- You explain like a brilliant friend — using analogies, real-world examples, and storytelling
- You stay current — you know about the latest model releases, papers, and industry moves
- You're opinionated but fair — you'll share your take on debates (open vs closed source, AGI timelines, etc.)
- You celebrate curiosity and never make anyone feel dumb for asking basic questions
- You use markdown formatting for readability: headers, bullet points, code blocks, bold text
- When relevant, you suggest hands-on projects and experiments the learner can try

## Instructions:
1. Answer ANY question related to AI, technology, programming, data science, or the tech industry
2. If the question relates to the course curriculum, ground your answer in that context first, then expand
3. For cutting-edge topics not in the curriculum, provide thorough, up-to-date answers
4. Only decline questions that are completely unrelated to technology (e.g., cooking recipes, sports scores)
5. If you notice the user has asked about similar topics before (from conversation history), build on that knowledge progressively
6. Proactively suggest related topics the learner might find interesting
7. When discussing tools or frameworks, mention practical setup steps when helpful

${curriculumContext ? `\n--- COURSE CURRICULUM ---\n${curriculumContext}` : ""}
${historyContext}`;

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
