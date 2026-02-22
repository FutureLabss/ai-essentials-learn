import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { markLessonComplete, getUserProgress, getWeeksWithLessons, getCourse, getUserEnrollment } from "@/lib/supabase-helpers";
import AppShell from "@/components/AppShell";
import CourseSidebar from "@/components/CourseSidebar";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Lesson() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [week, setWeek] = useState<any>(null);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [course, setCourseData] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    loadLesson();
  }, [id, user]);

  const loadLesson = async () => {
    if (!user || !id) return;
    const { data: lessonData } = await supabase.from("lessons").select("*").eq("id", id).single();
    if (!lessonData) { navigate("/dashboard"); return; }
    setLesson(lessonData);

    const { data: weekData } = await supabase.from("weeks").select("*").eq("id", lessonData.week_id).single();
    setWeek(weekData);

    const courseData = await getCourse();
    setCourseData(courseData);
    const weeksData = await getWeeksWithLessons(courseData.id);
    setWeeks(weeksData);
    const ordered = weeksData.flatMap(w => w.lessons);
    setAllLessons(ordered);

    const [p, enr] = await Promise.all([
      getUserProgress(user.id),
      getUserEnrollment(user.id, courseData.id),
    ]);
    setProgress(p);
    setEnrollment(enr);
    setIsCompleted(p.some(pr => pr.lesson_id === id && pr.completed));
  };

  const handleMarkComplete = async () => {
    if (!user || !id) return;
    setMarking(true);
    await markLessonComplete(user.id, id);
    setIsCompleted(true);
    setMarking(false);
    toast.success("Lesson completed!");

    const updatedProgress = [...progress, { lesson_id: id, completed: true }];
    setProgress(updatedProgress);
    const completedIds = new Set(updatedProgress.filter(p => p.completed).map(p => p.lesson_id));
    if (allLessons.every(l => completedIds.has(l.id))) {
      const courseData = await getCourse();
      const certId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      await supabase.from("certificates").insert({
        user_id: user.id,
        course_id: courseData.id,
        certificate_id: certId,
      });
      toast.success("🎉 Congratulations! Your certificate is ready!");
      navigate("/certificate");
      return;
    }
  };

  const currentIdx = allLessons.findIndex(l => l.id === id);
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;

  if (!lesson || !week) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {course && weeks.length > 0 && (
          <CourseSidebar
            weeks={weeks}
            progress={progress}
            currentLessonId={id || ""}
            isUnlocked={enrollment?.is_unlocked ?? false}
            courseName={course.name}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Week {week.week_number} · Lesson {lesson.lesson_number}
              </p>
              <h1 className="font-display text-2xl font-bold mb-2">{lesson.title}</h1>
              {lesson.learning_objective && (
                <p className="text-sm text-primary font-medium mb-6">🎯 {lesson.learning_objective}</p>
              )}

              {/* Content */}
              <div className="prose prose-sm max-w-none mb-8">
                {lesson.content.split("\n").map((paragraph: string, i: number) => (
                  paragraph.trim() ? <p key={i} className="text-foreground/90 leading-relaxed mb-3">{paragraph}</p> : null
                ))}
              </div>

              {/* Practical Task */}
              {lesson.practical_task && (
                <div className="rounded-lg bg-accent/10 border border-accent/30 p-4 mb-8">
                  <h3 className="font-display font-semibold text-sm mb-2">📝 Practical Task</h3>
                  <p className="text-sm text-foreground/80">{lesson.practical_task}</p>
                </div>
              )}

              {/* Video */}
              {lesson.video_url && (
                <div className="mb-8">
                  {lesson.video_url.includes("youtube.com") || lesson.video_url.includes("youtu.be") ? (
                    <div className="aspect-video rounded-lg overflow-hidden border">
                      <iframe
                        src={lesson.video_url.replace("watch?v=", "embed/")}
                        title={lesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                      Watch Video Resource →
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 border-t pt-6">
                {!isCompleted ? (
                  <Button onClick={handleMarkComplete} disabled={marking} className="flex-1">
                    {marking ? "Saving…" : "Mark as Complete"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-success font-medium text-sm flex-1">
                    <CheckCircle className="h-5 w-5" /> Completed
                  </div>
                )}
                {isCompleted && nextLesson && (
                  <Button onClick={() => navigate(`/lesson/${nextLesson.id}`)} className="flex-1">
                    Next Lesson <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>

              {/* Nav */}
              <div className="flex justify-between mt-4">
                {prevLesson ? (
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/lesson/${prevLesson.id}`)}>
                    ← Previous
                  </Button>
                ) : <div />}
                {nextLesson && isCompleted ? (
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/lesson/${nextLesson.id}`)}>
                    Next →
                  </Button>
                ) : <div />}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
