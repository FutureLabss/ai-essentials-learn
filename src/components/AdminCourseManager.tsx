import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, BookOpen, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface LessonDraft {
  title: string;
  content: string;
  video_url: string;
  learning_objective: string;
  practical_task: string;
}

interface WeekDraft {
  title: string;
  description: string;
  lessons: LessonDraft[];
}

const emptyLesson = (): LessonDraft => ({
  title: "",
  content: "",
  video_url: "",
  learning_objective: "",
  practical_task: "",
});

const emptyWeek = (): WeekDraft => ({
  title: "",
  description: "",
  lessons: [emptyLesson()],
});

interface Props {
  onCourseCreated: () => void;
}

export default function AdminCourseManager({ onCourseCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(6);
  const [weeks, setWeeks] = useState<WeekDraft[]>([emptyWeek()]);

  const updateWeek = (wi: number, field: keyof WeekDraft, value: string) => {
    setWeeks(prev => prev.map((w, i) => i === wi ? { ...w, [field]: value } : w));
  };

  const updateLesson = (wi: number, li: number, field: keyof LessonDraft, value: string) => {
    setWeeks(prev => prev.map((w, i) =>
      i === wi ? { ...w, lessons: w.lessons.map((l, j) => j === li ? { ...l, [field]: value } : l) } : w
    ));
  };

  const addWeek = () => setWeeks(prev => [...prev, emptyWeek()]);
  const removeWeek = (wi: number) => setWeeks(prev => prev.filter((_, i) => i !== wi));
  const addLesson = (wi: number) => {
    setWeeks(prev => prev.map((w, i) => i === wi ? { ...w, lessons: [...w.lessons, emptyLesson()] } : w));
  };
  const removeLesson = (wi: number, li: number) => {
    setWeeks(prev => prev.map((w, i) => i === wi ? { ...w, lessons: w.lessons.filter((_, j) => j !== li) } : w));
  };

  const handleSave = async () => {
    if (!courseName.trim()) { toast.error("Course name is required"); return; }
    if (weeks.some(w => !w.title.trim())) { toast.error("All weeks need a title"); return; }
    if (weeks.some(w => w.lessons.some(l => !l.title.trim() || !l.content.trim()))) {
      toast.error("All lessons need a title and content"); return;
    }

    setSaving(true);
    try {
      // 1. Create course
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .insert({ name: courseName.trim(), description: courseDescription.trim() || null, duration_weeks: durationWeeks })
        .select()
        .single();
      if (courseErr) throw courseErr;

      // 2. Create weeks
      const weekInserts = weeks.map((w, i) => ({
        course_id: course.id,
        week_number: i + 1,
        title: w.title.trim(),
        description: w.description.trim() || null,
      }));
      const { data: createdWeeks, error: weeksErr } = await supabase
        .from("weeks")
        .insert(weekInserts)
        .select();
      if (weeksErr) throw weeksErr;

      // 3. Create lessons — map by week_number order
      const sortedWeeks = [...createdWeeks].sort((a, b) => a.week_number - b.week_number);
      const lessonInserts = sortedWeeks.flatMap((dbWeek, wi) =>
        weeks[wi].lessons.map((l, li) => ({
          week_id: dbWeek.id,
          lesson_number: li + 1,
          title: l.title.trim(),
          content: l.content.trim(),
          video_url: l.video_url.trim() || null,
          learning_objective: l.learning_objective.trim() || null,
          practical_task: l.practical_task.trim() || null,
        }))
      );
      const { error: lessonsErr } = await supabase.from("lessons").insert(lessonInserts);
      if (lessonsErr) throw lessonsErr;

      toast.success(`Course "${courseName}" created with ${weeks.length} weeks!`);
      resetForm();
      setOpen(false);
      onCourseCreated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCourseName("");
    setCourseDescription("");
    setDurationWeeks(6);
    setWeeks([emptyWeek()]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Create Course</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Create New Course
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Course details */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Course Name *</label>
              <Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. AI Essentials" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={courseDescription} onChange={e => setCourseDescription(e.target.value)} placeholder="Brief course description..." rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Duration (weeks)</label>
              <Input type="number" min={1} max={52} value={durationWeeks} onChange={e => setDurationWeeks(Number(e.target.value))} />
            </div>
          </div>

          {/* Weeks & Lessons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Weeks & Lessons</h3>
              <Button size="sm" variant="outline" onClick={addWeek}><Plus className="h-3 w-3 mr-1" /> Add Week</Button>
            </div>

            <Accordion type="multiple" className="space-y-2">
              {weeks.map((week, wi) => (
                <AccordionItem key={wi} value={`week-${wi}`} className="border rounded-lg px-3">
                  <AccordionTrigger className="text-sm py-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <span>Week {wi + 1}: {week.title || "(untitled)"}</span>
                      <span className="text-muted-foreground text-xs">({week.lessons.length} lessons)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input placeholder="Week title *" value={week.title} onChange={e => updateWeek(wi, "title", e.target.value)} />
                      </div>
                      {weeks.length > 1 && (
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeWeek(wi)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Input placeholder="Week description (optional)" value={week.description} onChange={e => updateWeek(wi, "description", e.target.value)} />

                    {/* Lessons */}
                    <div className="space-y-3 pl-4 border-l-2 border-muted">
                      {week.lessons.map((lesson, li) => (
                        <div key={li} className="space-y-2 p-3 rounded-md bg-muted/30">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Lesson {li + 1}</span>
                            {week.lessons.length > 1 && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeLesson(wi, li)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Input placeholder="Lesson title *" value={lesson.title} onChange={e => updateLesson(wi, li, "title", e.target.value)} />
                          <Textarea placeholder="Lesson content *" value={lesson.content} onChange={e => updateLesson(wi, li, "content", e.target.value)} rows={3} />
                          <Input placeholder="YouTube URL (optional)" value={lesson.video_url} onChange={e => updateLesson(wi, li, "video_url", e.target.value)} />
                          <Input placeholder="Learning objective (optional)" value={lesson.learning_objective} onChange={e => updateLesson(wi, li, "learning_objective", e.target.value)} />
                          <Input placeholder="Practical task (optional)" value={lesson.practical_task} onChange={e => updateLesson(wi, li, "practical_task", e.target.value)} />
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => addLesson(wi)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Lesson
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Creating…" : "Create Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
