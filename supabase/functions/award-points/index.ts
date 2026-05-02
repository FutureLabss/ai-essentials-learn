import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const POINT_RULES: Record<string, number> = {
  lesson_complete: 10,
  quiz_pass_first: 25,
  quiz_pass_retry: 10,
  quiz_perfect: 15, // bonus on top of pass
  assignment_submit: 15,
  week_complete: 50,
  certificate_earned: 200,
  daily_login: 5,
  discussion_post: 5,
  course_review: 20,
};

// Lagos timezone date helper (YYYY-MM-DD)
function lagosDate(d = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86400000);
}

interface BadgeCheck {
  id: string;
  earned: boolean;
}

async function evaluateBadges(
  supabase: any,
  userId: string,
  totalPoints: number,
  currentStreak: number,
): Promise<string[]> {
  const checks: BadgeCheck[] = [];

  // Streak badges
  checks.push({ id: "on_fire", earned: currentStreak >= 3 });
  checks.push({ id: "unstoppable", earned: currentStreak >= 7 });
  checks.push({ id: "devoted", earned: currentStreak >= 30 });

  // Points badge
  checks.push({ id: "dedicated_learner", earned: totalPoints >= 500 });

  // Lessons completed
  const { count: lessonCount } = await supabase
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);
  checks.push({ id: "first_step", earned: (lessonCount || 0) >= 1 });

  // Certificates
  const { data: certs } = await supabase
    .from("certificates")
    .select("course_id")
    .eq("user_id", userId);
  checks.push({ id: "course_champion", earned: (certs?.length || 0) >= 1 });
  checks.push({ id: "polymath", earned: (certs?.length || 0) >= 2 });

  // Quiz pass count + perfect
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("passed, score, total_questions")
    .eq("user_id", userId);
  const passed = (attempts || []).filter((a: any) => a.passed);
  checks.push({ id: "quiz_master", earned: passed.length >= 5 });
  const hasPerfect = (attempts || []).some(
    (a: any) => a.total_questions > 0 && a.score === a.total_questions,
  );
  checks.push({ id: "perfect_score", earned: hasPerfect });

  // Discussion posts
  const { count: discussionCount } = await supabase
    .from("lesson_discussions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  checks.push({ id: "helpful_voice", earned: (discussionCount || 0) >= 10 });

  // Reviewer
  const { count: reviewCount } = await supabase
    .from("course_reviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  checks.push({ id: "reviewer", earned: (reviewCount || 0) >= 1 });

  // Week complete check (any week where all lessons done)
  const { data: weeks } = await supabase.from("weeks").select("id");
  let weekDone = false;
  if (weeks && weeks.length > 0) {
    for (const w of weeks) {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("week_id", w.id);
      if (!lessons || lessons.length === 0) continue;
      const ids = lessons.map((l: any) => l.id);
      const { count: done } = await supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("completed", true)
        .in("lesson_id", ids);
      if ((done || 0) >= ids.length) {
        weekDone = true;
        break;
      }
    }
  }
  checks.push({ id: "week_warrior", earned: weekDone });

  const earnedIds = checks.filter((c) => c.earned).map((c) => c.id);
  if (earnedIds.length === 0) return [];

  // Insert any not yet held; collect newly inserted
  const { data: existing } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId)
    .in("badge_id", earnedIds);
  const have = new Set((existing || []).map((b: any) => b.badge_id));
  const newOnes = earnedIds.filter((id) => !have.has(id));
  if (newOnes.length > 0) {
    await supabase.from("user_badges").insert(
      newOnes.map((badge_id) => ({ user_id: userId, badge_id })),
    );
  }
  return newOnes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const eventType = String(body.event_type || "");
    const referenceId = body.reference_id ? String(body.reference_id) : null;

    if (!POINT_RULES[eventType]) {
      return new Response(
        JSON.stringify({ error: "Invalid event_type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const points = POINT_RULES[eventType];
    const admin = createClient(supabaseUrl, serviceKey);

    // Insert point event (unique constraint prevents double award)
    const { error: insertErr } = await admin.from("point_events").insert({
      user_id: user.id,
      event_type: eventType,
      reference_id: referenceId,
      points,
    });

    let pointsAdded = points;
    if (insertErr) {
      // Duplicate is ok — just don't double award
      if (insertErr.code === "23505") {
        pointsAdded = 0;
      } else {
        throw insertErr;
      }
    }

    // Recompute aggregates
    const today = lagosDate();
    const { data: existing } = await admin
      .from("user_gamification")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let totalPoints = (existing?.total_points || 0) + pointsAdded;
    let currentStreak = existing?.current_streak || 0;
    let longestStreak = existing?.longest_streak || 0;
    const lastDate = existing?.last_active_date as string | null;

    if (pointsAdded > 0) {
      if (!lastDate) {
        currentStreak = 1;
      } else {
        const diff = daysBetween(lastDate, today);
        if (diff === 0) {
          // same day, no change
        } else if (diff === 1) {
          currentStreak += 1;
        } else if (diff > 1) {
          currentStreak = 1;
        }
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    }

    await admin.from("user_gamification").upsert({
      user_id: user.id,
      total_points: totalPoints,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_active_date: today,
      leaderboard_opt_in: existing?.leaderboard_opt_in ?? true,
    });

    const newBadges = await evaluateBadges(
      admin,
      user.id,
      totalPoints,
      currentStreak,
    );

    return new Response(
      JSON.stringify({
        pointsAdded,
        totalPoints,
        currentStreak,
        longestStreak,
        newBadges,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    console.error("award-points error:", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
