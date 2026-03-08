import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, Loader2, BookOpen, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

interface GeneratedCourse {
  name: string;
  description: string;
  duration_weeks: number;
  weeks: WeekDraft[];
}

interface Props {
  onCourseCreated: () => void;
}

export default function AiCourseGenerator({ onCourseCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [numWeeks, setNumWeeks] = useState(6);
  const [lessonsPerWeek, setLessonsPerWeek] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [step, setStep] = useState<"prompt" | "review">("prompt");

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Enter a course topic"); return; }
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-course", {
        body: { topic: topic.trim(), weeks: numWeeks, lessonsPerWeek },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Normalize lessons to include video_url
      const normalized: GeneratedCourse = {
        ...data,
        weeks: (data.weeks || []).map((w: any) => ({
          ...w,
          lessons: (w.lessons || []).map((l: any) => ({
            ...l,
            video_url: l.video_url || "",
            learning_objective: l.learning_objective || "",
            practical_task: l.practical_task || "",
          })),
        })),
      };

      setCourse(normalized);
      setStep("review");
      toast.success("Course generated! Review and edit before saving.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate course");
    } finally {
      setGenerating(false);
    }
  };

  const updateField = (field: keyof GeneratedCourse, value: any) => {
    setCourse((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const updateWeek = (wi: number, field: string, value: string) => {
    setCourse((prev) => {
      if (!prev) return prev;
      const weeks = [...prev.weeks];
      weeks[wi] = { ...weeks[wi], [field]: value };
      return { ...prev, weeks };
    });
  };

  const updateLesson = (wi: number, li: number, field: string, value: string) => {
    setCourse((prev) => {
      if (!prev) return prev;
      const weeks = [...prev.weeks];
      const lessons = [...weeks[wi].lessons];
      lessons[li] = { ...lessons[li], [field]: value };
      weeks[wi] = { ...weeks[wi], lessons };
      return { ...prev, weeks };
    });
  };

  const removeWeek = (wi: number) => {
    setCourse((prev) => {
      if (!prev) return prev;
      return { ...prev, weeks: prev.weeks.filter((_, i) => i !== wi) };
    });
  };

  const removeLesson = (wi: number, li: number) => {
    setCourse((prev) => {
      if (!prev) return prev;
      const weeks = [...prev.weeks];
      weeks[wi] = { ...weeks[wi], lessons: weeks[wi].lessons.filter((_, j) => j !== li) };
      return { ...prev, weeks };
    });
  };

  const addLesson = (wi: number) => {
    setCourse((prev) => {
      if (!prev) return prev;
      const weeks = [...prev.weeks];
      weeks[wi] = {
        ...weeks[wi],
        lessons: [...weeks[wi].lessons, { title: "", content: "", video_url: "", learning_objective: "", practical_task: "" }],
      };
      return { ...prev, weeks };
    });
  };

  const handleSave = async () => {
    if (!course) return;
    if (!course.name.trim()) { toast.error("Course name is required"); return; }

    setSaving(true);
    try {
      const { data: created, error: courseErr } = await supabase
        .from("courses")
        .insert({
          name: course.name.trim(),
          description: course.description?.trim() || null,
          duration_weeks: course.duration_weeks,
        })
        .select()
        .single();
      if (courseErr) throw courseErr;

      const weekInserts = course.weeks.map((w, i) => ({
        course_id: created.id,
        week_number: i + 1,
        title: w.title.trim(),
        description: w.description?.trim() || null,
      }));
      const { data: createdWeeks, error: weeksErr } = await supabase.from("weeks").insert(weekInserts).select();
      if (weeksErr) throw weeksErr;

      const sortedWeeks = [...createdWeeks].sort((a, b) => a.week_number - b.week_number);
      const lessonInserts = sortedWeeks.flatMap((dbWeek, wi) =>
        course.weeks[wi].lessons.map((l, li) => ({
          week_id: dbWeek.id,
          lesson_number: li + 1,
          title: l.title.trim(),
          content: l.content.trim(),
          video_url: l.video_url?.trim() || null,
          learning_objective: l.learning_objective?.trim() || null,
          practical_task: l.practical_task?.trim() || null,
        }))
      );
      if (lessonInserts.length > 0) {
        const { error: lessonsErr } = await supabase.from("lessons").insert(lessonInserts);
        if (lessonsErr) throw lessonsErr;
      }

      toast.success(`Course "${course.name}" created successfully!`);
      resetForm();
      setOpen(false);
      onCourseCreated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTopic("");
    setNumWeeks(6);
    setLessonsPerWeek(3);
    setCourse(null);
    setStep("prompt");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" /> AI Generate Course
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Course Generator
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "prompt" ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Describe the course topic and AI will generate a complete curriculum with weeks, lessons, and content.
              </p>
              <div>
                <label className="text-sm font-medium">Course Topic *</label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Introduction to Machine Learning for beginners, covering supervised and unsupervised learning, neural networks, and practical applications"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Number of Weeks</label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={numWeeks}
                    onChange={(e) => setNumWeeks(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Lessons per Week</label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={lessonsPerWeek}
                    onChange={(e) => setLessonsPerWeek(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleGenerate} disabled={generating || !topic.trim()}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating curriculum…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Course
                  </>
                )}
              </Button>
            </motion.div>
          ) : course ? (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Review and edit the generated course before saving.</p>
                <Button size="sm" variant="ghost" onClick={() => setStep("prompt")}>← Back</Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Course Name *</label>
                  <Input value={course.name} onChange={(e) => updateField("name", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={course.description} onChange={(e) => updateField("description", e.target.value)} rows={2} />
                </div>
              </div>

              <Accordion type="multiple" className="space-y-2">
                {course.weeks.map((week, wi) => (
                  <AccordionItem key={wi} value={`week-${wi}`} className="border rounded-lg px-3">
                    <AccordionTrigger className="text-sm py-2">
                      <span>Week {wi + 1}: {week.title || "(untitled)"} ({week.lessons.length} lessons)</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-3">
                      <div className="flex gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Week title"
                          value={week.title}
                          onChange={(e) => updateWeek(wi, "title", e.target.value)}
                        />
                        {course.weeks.length > 1 && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeWeek(wi)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Week description"
                        value={week.description}
                        onChange={(e) => updateWeek(wi, "description", e.target.value)}
                      />

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
                            <Input placeholder="Lesson title" value={lesson.title} onChange={(e) => updateLesson(wi, li, "title", e.target.value)} />
                            <Textarea placeholder="Lesson content" value={lesson.content} onChange={(e) => updateLesson(wi, li, "content", e.target.value)} rows={4} />
                            <Input placeholder="YouTube URL (optional)" value={lesson.video_url} onChange={(e) => updateLesson(wi, li, "video_url", e.target.value)} />
                            <Input placeholder="Learning objective" value={lesson.learning_objective} onChange={(e) => updateLesson(wi, li, "learning_objective", e.target.value)} />
                            <Input placeholder="Practical task" value={lesson.practical_task} onChange={(e) => updateLesson(wi, li, "practical_task", e.target.value)} />
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

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Course
                  </>
                )}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
