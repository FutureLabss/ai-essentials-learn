import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { welcome: 0, week_completed: 0, course_completed: 0, inactivity_reminder: 0, errors: 0 };

    // --- 1. Welcome on enrollment ---
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("user_id, course_id, enrolled_at");

    if (enrollments) {
      for (const enrollment of enrollments) {
        const alreadySent = await checkSent(supabase, enrollment.user_id, "welcome", enrollment.course_id);
        if (alreadySent) continue;

        const profile = await getProfile(supabase, enrollment.user_id);
        const course = await getCourse(supabase, enrollment.course_id);
        if (!profile || !course) continue;

        const sent = await sendEmail(RESEND_API_KEY, profile.email, `Welcome to ${course.name}! 🎉`, welcomeHtml(profile.first_name || "Learner", course.name));
        if (sent) {
          await logSent(supabase, enrollment.user_id, "welcome", enrollment.course_id);
          results.welcome++;
        } else {
          results.errors++;
        }
      }
    }

    // --- 2. Week completed ---
    const { data: allWeeks } = await supabase.from("weeks").select("id, course_id, week_number, title");
    const { data: allLessons } = await supabase.from("lessons").select("id, week_id");
    const { data: allProgress } = await supabase.from("lesson_progress").select("user_id, lesson_id, completed");

    if (allWeeks && allLessons && allProgress) {
      const lessonsByWeek: Record<string, string[]> = {};
      for (const l of allLessons) {
        if (!lessonsByWeek[l.week_id]) lessonsByWeek[l.week_id] = [];
        lessonsByWeek[l.week_id].push(l.id);
      }

      const completedByUser: Record<string, Set<string>> = {};
      for (const p of allProgress) {
        if (!p.completed) continue;
        if (!completedByUser[p.user_id]) completedByUser[p.user_id] = new Set();
        completedByUser[p.user_id].add(p.lesson_id);
      }

      for (const week of allWeeks) {
        const weekLessons = lessonsByWeek[week.id] || [];
        if (weekLessons.length === 0) continue;

        for (const [userId, completed] of Object.entries(completedByUser)) {
          const allDone = weekLessons.every((lid) => completed.has(lid));
          if (!allDone) continue;

          const refId = `${week.course_id}_week_${week.week_number}`;
          const alreadySent = await checkSent(supabase, userId, "week_completed", refId);
          if (alreadySent) continue;

          const profile = await getProfile(supabase, userId);
          const course = await getCourse(supabase, week.course_id);
          if (!profile || !course) continue;

          const sent = await sendEmail(RESEND_API_KEY, profile.email, `Week ${week.week_number} Complete! 🏆`, weekCompletedHtml(profile.first_name || "Learner", course.name, week.week_number, week.title));
          if (sent) {
            await logSent(supabase, userId, "week_completed", refId);
            results.week_completed++;
          } else {
            results.errors++;
          }
        }
      }
    }

    // --- 3. Course completed ---
    if (allWeeks && allLessons && allProgress) {
      const lessonsByCourse: Record<string, string[]> = {};
      for (const week of allWeeks) {
        const weekLessons = (allLessons || []).filter((l) => l.week_id === week.id);
        if (!lessonsByCourse[week.course_id]) lessonsByCourse[week.course_id] = [];
        lessonsByCourse[week.course_id].push(...weekLessons.map((l) => l.id));
      }

      const completedByUser: Record<string, Set<string>> = {};
      for (const p of allProgress) {
        if (!p.completed) continue;
        if (!completedByUser[p.user_id]) completedByUser[p.user_id] = new Set();
        completedByUser[p.user_id].add(p.lesson_id);
      }

      for (const [courseId, courseLessons] of Object.entries(lessonsByCourse)) {
        if (courseLessons.length === 0) continue;
        for (const [userId, completed] of Object.entries(completedByUser)) {
          const allDone = courseLessons.every((lid) => completed.has(lid));
          if (!allDone) continue;

          const alreadySent = await checkSent(supabase, userId, "course_completed", courseId);
          if (alreadySent) continue;

          const profile = await getProfile(supabase, userId);
          const course = await getCourse(supabase, courseId);
          if (!profile || !course) continue;

          const sent = await sendEmail(RESEND_API_KEY, profile.email, `Congratulations! You completed ${course.name} 🎓`, courseCompletedHtml(profile.first_name || "Learner", course.name));
          if (sent) {
            await logSent(supabase, userId, "course_completed", courseId);
            results.course_completed++;
          } else {
            results.errors++;
          }
        }
      }
    }

    // --- 4. Inactivity reminder (3+ days) ---
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().split("T")[0];

    if (enrollments) {
      for (const enrollment of enrollments) {
        const refId = `inactivity_${today}`;
        const alreadySent = await checkSent(supabase, enrollment.user_id, "inactivity_reminder", refId);
        if (alreadySent) continue;

        // Check last activity
        const { data: recentProgress } = await supabase
          .from("lesson_progress")
          .select("completed_at")
          .eq("user_id", enrollment.user_id)
          .eq("completed", true)
          .order("completed_at", { ascending: false })
          .limit(1);

        if (!recentProgress || recentProgress.length === 0) {
          // Enrolled but never completed a lesson — check enrollment date
          if (enrollment.enrolled_at > threeDaysAgo) continue;
        } else {
          const lastActivity = recentProgress[0].completed_at;
          if (lastActivity && lastActivity > threeDaysAgo) continue;
        }

        // Check they haven't completed the course
        const courseCompleted = await checkSent(supabase, enrollment.user_id, "course_completed", enrollment.course_id);
        if (courseCompleted) continue;

        const profile = await getProfile(supabase, enrollment.user_id);
        const course = await getCourse(supabase, enrollment.course_id);
        if (!profile || !course) continue;

        const sent = await sendEmail(RESEND_API_KEY, profile.email, `We miss you! Continue ${course.name} 📚`, inactivityHtml(profile.first_name || "Learner", course.name));
        if (sent) {
          await logSent(supabase, enrollment.user_id, "inactivity_reminder", refId);
          results.inactivity_reminder++;
        } else {
          results.errors++;
        }
      }
    }

    console.log("Milestone email results:", results);
    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("milestone-emails error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// --- Helper functions ---

const profileCache: Record<string, any> = {};
async function getProfile(supabase: any, userId: string) {
  if (profileCache[userId]) return profileCache[userId];
  const { data } = await supabase.from("profiles").select("email, first_name").eq("user_id", userId).maybeSingle();
  if (data) profileCache[userId] = data;
  return data;
}

const courseCache: Record<string, any> = {};
async function getCourse(supabase: any, courseId: string) {
  if (courseCache[courseId]) return courseCache[courseId];
  const { data } = await supabase.from("courses").select("name").eq("id", courseId).maybeSingle();
  if (data) courseCache[courseId] = data;
  return data;
}

async function checkSent(supabase: any, userId: string, type: string, refId: string) {
  const { data } = await supabase
    .from("email_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("milestone_type", type)
    .eq("reference_id", refId)
    .maybeSingle();
  return !!data;
}

async function logSent(supabase: any, userId: string, type: string, refId: string) {
  await supabase.from("email_logs").insert({ user_id: userId, milestone_type: type, reference_id: refId });
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "AI Essentials <hello@futurelabs.ng>", to: [to], subject, html }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error("Resend error:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendEmail error:", e);
    return false;
  }
}

// --- Email templates ---

function welcomeHtml(name: string, courseName: string) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 30px;">
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">Welcome aboard, ${name}! 🎉</h1>
    <p style="color: #444; font-size: 16px; line-height: 1.6;">
      You've successfully enrolled in <strong>${courseName}</strong>. We're excited to have you on this learning journey!
    </p>
    <p style="color: #444; font-size: 16px; line-height: 1.6;">
      Head over to your dashboard to start your first lesson. Remember — consistency is key, and even 15 minutes a day can make a big difference.
    </p>
    <a href="https://ai.futurelabs.ng/dashboard" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Start Learning →</a>
    <p style="color: #999; font-size: 13px; margin-top: 32px;">— The AI Essentials Team at FutureLabs</p>
  </div>`;
}

function weekCompletedHtml(name: string, courseName: string, weekNum: number, weekTitle: string) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 30px;">
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">Week ${weekNum} Complete! 🏆</h1>
    <p style="color: #444; font-size: 16px; line-height: 1.6;">
      Great job, ${name}! You've finished <strong>${weekTitle}</strong> in ${courseName}.
    </p>
    <p style="color: #444; font-size: 16px; line-height: 1.6;">
      Keep the momentum going — your next week of lessons is waiting for you!
    </p>
    <a href="https://ai-essentials-learn.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Continue Learning →</a>
    <p style="color: #999; font-size: 13px; margin-top: 32px;">— The AI Essentials Team at FutureLabs</p>
  </div>`;
}

function courseCompletedHtml(name: string, courseName: string) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 30px;">
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">Congratulations, ${name}! 🎓</h1>
    <p style="color: #444; font-size: 16px; line-height: 1.6;">
      You've completed <strong>${courseName}</strong>! This is an incredible achievement.
    </p>
    <p style="color: #444; font-size: 16px; line-height: 1.6;">
      Your certificate is ready — head to your dashboard to download it and share your accomplishment!
    </p>
    <a href="https://ai-essentials-learn.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Get Your Certificate →</a>
    <p style="color: #999; font-size: 13px; margin-top: 32px;">— The AI Essentials Team at FutureLabs</p>
  </div>`;
}

function inactivityHtml(name: string, courseName: string) {
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 30px;">
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">We miss you, ${name}! 📚</h1>
    <p style="color: #444; font-size: 16px; line-height: 1.6;">
      It's been a few days since your last lesson in <strong>${courseName}</strong>. Don't let your progress go to waste!
    </p>
    <p style="color: #444; font-size: 16px; line-height: 1.6;">
      Even a quick 10-minute session can keep your learning streak alive. Jump back in today!
    </p>
    <a href="https://ai-essentials-learn.lovable.app/dashboard" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Resume Learning →</a>
    <p style="color: #999; font-size: 13px; margin-top: 32px;">— The AI Essentials Team at FutureLabs</p>
  </div>`;
}
