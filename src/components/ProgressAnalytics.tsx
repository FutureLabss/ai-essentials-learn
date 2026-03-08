import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { BookOpen, GraduationCap, TrendingUp } from "lucide-react";

interface ProgressAnalyticsProps {
  progress: any[];
  enrollments: any[];
  courses: any[];
  weeks: any[];
}

export default function ProgressAnalytics({ progress, enrollments, courses, weeks }: ProgressAnalyticsProps) {
  const { t } = useTranslation();

  const completedLessons = progress.filter(p => p.completed).length;
  const enrolledCount = enrollments.length;

  // Build weekly activity from completed_at dates
  const weeklyData = useMemo(() => {
    const now = new Date();
    const data: { name: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString(undefined, { weekday: "short" });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = progress.filter(p => {
        if (!p.completed || !p.completed_at) return false;
        const t = new Date(p.completed_at).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      }).length;
      data.push({ name: dayStr, count });
    }
    return data;
  }, [progress]);

  // Total lessons across all enrolled courses
  const totalLessons = useMemo(() => {
    // Count lessons from weeks data if available
    if (weeks.length > 0) {
      return weeks.reduce((sum, w) => sum + (w.lessons?.length || 0), 0);
    }
    return Math.max(completedLessons, 1);
  }, [weeks, completedLessons]);

  const completionRate = Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="mb-8">
      <h2 className="font-display font-bold text-lg mb-4">{t("dashboard.progressTitle")}</h2>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border bg-card p-3 text-center">
          <BookOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{completedLessons}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{t("dashboard.lessonsCompleted")}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <GraduationCap className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{enrolledCount}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{t("dashboard.coursesEnrolled")}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold">{completionRate}%</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{t("dashboard.completionRate")}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-medium mb-3">{t("dashboard.weeklyActivity")}</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value: number) => [`${value}`, t("dashboard.lessons")]}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
