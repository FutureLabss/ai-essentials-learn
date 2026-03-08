import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Trash2, Pencil, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface AdminQuizTabProps {
  courses: any[];
}

export default function AdminQuizTab({ courses }: AdminQuizTabProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [weeks, setWeeks] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [editQuiz, setEditQuiz] = useState<any>(null);
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (selectedCourseId) loadData();
  }, [selectedCourseId]);

  const loadData = async () => {
    const [{ data: w }, { data: q }] = await Promise.all([
      supabase.from("weeks").select("*").eq("course_id", selectedCourseId).order("week_number"),
      supabase.from("quizzes").select("*").eq("course_id", selectedCourseId).order("created_at"),
    ]);
    setWeeks(w || []);
    setQuizzes(q || []);
  };

  const generateQuiz = async (quizType: "weekly" | "final", weekId?: string) => {
    const key = weekId || "final";
    setGenerating(key);
    try {
      const res = await supabase.functions.invoke("generate-quiz", {
        body: { courseId: selectedCourseId, weekId, quizType },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success("Quiz generated successfully!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz");
    }
    setGenerating(null);
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
    await supabase.from("quiz_attempts").delete().eq("quiz_id", quizId);
    await supabase.from("quizzes").delete().eq("id", quizId);
    toast.success("Quiz deleted");
    loadData();
  };

  const toggleExpand = async (quizId: string) => {
    if (expandedQuiz === quizId) {
      setExpandedQuiz(null);
      return;
    }
    if (!quizQuestions[quizId]) {
      const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("question_order");
      setQuizQuestions(prev => ({ ...prev, [quizId]: data || [] }));
    }
    setExpandedQuiz(quizId);
  };

  const openEditQuiz = async (quiz: any) => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("question_order");
    setEditQuiz(quiz);
    setEditQuestions(data || []);
  };

  const saveQuestions = async () => {
    if (!editQuiz) return;
    try {
      for (const q of editQuestions) {
        await supabase.from("quiz_questions").update({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        }).eq("id", q.id);
      }
      toast.success("Questions saved");
      setEditQuiz(null);
      // Refresh expanded view
      const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", editQuiz.id).order("question_order");
      setQuizQuestions(prev => ({ ...prev, [editQuiz.id]: data || [] }));
    } catch (err) {
      toast.error("Failed to save");
    }
  };

  const deleteQuestion = async (questionId: string) => {
    setEditQuestions(prev => prev.filter(q => q.id !== questionId));
    await supabase.from("quiz_questions").delete().eq("id", questionId);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setEditQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setEditQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const newOpts = [...(q.options || [])];
      newOpts[optIdx] = value;
      return { ...q, options: newOpts };
    }));
  };

  const weekQuizMap = new Map(quizzes.filter(q => q.week_id).map(q => [q.week_id, q]));
  const finalQuiz = quizzes.find(q => q.quiz_type === "final");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm flex-1"
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
        >
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Weekly quizzes */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Weekly Quizzes</h3>
        <div className="space-y-2">
          {weeks.map(w => {
            const existing = weekQuizMap.get(w.id);
            return (
              <div key={w.id} className="rounded-lg border bg-card">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Week {w.week_number}: {w.title}</span>
                    {existing && <Badge variant="secondary" className="text-xs">Quiz ready</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {existing ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => toggleExpand(existing.id)}>
                          {expandedQuiz === existing.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditQuiz(existing)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteQuiz(existing.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={generating === w.id}
                        onClick={() => generateQuiz("weekly", w.id)}
                      >
                        {generating === w.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                        Generate
                      </Button>
                    )}
                  </div>
                </div>
                {expandedQuiz === existing?.id && quizQuestions[existing.id] && (
                  <div className="border-t px-4 py-3 space-y-2">
                    {quizQuestions[existing.id].map((q, i) => (
                      <div key={q.id} className="text-sm">
                        <p className="font-medium">{i + 1}. {q.question_text}</p>
                        <p className="text-xs text-muted-foreground">Answer: {q.correct_answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Final quiz */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Final Quiz</h3>
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Comprehensive Final Quiz</span>
              {finalQuiz && <Badge variant="secondary" className="text-xs">Quiz ready</Badge>}
            </div>
            <div className="flex gap-1">
              {finalQuiz ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(finalQuiz.id)}>
                    {expandedQuiz === finalQuiz.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEditQuiz(finalQuiz)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteQuiz(finalQuiz.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generating === "final"}
                  onClick={() => generateQuiz("final")}
                >
                  {generating === "final" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  Generate
                </Button>
              )}
            </div>
          </div>
          {expandedQuiz === finalQuiz?.id && quizQuestions[finalQuiz.id] && (
            <div className="border-t px-4 py-3 space-y-2">
              {quizQuestions[finalQuiz.id].map((q, i) => (
                <div key={q.id} className="text-sm">
                  <p className="font-medium">{i + 1}. {q.question_text}</p>
                  <p className="text-xs text-muted-foreground">Answer: {q.correct_answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editQuiz} onOpenChange={() => setEditQuiz(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quiz Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editQuestions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Q{idx + 1} · {q.question_type}</span>
                  <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  value={q.question_text}
                  onChange={e => updateQuestion(idx, "question_text", e.target.value)}
                  className="text-sm"
                  rows={2}
                />
                {(q.options || []).map((opt: string, oi: number) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correct_answer === opt}
                      onChange={() => updateQuestion(idx, "correct_answer", opt)}
                    />
                    <Input
                      value={opt}
                      onChange={e => {
                        const oldOpt = opt;
                        updateOption(idx, oi, e.target.value);
                        if (q.correct_answer === oldOpt) {
                          updateQuestion(idx, "correct_answer", e.target.value);
                        }
                      }}
                      className="text-sm h-8"
                    />
                  </div>
                ))}
                <Input
                  placeholder="Explanation"
                  value={q.explanation || ""}
                  onChange={e => updateQuestion(idx, "explanation", e.target.value)}
                  className="text-sm h-8"
                />
              </div>
            ))}
            <Button onClick={saveQuestions} className="w-full">Save All Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
