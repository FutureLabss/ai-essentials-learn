import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCourseById, getWeeksWithLessons, getUserEnrollment, getUserProgress, getUserCertificate } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import AiTutorChat from "@/components/AiTutorChat";
import CourseReviews from "@/components/CourseReviews";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, CheckCircle, Circle, Award, ChevronRight, ArrowLeft, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [certificate, setCertificate] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!courseId) { navigate("/dashboard"); return; }
    loadData();
  }, [user, courseId, authLoading]);

  const loadData = async () => {
    if (!user || !courseId) return;
    try {
      const [c, w, e, p, cert, { data: qz }, { data: qa }] = await Promise.all([
        getCourseById(courseId),
        getWeeksWithLessons(courseId),
        getUserEnrollment(user.id, courseId),
        getUserProgress(user.id),
        getUserCertificate(user.id, courseId),
        supabase.from("quizzes").select("*").eq("course_id", courseId).order("created_at"),
        supabase.from("quiz_attempts").select("*").eq("user_id", user.id),
      ]);
      setCourse(c);
      setWeeks(w);
      setEnrollment(e);
      setProgress(p);
      setCertificate(cert);
      setQuizzes(qz || []);
      setQuizAttempts(qa || []);
    } catch (err) {
      console.error(err);
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const totalLessons = weeks.reduce((sum, w) => sum + w.lessons.length, 0);
  const completedLessons = progress.filter(p => p.completed).length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isUnlocked = enrollment?.is_unlocked;

  const allLessons = weeks.flatMap(w => w.lessons.map((l: any) => ({ ...l, weekTitle: w.title, weekNumber: w.week_number })));
  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.lesson_id));

  const getFirstIncompleteLessonIndex = () => {
    for (let i = 0; i < allLessons.length; i++) {
      if (!completedIds.has(allLessons[i].id)) return i;
    }
    return allLessons.length;
  };
  const firstIncompleteIdx = getFirstIncompleteLessonIndex();

  if (authLoading || loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  if (!course) return null;

  return (
    <AppShell>
      <div className="container max-w-2xl py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> All Courses
        </Button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-2xl font-bold mb-1">{course.name}</h1>
          <p className="text-muted-foreground text-sm">{course.duration_weeks} Weeks · {totalLessons} Lessons</p>
        </motion.div>

        {certificate && (
          <div className="rounded-lg bg-accent/10 border border-accent p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold text-sm">Course Completed!</p>
                <p className="text-xs text-muted-foreground">Certificate ID: {certificate.certificate_id}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/certificate")}>
              View
            </Button>
          </div>
        )}

        {isUnlocked && (
          <div className="rounded-lg border bg-card p-4 mb-6 space-y-4">
            {/* Overall */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{completedLessons}/{totalLessons} lessons · {progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
            {/* Per-week breakdown */}
            <div className="space-y-2">
              {weeks.map((week) => {
                const weekTotal = week.lessons.length;
                const weekDone = week.lessons.filter((l: any) => completedIds.has(l.id)).length;
                const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
                return (
                  <div key={week.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">Week {week.week_number}</span>
                    <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${weekPct === 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${weekPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{weekDone}/{weekTotal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {weeks.map((week) => {
            const weekQuiz = quizzes.find(q => q.week_id === week.id && q.quiz_type === "weekly");
            const weekQuizAttempt = weekQuiz ? quizAttempts.find(a => a.quiz_id === weekQuiz.id) : null;

            return (
              <div key={week.id} className="rounded-lg border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-secondary/50">
                  <h3 className="font-display font-semibold text-sm">Week {week.week_number}: {week.title}</h3>
                </div>
                <div className="divide-y">
                  {week.lessons.map((lesson: any) => {
                    const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id);
                    const isCompleted = completedIds.has(lesson.id);
                    const isAccessible = isUnlocked;

                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-3 px-4 py-3 ${isAccessible ? "cursor-pointer hover:bg-muted/50" : "opacity-50"}`}
                        onClick={() => isAccessible && navigate(`/lesson/${lesson.id}`)}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-success shrink-0" />
                        ) : isAccessible ? (
                          <Circle className="h-5 w-5 text-primary shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lesson.title}</p>
                          {lesson.learning_objective && (
                            <p className="text-xs text-muted-foreground truncate">{lesson.learning_objective}</p>
                          )}
                        </div>
                        {isAccessible && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </div>
                    );
                  })}
                  {/* Weekly quiz link */}
                  {weekQuiz && isUnlocked && (
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 bg-accent/5"
                      onClick={() => navigate(`/quiz/${weekQuiz.id}`)}
                    >
                      <ClipboardList className="h-5 w-5 text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{weekQuiz.title}</p>
                        {weekQuizAttempt && (
                          <p className="text-xs text-muted-foreground">
                            Best: {weekQuizAttempt.score}% {weekQuizAttempt.passed ? "✓" : ""}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Final quiz */}
        {(() => {
          const finalQuiz = quizzes.find(q => q.quiz_type === "final");
          const finalAttempt = finalQuiz ? quizAttempts.find(a => a.quiz_id === finalQuiz.id) : null;
          if (!finalQuiz || !isUnlocked) return null;
          return (
            <div
              className="rounded-lg border bg-accent/10 border-accent/30 p-4 mt-4 flex items-center justify-between cursor-pointer hover:bg-accent/20 transition-colors"
              onClick={() => navigate(`/quiz/${finalQuiz.id}`)}
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="h-6 w-6 text-accent" />
                <div>
                  <p className="font-semibold text-sm">{finalQuiz.title}</p>
                  {finalAttempt && (
                    <p className="text-xs text-muted-foreground">Best: {finalAttempt.score}% {finalAttempt.passed ? "✓" : ""}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          );
        })()}

        {/* Reviews */}
        {course && <CourseReviews courseId={course.id} hasCompleted={!!certificate} />}
      </div>
      {course && <AiTutorChat courseId={course.id} />}
    </AppShell>
  );
}
