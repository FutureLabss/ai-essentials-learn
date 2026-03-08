import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAllCourses, getWeeksWithLessons } from "@/lib/supabase-helpers";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, BookOpen, Award, BarChart3 } from "lucide-react";

export default function AdminAnalyticsTab() {
  const [stats, setStats] = useState<any>(null);
  const [courseStats, setCourseStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const [
        { data: profiles },
        { data: enrollments },
        { data: payments },
        { data: progress },
        { data: certificates },
        courses,
      ] = await Promise.all([
        supabase.from("profiles").select("created_at"),
        supabase.from("enrollments").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("lesson_progress").select("*"),
        supabase.from("certificates").select("*"),
        getAllCourses(),
      ]);

      const totalUsers = profiles?.length || 0;
      const totalEnrollments = enrollments?.length || 0;
      const paidEnrollments = enrollments?.filter(e => e.is_paid).length || 0;
      const totalRevenue = payments?.filter(p => p.status === "completed" && p.amount > 0).reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalCerts = certificates?.length || 0;
      const completedLessons = progress?.filter(p => p.completed).length || 0;

      // Signups by last 7 days
      const now = new Date();
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });
      const signupsByDay = last7.map(day => ({
        day: day.slice(5),
        count: profiles?.filter(p => p.created_at.startsWith(day)).length || 0,
      }));

      setStats({ totalUsers, totalEnrollments, paidEnrollments, totalRevenue, totalCerts, completedLessons, signupsByDay });

      // Per-course stats
      const cStats = await Promise.all(courses.map(async (course: any) => {
        const weeks = await getWeeksWithLessons(course.id);
        const totalLessons = weeks.reduce((sum: number, w: any) => sum + w.lessons.length, 0);
        const courseEnrollments = enrollments?.filter(e => e.course_id === course.id) || [];
        const courseCerts = certificates?.filter(c => c.course_id === course.id) || [];
        const lessonIds = new Set(weeks.flatMap((w: any) => w.lessons.map((l: any) => l.id)));
        const courseProgress = progress?.filter(p => p.completed && lessonIds.has(p.lesson_id)) || [];

        // Unique users who completed at least one lesson
        const activeUsers = new Set(courseProgress.map(p => p.user_id)).size;

        // Average completion
        const avgCompletion = courseEnrollments.length > 0 && totalLessons > 0
          ? Math.round((courseProgress.length / (courseEnrollments.length * totalLessons)) * 100)
          : 0;

        // Week-level drop-off
        const weekDropoff = weeks.map((w: any) => {
          const wLessonIds = w.lessons.map((l: any) => l.id);
          const usersCompleted = new Set(courseProgress.filter(p => wLessonIds.includes(p.lesson_id)).map(p => p.user_id)).size;
          return { week: w.week_number, title: w.title, users: usersCompleted };
        });

        return {
          id: course.id,
          name: course.name,
          enrolled: courseEnrollments.length,
          paid: courseEnrollments.filter(e => e.is_paid).length,
          certificates: courseCerts.length,
          activeUsers,
          avgCompletion,
          totalLessons,
          weekDropoff,
        };
      }));

      setCourseStats(cStats);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center text-muted-foreground py-8 text-sm">Loading analytics…</div>;
  if (!stats) return null;

  const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
        <StatCard icon={BookOpen} label="Enrollments" value={stats.totalEnrollments} />
        <StatCard icon={TrendingUp} label="Paid" value={stats.paidEnrollments} />
        <StatCard icon={BarChart3} label="Revenue" value={formatNaira(stats.totalRevenue)} />
        <StatCard icon={Award} label="Certificates" value={stats.totalCerts} />
        <StatCard icon={BookOpen} label="Lessons Done" value={stats.completedLessons} />
      </div>

      {/* Signup trend (simple bar chart) */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Signups (Last 7 Days)</h3>
        <div className="flex items-end gap-1 h-24">
          {stats.signupsByDay.map((d: any) => {
            const max = Math.max(...stats.signupsByDay.map((x: any) => x.count), 1);
            const height = (d.count / max) * 100;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{d.count}</span>
                <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(height, 4)}%` }}>
                  <div className="w-full h-full bg-primary rounded-t" />
                </div>
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-course breakdown */}
      {courseStats.map((cs) => (
        <div key={cs.id} className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">{cs.name}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
            <div><p className="text-lg font-bold text-primary">{cs.enrolled}</p><p className="text-[10px] text-muted-foreground">Enrolled</p></div>
            <div><p className="text-lg font-bold text-primary">{cs.paid}</p><p className="text-[10px] text-muted-foreground">Paid</p></div>
            <div><p className="text-lg font-bold text-primary">{cs.certificates}</p><p className="text-[10px] text-muted-foreground">Completed</p></div>
            <div><p className="text-lg font-bold text-primary">{cs.avgCompletion}%</p><p className="text-[10px] text-muted-foreground">Avg Progress</p></div>
          </div>

          {/* Week drop-off */}
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Weekly Retention</h4>
          <div className="space-y-1.5">
            {cs.weekDropoff.map((w: any) => {
              const maxUsers = cs.weekDropoff[0]?.users || 1;
              const pct = maxUsers > 0 ? Math.round((w.users / maxUsers) * 100) : 0;
              return (
                <div key={w.week} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-10 shrink-0">Wk {w.week}</span>
                  <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-12 text-right">{w.users} users</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
