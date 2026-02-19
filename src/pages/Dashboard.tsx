import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getCourse, getWeeksWithLessons, getUserEnrollment, getUserProgress, getUserCertificate } from "@/lib/supabase-helpers";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, CheckCircle, Circle, Award, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (profile && !profile.kyc_completed) { navigate("/kyc"); return; }
    loadData();
  }, [user, profile, authLoading]);

  const loadData = async () => {
    if (!user) return;
    try {
      const c = await getCourse();
      setCourse(c);
      const w = await getWeeksWithLessons(c.id);
      setWeeks(w);
      const e = await getUserEnrollment(user.id, c.id);
      setEnrollment(e);
      const p = await getUserProgress(user.id);
      setProgress(p);
      const cert = await getUserCertificate(user.id, c.id);
      setCertificate(cert);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!user || !course) return;
    setPaying(true);
    // Create enrollment if not exists
    if (!enrollment) {
      await supabase.from("enrollments").insert({ user_id: user.id, course_id: course.id });
    }
    // Simulate payment
    const ref = `PAY-${Date.now()}`;
    await supabase.from("payments").insert({
      user_id: user.id,
      course_id: course.id,
      amount: 49.99,
      currency: "USD",
      status: "completed",
      payment_reference: ref,
      paid_at: new Date().toISOString(),
    });
    // Unlock enrollment
    await supabase.from("enrollments").update({ is_paid: true, is_unlocked: true }).eq("user_id", user.id).eq("course_id", course.id);
    toast.success("Payment successful! Course unlocked.");
    setPaying(false);
    loadData();
  };

  const totalLessons = weeks.reduce((sum, w) => sum + w.lessons.length, 0);
  const completedLessons = progress.filter(p => p.completed).length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isUnlocked = enrollment?.is_unlocked;

  // Build ordered lesson list for sequential unlock
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

  return (
    <AppShell>
      <div className="container max-w-2xl py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-2xl font-bold mb-1">
            Welcome, {profile?.first_name || "Learner"}
          </h1>
          <p className="text-muted-foreground text-sm">AI Essentials · 6 Weeks</p>
        </motion.div>

        {/* Certificate Banner */}
        {certificate && (
          <div className="rounded-lg bg-accent/10 border border-accent p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold text-sm">Course Completed!</p>
                <p className="text-xs text-muted-foreground">Certificate ID: {certificate.certificate_id}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to="/certificate">View</Link>
            </Button>
          </div>
        )}

        {/* Payment Gate */}
        {!isUnlocked && (
          <div className="rounded-lg border bg-card p-6 mb-6 text-center">
            <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="font-display font-semibold text-lg mb-1">Course Locked</h2>
            <p className="text-sm text-muted-foreground mb-4">Complete payment to unlock all lessons.</p>
            <Button onClick={handlePayment} disabled={paying} size="lg">
              {paying ? "Processing…" : "Pay $49.99 to Unlock"}
            </Button>
          </div>
        )}

        {/* Progress */}
        {isUnlocked && (
          <div className="rounded-lg border bg-card p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{completedLessons}/{totalLessons} lessons</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {/* Weeks & Lessons */}
        <div className="space-y-4">
          {weeks.map((week) => (
            <div key={week.id} className="rounded-lg border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-secondary/50">
                <h3 className="font-display font-semibold text-sm">Week {week.week_number}: {week.title}</h3>
              </div>
              <div className="divide-y">
                {week.lessons.map((lesson: any) => {
                  const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id);
                  const isCompleted = completedIds.has(lesson.id);
                  const isAccessible = isUnlocked && globalIdx <= firstIncompleteIdx;

                  return (
                    <div key={lesson.id} className={`flex items-center gap-3 px-4 py-3 ${isAccessible ? "cursor-pointer hover:bg-muted/50" : "opacity-50"}`}
                      onClick={() => isAccessible && navigate(`/lesson/${lesson.id}`)}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-success shrink-0" />
                      ) : isAccessible ? (
                        <Circle className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lesson.title}</p>
                      </div>
                      {isAccessible && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
