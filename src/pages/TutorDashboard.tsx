import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAllCourses, getWeeksWithLessons } from "@/lib/supabase-helpers";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, MessageCircle, Users, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function TutorDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [courseStats, setCourseStats] = useState<Record<string, any>>({});
  const [recentDiscussions, setRecentDiscussions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (role !== "tutor" && role !== "admin") { navigate("/dashboard"); return; }
    loadData();
  }, [user, role, authLoading]);

  const loadData = async () => {
    try {
      const allCourses = await getAllCourses();
      setCourses(allCourses);

      const stats: Record<string, any> = {};
      for (const course of allCourses) {
        const weeks = await getWeeksWithLessons(course.id);
        const totalLessons = weeks.reduce((sum: number, w: any) => sum + w.lessons.length, 0);
        const { data: enrollments } = await supabase.from("enrollments").select("user_id").eq("course_id", course.id);
        const enrolledCount = enrollments?.length || 0;

        // Get progress for enrolled users
        const lessonIds = weeks.flatMap((w: any) => w.lessons.map((l: any) => l.id));
        let avgCompletion = 0;
        if (enrolledCount > 0 && totalLessons > 0 && lessonIds.length > 0) {
          const { data: progress } = await supabase.from("lesson_progress").select("user_id, lesson_id, completed").eq("completed", true).in("lesson_id", lessonIds);
          const completedCount = progress?.length || 0;
          avgCompletion = Math.round((completedCount / (enrolledCount * totalLessons)) * 100);
        }

        const { data: certs } = await supabase.from("certificates").select("id").eq("course_id", course.id);

        stats[course.id] = {
          enrolled: enrolledCount,
          totalLessons,
          avgCompletion,
          completed: certs?.length || 0,
        };
      }
      setCourseStats(stats);

      // Recent discussions across all lessons
      const { data: discussions } = await supabase
        .from("lesson_discussions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentDiscussions((discussions as any[]) || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="container max-w-3xl py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-2xl font-bold mb-1">Tutor Dashboard</h1>
          <p className="text-muted-foreground text-sm">Monitor learner progress across courses</p>
        </motion.div>

        {/* Course overview cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          {courses.map((course) => {
            const s = courseStats[course.id] || {};
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold text-sm truncate">{course.name}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{s.enrolled || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Enrolled</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{s.completed || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{s.avgCompletion || 0}%</p>
                    <p className="text-[10px] text-muted-foreground">Avg Progress</p>
                  </div>
                </div>
                <Progress value={s.avgCompletion || 0} className="h-1.5" />
                <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/course/${course.id}`)}>
                  View Course <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Recent discussions */}
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> Recent Discussions
            </h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {recentDiscussions.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">No discussions yet</div>
            ) : (
              recentDiscussions.map((d: any) => (
                <div
                  key={d.id}
                  className="px-4 py-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/lesson/${d.lesson_id}`)}
                >
                  <p className="text-sm truncate">{d.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(d.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
