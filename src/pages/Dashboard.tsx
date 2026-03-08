import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getAllCourses, getUserEnrollments, getUserProgress, getUserCertificate, COURSE_PRICES, formatNaira } from "@/lib/supabase-helpers";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Lock, Award, ArrowRight, Clock, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingCourse, setPayingCourse] = useState<string | null>(null);
  const [discountCodes, setDiscountCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (profile && !profile.kyc_completed) { navigate("/kyc"); return; }
    loadData();
  }, [user, profile, authLoading]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [c, e, p] = await Promise.all([
        getAllCourses(),
        getUserEnrollments(user.id),
        getUserProgress(user.id),
      ]);
      setCourses(c);
      setEnrollments(e);
      setProgress(p);

      const certs = await Promise.all(
        c.map(course => getUserCertificate(user.id, course.id))
      );
      setCertificates(certs.filter(Boolean));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handlePayment = async (courseId: string) => {
    if (!user || !profile) return;
    setPayingCourse(courseId);

    try {
      const amount = COURSE_PRICES[courseId] || 20000;
      const callbackUrl = `${window.location.origin}/dashboard?verify=${courseId}`;
      const discountCode = discountCodes[courseId]?.trim() || undefined;

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/paystack?action=initialize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ courseId, amount, email: profile.email, callbackUrl, discountCode }),
        }
      );

      const result = await res.json();
      if (result.discountApplied) {
        toast.success("Discount code applied! Course unlocked for free 🎉");
        loadData();
      } else if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        toast.error(result.error || "Payment initialization failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Payment error");
    }
    setPayingCourse(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyCourse = params.get("verify");
    const reference = params.get("reference") || params.get("trxref");
    if (verifyCourse && reference && user) {
      verifyPayment(reference);
    }
  }, [user]);

  const verifyPayment = async (reference: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/paystack?action=verify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ reference }),
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success("Payment verified! Course unlocked.");
        window.history.replaceState({}, "", "/dashboard");
        loadData();
      } else {
        toast.error("Payment verification failed. Please contact support.");
      }
    } catch {
      toast.error("Could not verify payment.");
    }
  };

  const getEnrollment = (courseId: string) => enrollments.find(e => e.course_id === courseId);
  const getCert = (courseId: string) => certificates.find((c: any) => c?.course_id === courseId);

  if (authLoading || loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="container max-w-4xl py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-bold mb-1">
            Welcome back, {profile?.first_name || "Learner"} 👋
          </h1>
          <p className="text-muted-foreground text-sm">Choose a course to continue learning</p>
        </motion.div>

        {/* Course Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {courses.filter(c => !c.is_hidden).map((course, idx) => {
            const enrollment = getEnrollment(course.id);
            const cert = getCert(course.id);
            const isUnlocked = enrollment?.is_unlocked;
            const price = COURSE_PRICES[course.id] || 20000;

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col"
              >
                {/* Course Header */}
                <div className={`px-5 py-4 ${idx === 0 ? "bg-primary/10" : "bg-accent/10"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className={`h-5 w-5 ${idx === 0 ? "text-primary" : "text-accent-foreground"}`} />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {course.duration_weeks} Weeks
                      </span>
                    </div>
                    {cert && <Award className="h-5 w-5 text-accent-foreground" />}
                  </div>
                  <h2 className="font-display text-lg font-bold mt-2">{course.name}</h2>
                </div>

                {/* Course Body */}
                <div className="px-5 py-4 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    {course.description}
                  </p>

                  {cert ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                          <Award className="h-4 w-4" /> Completed
                        </span>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/certificate">View Certificate</Link>
                        </Button>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="w-full"
                      >
                        Continue Learning <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ) : isUnlocked ? (
                    <Button
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="w-full"
                    >
                      Continue Learning <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">{formatNaira(price)}</span>
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                          placeholder="Discount code"
                          value={discountCodes[course.id] || ""}
                          onChange={(e) => setDiscountCodes(prev => ({ ...prev, [course.id]: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Button
                        onClick={() => handlePayment(course.id)}
                        disabled={payingCourse === course.id}
                        className="w-full"
                        variant={idx === 0 ? "default" : "outline"}
                      >
                        {payingCourse === course.id ? "Processing…" : `Enroll — ${formatNaira(price)}`}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
