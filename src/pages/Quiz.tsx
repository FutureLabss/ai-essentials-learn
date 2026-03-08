import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, Trophy, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Quiz() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [previousAttempt, setPreviousAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (!quizId) { navigate("/dashboard"); return; }
    loadQuiz();
  }, [user, quizId, authLoading]);

  const loadQuiz = async () => {
    if (!user || !quizId) return;
    try {
      const [{ data: q }, { data: qs }, { data: attempts }] = await Promise.all([
        supabase.from("quizzes").select("*").eq("id", quizId).single(),
        supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("question_order"),
        supabase.from("quiz_attempts").select("*").eq("quiz_id", quizId).eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1),
      ]);
      setQuiz(q);
      setQuestions(qs || []);
      if (attempts && attempts.length > 0) {
        setPreviousAttempt(attempts[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load quiz");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const selectAnswer = (questionId: string, answer: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitQuiz = async () => {
    if (!user || !quiz) return;
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correct++;
    });
    const pct = Math.round((correct / questions.length) * 100);
    const didPass = pct >= quiz.passing_score;

    setScore(pct);
    setPassed(didPass);
    setSubmitted(true);

    try {
      await supabase.from("quiz_attempts").insert({
        quiz_id: quiz.id,
        user_id: user.id,
        score: pct,
        total_questions: questions.length,
        answers: answers as any,
        passed: didPass,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const retakeQuiz = () => {
    setAnswers({});
    setCurrentIdx(0);
    setSubmitted(false);
    setScore(0);
    setPassed(false);
    setPreviousAttempt(null);
  };

  if (authLoading || loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  if (!quiz || questions.length === 0) return null;

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const progressPct = (answeredCount / questions.length) * 100;
  const options: string[] = Array.isArray(currentQ?.options) ? currentQ.options : [];

  return (
    <AppShell>
      <div className="container max-w-2xl py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <h1 className="font-display text-xl font-bold mb-1">{quiz.title}</h1>
        {quiz.description && <p className="text-muted-foreground text-sm mb-4">{quiz.description}</p>}

        {/* Previous attempt banner */}
        {previousAttempt && !submitted && (
          <div className="rounded-lg border bg-muted/30 p-3 mb-4 text-sm">
            <p>Previous attempt: <strong>{previousAttempt.score}%</strong> — {previousAttempt.passed ? "Passed ✓" : "Not passed"}</p>
          </div>
        )}

        {!submitted ? (
          <>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Question {currentIdx + 1} of {questions.length}</span>
                <span>{answeredCount} answered</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-lg border bg-card p-5 mb-4"
              >
                <div className="flex items-start gap-2 mb-4">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                    {currentQ.question_type === "true_false" ? "True/False" : "MCQ"}
                  </span>
                </div>
                <p className="font-medium mb-4">{currentQ.question_text}</p>

                <div className="space-y-2">
                  {options.map((opt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => selectAnswer(currentQ.id, opt)}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                        answers[currentQ.id] === opt
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(i => i - 1)}
              >
                Previous
              </Button>
              <div className="flex gap-2">
                {currentIdx < questions.length - 1 ? (
                  <Button size="sm" onClick={() => setCurrentIdx(i => i + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={answeredCount < questions.length}
                    onClick={submitQuiz}
                  >
                    Submit Quiz
                  </Button>
                )}
              </div>
            </div>

            {/* Question nav dots */}
            <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                    i === currentIdx
                      ? "bg-primary text-primary-foreground"
                      : answers[q.id]
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Results */
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className={`rounded-lg border p-6 text-center mb-6 ${passed ? "bg-green-500/10 border-green-500/30" : "bg-destructive/10 border-destructive/30"}`}>
              <Trophy className={`h-12 w-12 mx-auto mb-3 ${passed ? "text-green-500" : "text-destructive"}`} />
              <h2 className="text-2xl font-bold mb-1">{score}%</h2>
              <p className="text-sm text-muted-foreground mb-2">
                {passed ? "Congratulations! You passed!" : `You need ${quiz.passing_score}% to pass.`}
              </p>
              <Button variant="outline" size="sm" onClick={retakeQuiz}>
                <RotateCcw className="h-4 w-4 mr-1" /> Retake Quiz
              </Button>
            </div>

            {/* Review answers */}
            <div className="space-y-3">
              {questions.map((q, i) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer === q.correct_answer;
                const qOptions: string[] = Array.isArray(q.options) ? q.options : [];
                return (
                  <div key={q.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                    </div>
                    <div className="ml-7 space-y-1">
                      {qOptions.map((opt: string, oi: number) => (
                        <p
                          key={oi}
                          className={`text-sm px-2 py-1 rounded ${
                            opt === q.correct_answer
                              ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium"
                              : opt === userAnswer && !isCorrect
                                ? "bg-destructive/10 text-destructive line-through"
                                : "text-muted-foreground"
                          }`}
                        >
                          {opt}
                        </p>
                      ))}
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
