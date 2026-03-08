import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getWeeksWithLessons } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, BookOpen, GripVertical, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase as sb } from "@/integrations/supabase/client";

interface LessonDraft {
  id?: string;
  title: string;
  content: string;
  video_url: string;
  learning_objective: string;
  practical_task: string;
}

interface WeekDraft {
  id?: string;
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

interface CourseToEdit {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
}

interface Props {
  onCourseCreated: () => void;
  editCourse?: CourseToEdit | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AdminCourseManager({ onCourseCreated, editCourse, open: controlledOpen, onOpenChange }: Props) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(6);
  const [weeks, setWeeks] = useState<WeekDraft[]>([emptyWeek()]);

  const isEdit = !!editCourse;

  // Load existing course data when editing
  useEffect(() => {
    if (editCourse && open) {
      setCourseName(editCourse.name);
      setCourseDescription(editCourse.description || "");
      setDurationWeeks(editCourse.duration_weeks);
      loadExistingWeeks(editCourse.id);
    }
  }, [editCourse, open]);

  const loadExistingWeeks = async (courseId: string) => {
    setLoadingEdit(true);
    try {
      const weeksData = await getWeeksWithLessons(courseId);
      if (weeksData.length > 0) {
        setWeeks(weeksData.map((w: any) => ({
          id: w.id,
          title: w.title,
          description: w.description || "",
          lessons: w.lessons.map((l: any) => ({
            id: l.id,
            title: l.title,
            content: l.content,
            video_url: l.video_url || "",
            learning_objective: l.learning_objective || "",
            practical_task: l.practical_task || "",
          })),
        })));
      } else {
        setWeeks([emptyWeek()]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load course data");
    } finally {
      setLoadingEdit(false);
    }
  };

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
      if (isEdit) {
        await handleUpdate();
      } else {
        await handleCreate();
      }
      resetForm();
      setOpen(false);
      onCourseCreated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || `Failed to ${isEdit ? "update" : "create"} course`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .insert({ name: courseName.trim(), description: courseDescription.trim() || null, duration_weeks: durationWeeks })
      .select()
      .single();
    if (courseErr) throw courseErr;

    const weekInserts = weeks.map((w, i) => ({
      course_id: course.id,
      week_number: i + 1,
      title: w.title.trim(),
      description: w.description.trim() || null,
    }));
    const { data: createdWeeks, error: weeksErr } = await supabase.from("weeks").insert(weekInserts).select();
    if (weeksErr) throw weeksErr;

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

    toast.success(`Course "${courseName}" created!`);
  };

  const handleUpdate = async () => {
    const courseId = editCourse!.id;

    // Update course details
    const { error: courseErr } = await supabase
      .from("courses")
      .update({ name: courseName.trim(), description: courseDescription.trim() || null, duration_weeks: durationWeeks })
      .eq("id", courseId);
    if (courseErr) throw courseErr;

    // Delete all existing weeks & lessons (cascade via week_id FK), then re-insert
    // First delete lessons for all weeks of this course
    const { data: existingWeeks } = await supabase.from("weeks").select("id").eq("course_id", courseId);
    if (existingWeeks && existingWeeks.length > 0) {
      const weekIds = existingWeeks.map(w => w.id);
      const { error: delLessons } = await supabase.from("lessons").delete().in("week_id", weekIds);
      if (delLessons) throw delLessons;
    }
    const { error: delWeeks } = await supabase.from("weeks").delete().eq("course_id", courseId);
    if (delWeeks) throw delWeeks;

    // Re-insert weeks and lessons
    const weekInserts = weeks.map((w, i) => ({
      course_id: courseId,
      week_number: i + 1,
      title: w.title.trim(),
      description: w.description.trim() || null,
    }));
    const { data: createdWeeks, error: weeksErr } = await supabase.from("weeks").insert(weekInserts).select();
    if (weeksErr) throw weeksErr;

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
    if (lessonInserts.length > 0) {
      const { error: lessonsErr } = await supabase.from("lessons").insert(lessonInserts);
      if (lessonsErr) throw lessonsErr;
    }

    toast.success(`Course "${courseName}" updated!`);
  };

  const resetForm = () => {
    setCourseName("");
    setCourseDescription("");
    setDurationWeeks(6);
    setWeeks([emptyWeek()]);
  };

  const dialogContent = (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> {isEdit ? "Edit Course" : "Create New Course"}
        </DialogTitle>
      </DialogHeader>

      {loadingEdit ? (
        <div className="py-8 text-center text-muted-foreground">Loading course data…</div>
      ) : (
        <div className="space-y-4">
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
            {saving ? (isEdit ? "Updating…" : "Creating…") : (isEdit ? "Update Course" : "Create Course")}
          </Button>
        </div>
      )}
    </DialogContent>
  );

  // If controlled (edit mode), render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Create Course</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
