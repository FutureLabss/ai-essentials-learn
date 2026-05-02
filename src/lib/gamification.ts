import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GamificationEvent =
  | "lesson_complete"
  | "quiz_pass_first"
  | "quiz_pass_retry"
  | "quiz_perfect"
  | "assignment_submit"
  | "week_complete"
  | "certificate_earned"
  | "daily_login"
  | "discussion_post"
  | "course_review";

interface AwardResult {
  pointsAdded: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  newBadges: string[];
}

const BADGE_NAMES: Record<string, string> = {
  first_step: "First Step",
  week_warrior: "Week Warrior",
  course_champion: "Course Champion",
  polymath: "Polymath",
  on_fire: "On Fire",
  unstoppable: "Unstoppable",
  devoted: "Devoted",
  perfect_score: "Perfect Score",
  helpful_voice: "Helpful Voice",
  reviewer: "Reviewer",
  early_bird: "Early Bird",
  quiz_master: "Quiz Master",
  dedicated_learner: "Dedicated Learner",
};

const EVENT_LABELS: Record<GamificationEvent, string> = {
  lesson_complete: "Lesson complete",
  quiz_pass_first: "Quiz passed",
  quiz_pass_retry: "Quiz passed",
  quiz_perfect: "Perfect score",
  assignment_submit: "Assignment submitted",
  week_complete: "Week completed",
  certificate_earned: "Certificate earned",
  daily_login: "Welcome back",
  discussion_post: "Discussion post",
  course_review: "Review submitted",
};

export async function awardPoints(
  event: GamificationEvent,
  referenceId?: string,
  options: { silent?: boolean } = {},
): Promise<AwardResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("award-points", {
      body: { event_type: event, reference_id: referenceId },
    });
    if (error) throw error;
    const result = data as AwardResult;
    if (!options.silent && result.pointsAdded > 0) {
      toast.success(
        `+${result.pointsAdded} points · ${EVENT_LABELS[event]}`,
        {
          description:
            result.currentStreak > 1
              ? `🔥 ${result.currentStreak}-day streak`
              : undefined,
        },
      );
    }
    if (result.newBadges?.length) {
      result.newBadges.forEach((b) => {
        toast.success(`🏆 Badge unlocked: ${BADGE_NAMES[b] || b}`);
      });
    }
    return result;
  } catch (e) {
    console.error("awardPoints error:", e);
    return null;
  }
}
