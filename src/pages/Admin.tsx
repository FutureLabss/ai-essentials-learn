import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAllCourses, getWeeksWithLessons } from "@/lib/supabase-helpers";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, UserPlus, Unlock, RefreshCw, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [userEnrollment, setUserEnrollment] = useState<any>(null);
  const [userCert, setUserCert] = useState<any>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
      return;
    }
    initAdmin();
  }, [user, role, authLoading]);

  const initAdmin = async () => {
    try {
      const cList = await getAllCourses();
      setCourses(cList);
      if (cList.length > 0) {
        setSelectedCourseId(cList[0].id);
      }
      await loadUsers("");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseData(selectedCourseId);
    }
  }, [selectedCourseId]);

  const loadCourseData = async (courseId: string) => {
    const weeks = await getWeeksWithLessons(courseId);
    setAllLessons(weeks.flatMap(w => w.lessons.map((l: any) => ({ ...l, weekTitle: w.title, weekNumber: w.week_number }))));
  };

  const loadUsers = async (query: string) => {
    let supabaseQuery = supabase.from("profiles").select("*").order("created_at", { ascending: false });

    if (query) {
      supabaseQuery = supabaseQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data: profiles } = await supabaseQuery;
    setUsers(profiles || []);
    setLoading(false);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    const timeoutId = setTimeout(() => loadUsers(val), 300);
    return () => clearTimeout(timeoutId);
  };

  const openUser = async (profile: any) => {
    setSelectedUser(profile);
    if (!selectedCourseId) return;

    // Optimized fetching
    const [prog, enr, cert] = await Promise.all([
      supabase.from("lesson_progress").select("*").eq("user_id", profile.user_id),
      supabase.from("enrollments").select("*").eq("user_id", profile.user_id).eq("course_id", selectedCourseId).maybeSingle(),
      supabase.from("certificates").select("*").eq("user_id", profile.user_id).eq("course_id", selectedCourseId).maybeSingle()
    ]);

    setUserProgress(prog.data || []);
    setUserEnrollment(enr.data);
    setUserCert(cert.data);
  };

  const enrollUser = async () => {
    if (!selectedUser || !selectedCourseId) return;
    await supabase.from("enrollments").upsert({
      user_id: selectedUser.user_id,
      course_id: selectedCourseId,
      is_paid: true,
      is_unlocked: true,
    }, { onConflict: "user_id,course_id" });
    toast.success("User enrolled and unlocked.");
    openUser(selectedUser);
  };

  const unlockUser = async () => {
    if (!selectedUser || !selectedCourseId) return;
    await supabase.from("enrollments").update({ is_unlocked: true, is_paid: true }).eq("user_id", selectedUser.user_id).eq("course_id", selectedCourseId);
    toast.success("Course unlocked.");
    openUser(selectedUser);
  };

  const reissueCert = async () => {
    if (!selectedUser || !selectedCourseId) return;
    const certId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    // Delete existing then insert
    await supabase.from("certificates").delete().eq("user_id", selectedUser.user_id).eq("course_id", selectedCourseId);
    await supabase.from("certificates").insert({
      user_id: selectedUser.user_id,
      course_id: selectedCourseId,
      certificate_id: certId,
    });
    toast.success("Certificate reissued.");
    openUser(selectedUser);
  };

  const completedLessonIds = new Set(userProgress.filter(p => p.completed).map(p => p.lesson_id));

  if (authLoading || loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="container max-w-3xl py-6">
        <h1 className="font-display text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mb-6">{users.length} learners</p>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search learners..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-lg border bg-card divide-y">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer" onClick={() => openUser(u)}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {u.first_name || ""} {u.last_name || ""} {!u.first_name && !u.last_name && u.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.kyc_completed ? (
                  <Badge variant="secondary" className="text-xs">KYC Done</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">KYC Pending</Badge>
                )}
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">No learners found</div>
          )}
        </div>

        {/* User Detail Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Email:</span> {selectedUser.email}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selectedUser.phone || "—"}</div>
                  <div><span className="text-muted-foreground">Country:</span> {selectedUser.country || "—"}</div>
                  <div><span className="text-muted-foreground">KYC:</span> {selectedUser.kyc_completed ? "✅" : "❌"}</div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {(!userEnrollment || !userEnrollment.is_unlocked) && (
                    <>
                      <Button size="sm" onClick={enrollUser}><UserPlus className="h-4 w-4 mr-1" /> Enroll & Unlock</Button>
                      {userEnrollment && !userEnrollment.is_unlocked && (
                        <Button size="sm" variant="outline" onClick={unlockUser}><Unlock className="h-4 w-4 mr-1" /> Unlock</Button>
                      )}
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={reissueCert}><RefreshCw className="h-4 w-4 mr-1" /> Reissue Cert</Button>
                </div>

                {userEnrollment && (
                  <Badge variant={userEnrollment.is_unlocked ? "default" : "outline"}>
                    {userEnrollment.is_unlocked ? "Course Unlocked" : "Course Locked"}
                  </Badge>
                )}

                {userCert && (
                  <div className="text-sm p-3 rounded bg-accent/10 border border-accent/30">
                    🎓 Certificate: {userCert.certificate_id} · {new Date(userCert.issued_at).toLocaleDateString()}
                  </div>
                )}

                {/* Progress */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Lesson Progress ({completedLessonIds.size}/{allLessons.length})</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allLessons.map((l: any) => (
                      <div key={l.id} className="flex items-center gap-2 text-xs">
                        {completedLessonIds.has(l.id) ? (
                          <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-muted-foreground">W{l.weekNumber}</span>
                        <span className="truncate">{l.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
