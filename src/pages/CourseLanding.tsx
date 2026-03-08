import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCourseById, getWeeksWithLessons, COURSE_PRICES, formatNaira } from "@/lib/supabase-helpers";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

export default function CourseLanding() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    if (!courseId) return;
    try {
      const [c, w] = await Promise.all([
        getCourseById(courseId),
        getWeeksWithLessons(courseId),
      ]);
      setCourse(c);
      setWeeks(w);
    } catch {
      navigate("/");
    }
    setLoading(false);
  };

  const totalLessons = weeks.reduce((sum, w) => sum + w.lessons.length, 0);
  const price = courseId ? COURSE_PRICES[courseId] || 20000 : 20000;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-primary">
            <BookOpen className="h-5 w-5" />
            <span>AI Essentials</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary/5 border-b">
        <div className="container max-w-3xl py-12 md:py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.duration_weeks} Weeks</span>
              <span>·</span>
              <span>{totalLessons} Lessons</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{course.name}</h1>
            <p className="text-lg text-muted-foreground mb-6 max-w-xl">{course.description}</p>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <Button size="lg" onClick={() => user ? navigate("/dashboard") : navigate("/signup")}>
                {user ? "Go to Dashboard" : `Enroll — ${formatNaira(price)}`} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-sm text-muted-foreground self-center">Certificate included upon completion</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="container max-w-3xl py-10">
        <h2 className="font-display text-xl font-bold mb-4">What You'll Learn</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {weeks.slice(0, 6).map((week) => (
            <div key={week.id} className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{week.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Syllabus */}
      <section className="container max-w-3xl pb-12">
        <h2 className="font-display text-xl font-bold mb-4">Course Syllabus</h2>
        <div className="space-y-2">
          {weeks.map((week) => (
            <div key={week.id} className="rounded-lg border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedWeek(expandedWeek === week.id ? null : week.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold">Week {week.week_number}: {week.title}</p>
                  <p className="text-xs text-muted-foreground">{week.lessons.length} lessons</p>
                </div>
                {expandedWeek === week.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedWeek === week.id && (
                <div className="border-t divide-y">
                  {week.lessons.map((lesson: any) => (
                    <div key={lesson.id} className="px-4 py-2.5 text-sm text-muted-foreground">
                      {lesson.title}
                      {lesson.learning_objective && (
                        <span className="block text-xs mt-0.5">{lesson.learning_objective}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container py-10 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">Start your learning journey today</h2>
          <p className="text-primary-foreground/80 mb-6">Join and build practical skills for the future of work.</p>
          <Button size="lg" variant="secondary" onClick={() => user ? navigate("/dashboard") : navigate("/signup")}>
            {user ? "Go to Dashboard" : "Create Your Account"}
          </Button>
        </div>
      </section>

      <footer className="container py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} FutureLabs. All rights reserved.
      </footer>
    </div>
  );
}
