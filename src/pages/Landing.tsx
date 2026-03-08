import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, Zap, Award, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Course {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
}

const features = [
  { icon: BookOpen, title: "Structured Courses", desc: "Learn step-by-step with weekly modules and practical tasks" },
  { icon: Zap, title: "Practical Focus", desc: "Learn by doing with real-world tasks and exercises" },
  { icon: CheckCircle, title: "Track Progress", desc: "Complete lessons at your pace with clear progress tracking" },
  { icon: Award, title: "Get Certified", desc: "Earn a certificate when you complete a course" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Landing() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    supabase
      .from("courses")
      .select("id, name, description, duration_weeks")
      .eq("is_hidden", false)
      .order("created_at")
      .then(({ data }) => {
        if (data) setCourses(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-primary">
            <BookOpen className="h-5 w-5" />
            <span>FutureLabs</span>
          </div>
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
      <section className="container py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
            <Zap className="h-3.5 w-3.5" />
            By FutureLabs
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Build Future-Ready
            <span className="block text-primary">Digital Skills</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            Practical courses designed for beginners. No coding required. Learn skills that make your work faster and better.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">
                Start Learning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Courses */}
      {courses.length > 0 && (
        <section className="container pb-16 md:pb-24">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-center mb-8">Our Courses</h2>
            <div className="grid grid-cols-1 gap-4">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                >
                  <Link
                    to={`/courses/${course.id}`}
                    className="block rounded-lg border bg-card p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-lg mb-1">{course.name}</h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{course.description}</p>
                        )}
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {course.duration_weeks} weeks
                        </span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="container pb-16 md:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="rounded-lg border bg-card p-5 shadow-sm"
            >
              <f.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-display font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container py-12 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
            Join learners who are building practical skills for the future of work.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/signup">Create Your Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} FutureLabs. All rights reserved.
      </footer>
    </div>
  );
}
