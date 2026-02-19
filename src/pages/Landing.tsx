import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, Zap, Award, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: BookOpen, title: "6-Week Course", desc: "Structured learning from the basics to practical AI skills" },
  { icon: Zap, title: "Practical Focus", desc: "Learn by doing with real-world tasks and exercises" },
  { icon: CheckCircle, title: "Track Progress", desc: "Complete lessons at your pace with clear progress tracking" },
  { icon: Award, title: "Get Certified", desc: "Earn a certificate when you complete the course" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-primary">
            <BookOpen className="h-5 w-5" />
            <span>AI Essentials</span>
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
            Learn AI Skills
            <span className="block text-primary">For Real Work</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            A practical 6-week course designed for beginners. No coding required. Learn to use AI tools that make your work faster and better.
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
            Join learners who are building practical AI skills for the future of work.
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
