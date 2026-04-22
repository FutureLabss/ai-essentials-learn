import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAllCourses, getWeeksWithLessons } from "@/lib/supabase-helpers";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, MessageCircle, ChevronRight, Pencil, Eye, EyeOff, Sparkles, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import AiCourseGenerator from "@/components/AiCourseGenerator";
import AdminCourseManager from "@/components/AdminCourseManager";
import AdminQuizTab from "@/components/AdminQuizTab";
import AdminAnalyticsTab from "@/components/AdminAnalyticsTab";
import { toast } from "sonner";

export default function TutorDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [courseStats, setCourseStats] = useState<Record<string, any>>({});
  const [recentDiscussions, setRecentDiscussions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [improvingCourse, setImprovingCourse] = useState<any>(null);
  const [improveInstructions, setImproveInstructions] = useState("");
  const [improving, setImproving] = useState(false);

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

  const toggleHide = async (c: any) => {
    const { error } = await supabase.from("courses").update({ is_hidden: !c.is_hidden } as any).eq("id", c.id);
    if (error) { toast.error("Failed to update visibility"); return; }
    toast.success(c.is_hidden ? "Course is now visible" : "Course hidden from dashboard");
    loadData();
  };

  const handleImproveCourse = async () => {
    if (!improvingCourse) return;
    setImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-course", {
        body: { courseId: improvingCourse.id, instructions: improveInstructions.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const courseId = improvingCourse.id;
      await supabase.from("courses").update({
        name: data.name?.trim() || improvingCourse.name,
        description: data.description?.trim() || null,
        duration_weeks: data.duration_weeks || improvingCourse.duration_weeks,
      } as any).eq("id", courseId);

      const { data: existingWeeks } = await supabase.from("weeks").select("id").eq("course_id", courseId);
      if (existingWeeks && existingWeeks.length > 0) {
        await supabase.from("lessons").delete().in("week_id", existingWeeks.map(w => w.id));
      }
      await supabase.from("weeks").delete().eq("course_id", courseId);

      const weekInserts = (data.weeks || []).map((w: any, i: number) => ({
        course_id: courseId,
        week_number: i + 1,
        title: w.title?.trim() || `Week ${i + 1}`,
        description: w.description?.trim() || null,
      }));
      const { data: createdWeeks, error: weeksErr } = await supabase.from("weeks").insert(weekInserts).select();
      if (weeksErr) throw weeksErr;

      const sortedWeeks = [...createdWeeks].sort((a, b) => a.week_number - b.week_number);
      const lessonInserts = sortedWeeks.flatMap((dbWeek, wi) =>
        (data.weeks[wi]?.lessons || []).map((l: any, li: number) => ({
          week_id: dbWeek.id,
          lesson_number: li + 1,
          title: l.title?.trim() || `Lesson ${li + 1}`,
          content: l.content?.trim() || "",
          video_url: l.video_url?.trim() || null,
          learning_objective: l.learning_objective?.trim() || null,
          practical_task: l.practical_task?.trim() || null,
        }))
      );
      if (lessonInserts.length > 0) {
        const { error: lessonsErr } = await supabase.from("lessons").insert(lessonInserts);
        if (lessonsErr) throw lessonsErr;
      }

      toast.success(`Course "${data.name || improvingCourse.name}" improved and saved!`);
      setImprovingCourse(null);
      setImproveInstructions("");
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to improve course");
    } finally {
      setImproving(false);
    }
  };

  if (authLoading || loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="container max-w-3xl py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-bold mb-1">Tutor Dashboard</h1>
              <p className="text-muted-foreground text-sm">Build and manage courses, quizzes, and learner progress</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <AiCourseGenerator onCourseCreated={loadData} />
              <AdminCourseManager onCourseCreated={loadData} />
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 sm:grid-cols-2">
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
                      <h3 className="font-display font-semibold text-sm truncate flex-1">{course.name}</h3>
                      {course.is_hidden && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
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
          </TabsContent>

          <TabsContent value="courses">
            <div className="rounded-lg border bg-card divide-y">
              {courses.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${c.is_hidden ? "text-muted-foreground line-through" : ""}`}>{c.name}</p>
                    {c.is_hidden && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleHide(c)} title={c.is_hidden ? "Show course" : "Hide course"}>
                      {c.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setImprovingCourse(c)} title="AI Improve">
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Improve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCourse(c)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">No courses yet. Create one above.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quizzes">
            <AdminQuizTab courses={courses} />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalyticsTab />
          </TabsContent>

          <TabsContent value="discussions">
            <div className="rounded-lg border bg-card">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" /> Recent Discussions
                </h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
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
          </TabsContent>
        </Tabs>

        <AdminCourseManager
          onCourseCreated={() => { setEditingCourse(null); loadData(); }}
          editCourse={editingCourse}
          open={!!editingCourse}
          onOpenChange={(v) => { if (!v) setEditingCourse(null); }}
        />

        <Dialog open={!!improvingCourse} onOpenChange={(v) => { if (!v) { setImprovingCourse(null); setImproveInstructions(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> AI Improve Course
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                AI will analyze <strong>{improvingCourse?.name}</strong> and improve its content, learning objectives, and practical tasks.
              </p>
              <div>
                <label className="text-sm font-medium">Instructions (optional)</label>
                <Textarea
                  value={improveInstructions}
                  onChange={(e) => setImproveInstructions(e.target.value)}
                  placeholder="e.g. Add more real-world examples, beginner-friendly tone..."
                  rows={3}
                />
              </div>
              <Button className="w-full" onClick={handleImproveCourse} disabled={improving}>
                {improving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Improving course…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Improve Course</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
