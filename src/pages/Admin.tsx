import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAllCourses, getWeeksWithLessons } from "@/lib/supabase-helpers";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, UserPlus, Unlock, RefreshCw, CheckCircle, Circle, Pencil, Download, ShieldCheck, ShieldOff, EyeOff, Sparkles, Loader2 } from "lucide-react";
import AdminCourseManager from "@/components/AdminCourseManager";
import AdminEmailTab from "@/components/AdminEmailTab";
import AdminAnalyticsTab from "@/components/AdminAnalyticsTab";
import AdminDiscountTab from "@/components/AdminDiscountTab";
import AdminBulkTab from "@/components/AdminBulkTab";
import AdminTutorTab from "@/components/AdminTutorTab";
import AdminQuizTab from "@/components/AdminQuizTab";
import AiCourseGenerator from "@/components/AiCourseGenerator";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Admin() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<any[]>([]);
  const [userEnrollment, setUserEnrollment] = useState<any>(null);
  const [userCert, setUserCert] = useState<any>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [tutors, setTutors] = useState<any[]>([]);
  const [tutorSearch, setTutorSearch] = useState("");
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
      const { data: enrollments } = await supabase.from("enrollments").select("*");
      setAllEnrollments(enrollments || []);
      await Promise.all([loadUsers(""), loadTutors()]);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTutors = async () => {
    const { data: tutorRoles } = await supabase.from("user_roles").select("*").eq("role", "tutor");
    if (!tutorRoles || tutorRoles.length === 0) { setTutors([]); return; }
    const tutorUserIds = tutorRoles.map(r => r.user_id);
    const { data: tutorProfiles } = await supabase.from("profiles").select("*").in("user_id", tutorUserIds);
    setTutors(tutorProfiles || []);
  };

  const promoteTutor = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "tutor" as any });
    if (error) { toast.error("Failed to promote: " + error.message); return; }
    toast.success("User promoted to tutor!");
    loadTutors();
  };

  const demoteTutor = async (userId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "tutor" as any);
    if (error) { toast.error("Failed to demote: " + error.message); return; }
    toast.success("Tutor role removed.");
    loadTutors();
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

    const [prog, enrs, cert] = await Promise.all([
      supabase.from("lesson_progress").select("*").eq("user_id", profile.user_id),
      supabase.from("enrollments").select("*").eq("user_id", profile.user_id),
      selectedCourseId
        ? supabase.from("certificates").select("*").eq("user_id", profile.user_id).eq("course_id", selectedCourseId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setUserProgress(prog.data || []);
    setUserEnrollments(enrs.data || []);
    const currentEnr = (enrs.data || []).find((e: any) => e.course_id === selectedCourseId) || null;
    setUserEnrollment(currentEnr);
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

  const exportCSV = async () => {
    try {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: enrollments } = await supabase.from("enrollments").select("*");
      const { data: payments } = await supabase.from("payments").select("*");
      if (!profiles) return;

      const headers = [
        "First Name","Last Name","Email","Phone","Gender","Date of Birth",
        "Country","State","City","Education","Occupation","Device",
        "Reason for Course","KYC Completed","Joined",
        "Courses Enrolled","Paid Courses","Total Paid (NGN)"
      ];

      const rows = profiles.map(p => {
        const enrs = (enrollments || []).filter(e => e.user_id === p.user_id);
        const paidPayments = (payments || []).filter(pay => pay.user_id === p.user_id && pay.status === "success");
        const totalPaid = paidPayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
        const enrolledCourseNames = enrs.map(e => courses.find(c => c.id === e.course_id)?.name || e.course_id).join("; ");
        const paidCourseNames = enrs.filter(e => e.is_paid).map(e => courses.find(c => c.id === e.course_id)?.name || e.course_id).join("; ");

        return [
          p.first_name || "", p.last_name || "", p.email, p.phone || "",
          p.gender || "", p.date_of_birth || "", p.country || "",
          p.state_region || "", p.city_town || "", p.education_level || "",
          p.occupation || "", p.device_used || "", p.reason_for_course || "",
          p.kyc_completed ? "Yes" : "No",
          new Date(p.created_at).toLocaleDateString(),
          enrolledCourseNames, paidCourseNames, totalPaid.toString()
        ];
      });

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `enrollees-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export CSV");
    }
  };

  if (authLoading || loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="container max-w-3xl py-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <AiCourseGenerator onCourseCreated={initAdmin} />
            <AdminCourseManager onCourseCreated={initAdmin} />
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-4">{users.length} learners · {tutors.length} tutors · {courses.length} courses · {allEnrollments.length} enrollments</p>

        <Tabs defaultValue="learners" className="mb-6">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="learners">Learners</TabsTrigger>
            <TabsTrigger value="tutors">Tutors</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Ops</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            {/* Course list with edit and hide buttons */}
            <div className="rounded-lg border bg-card divide-y">
              {courses.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <p className={`text-sm font-medium truncate ${c.is_hidden ? "text-muted-foreground line-through" : ""}`}>{c.name}</p>
                    {c.is_hidden && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const { error } = await supabase.from("courses").update({ is_hidden: !c.is_hidden } as any).eq("id", c.id);
                        if (error) { toast.error("Failed to update visibility"); return; }
                        toast.success(c.is_hidden ? "Course is now visible" : "Course hidden from dashboard");
                        initAdmin();
                      }}
                      title={c.is_hidden ? "Show course" : "Hide course"}
                    >
                      {c.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCourse(c)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tutors">
            <AdminTutorTab
              tutors={tutors}
              users={users}
              tutorSearch={tutorSearch}
              setTutorSearch={setTutorSearch}
              promoteTutor={promoteTutor}
              demoteTutor={demoteTutor}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalyticsTab />
          </TabsContent>

          <TabsContent value="discounts">
            <AdminDiscountTab courses={courses} />
          </TabsContent>

          <TabsContent value="quizzes">
            <AdminQuizTab courses={courses} />
          </TabsContent>

          <TabsContent value="bulk">
            <AdminBulkTab courses={courses} />
          </TabsContent>

          <TabsContent value="email">
            <AdminEmailTab courses={courses} />
          </TabsContent>

          <TabsContent value="learners">
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
              {users.map(u => {
                const userEnrCount = allEnrollments.filter(e => e.user_id === u.user_id).length;
                return (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer" onClick={() => openUser(u)}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.first_name || ""} {u.last_name || ""} {!u.first_name && !u.last_name && u.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {userEnrCount > 0 && (
                        <Badge variant="default" className="text-xs">{userEnrCount} enrolled</Badge>
                      )}
                      {u.kyc_completed ? (
                        <Badge variant="secondary" className="text-xs">KYC Done</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">KYC Pending</Badge>
                      )}
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">No learners found</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <AdminCourseManager
          onCourseCreated={() => { setEditingCourse(null); initAdmin(); }}
          editCourse={editingCourse}
          open={!!editingCourse}
          onOpenChange={(v) => { if (!v) setEditingCourse(null); }}
        />

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
                {/* Full Profile Data */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Profile Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Email:</span> {selectedUser.email}</div>
                    <div><span className="text-muted-foreground">Phone:</span> {selectedUser.phone || "—"}</div>
                    <div><span className="text-muted-foreground">Gender:</span> {selectedUser.gender || "—"}</div>
                    <div><span className="text-muted-foreground">DOB:</span> {selectedUser.date_of_birth || "—"}</div>
                    <div><span className="text-muted-foreground">Country:</span> {selectedUser.country || "—"}</div>
                    <div><span className="text-muted-foreground">State:</span> {selectedUser.state_region || "—"}</div>
                    <div><span className="text-muted-foreground">City:</span> {selectedUser.city_town || "—"}</div>
                    <div><span className="text-muted-foreground">Education:</span> {selectedUser.education_level || "—"}</div>
                    <div><span className="text-muted-foreground">Occupation:</span> {selectedUser.occupation || "—"}</div>
                    <div><span className="text-muted-foreground">Device:</span> {selectedUser.device_used || "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {selectedUser.reason_for_course || "—"}</div>
                    <div><span className="text-muted-foreground">KYC:</span> {selectedUser.kyc_completed ? "✅ Completed" : "❌ Pending"}</div>
                    <div><span className="text-muted-foreground">Joined:</span> {new Date(selectedUser.created_at).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* All Enrollments */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Enrollments ({userEnrollments.length})</h4>
                  {userEnrollments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Not enrolled in any course</p>
                  ) : (
                    <div className="space-y-2">
                      {userEnrollments.map((enr: any) => {
                        const courseName = courses.find(c => c.id === enr.course_id)?.name || "Unknown";
                        return (
                          <div key={enr.id} className="flex items-center justify-between p-2 rounded border text-xs">
                            <div>
                              <p className="font-medium">{courseName}</p>
                              <p className="text-muted-foreground">Enrolled: {new Date(enr.enrolled_at).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-1">
                              <Badge variant={enr.is_paid ? "default" : "outline"} className="text-xs">
                                {enr.is_paid ? "Paid" : "Unpaid"}
                              </Badge>
                              <Badge variant={enr.is_unlocked ? "secondary" : "outline"} className="text-xs">
                                {enr.is_unlocked ? "Unlocked" : "Locked"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions for selected course */}
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
