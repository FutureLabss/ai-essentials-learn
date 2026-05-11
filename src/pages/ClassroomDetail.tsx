import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Calendar, ClipboardCheck } from "lucide-react";

export default function ClassroomDetail() {
  const { id } = useParams<{ id: string }>();
  const [classroom, setClassroom] = useState<any>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [newCohort, setNewCohort] = useState("");
  const [schTitle, setSchTitle] = useState("");
  const [schWhen, setSchWhen] = useState("");
  const [schCohort, setSchCohort] = useState("");
  const [attCohort, setAttCohort] = useState("");

  const isTeaching = myRole === "teaching";
  const canEdit = myRole === "teaching" || myRole === "admin";

  const load = async () => {
    if (!id) return;
    const { data: c } = await supabase.from("classrooms").select("*").eq("id", id).maybeSingle();
    setClassroom(c);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: roleRow } = await supabase
        .from("staff_classrooms").select("staff_role")
        .eq("classroom_id", id).eq("user_id", u.user.id).maybeSingle();
      const { data: appRoles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (appRoles?.some((r: any) => r.role === "admin")) setMyRole("admin");
      else setMyRole(roleRow?.staff_role ?? null);
    }
    const { data: co } = await supabase.from("cohorts").select("*").eq("classroom_id", id).order("created_at");
    setCohorts(co || []);
    const cohortIds = (co || []).map((x) => x.id);
    if (cohortIds.length) {
      const { data: sch } = await supabase.from("class_schedules").select("*").in("cohort_id", cohortIds).order("scheduled_at");
      setSchedules(sch || []);
      const { data: sess } = await supabase.from("attendance_sessions").select("*").in("cohort_id", cohortIds).order("opened_at", { ascending: false });
      setSessions(sess || []);
    } else { setSchedules([]); setSessions([]); }
  };
  useEffect(() => { load(); }, [id]);

  const addCohort = async () => {
    if (!newCohort.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("cohorts").insert({
      classroom_id: id!, name: newCohort.trim(), created_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    setNewCohort(""); load();
  };

  const addSchedule = async () => {
    if (!schTitle.trim() || !schWhen || !schCohort) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("class_schedules").insert({
      cohort_id: schCohort, title: schTitle.trim(),
      scheduled_at: new Date(schWhen).toISOString(), created_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    setSchTitle(""); setSchWhen(""); load();
  };

  const generateAttendance = async () => {
    if (!attCohort) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("attendance_sessions").insert({
      cohort_id: attCohort, code, created_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Attendance code: ${code}`);
    load();
  };

  if (!classroom) {
    return <AppShell><div className="container mx-auto py-6">Loading...</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="container mx-auto py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{classroom.name}</h1>
          {classroom.description && <p className="text-muted-foreground">{classroom.description}</p>}
          {myRole && <Badge variant="outline" className="mt-2">{myRole} access</Badge>}
        </div>

        <Tabs defaultValue="cohorts">
          <TabsList>
            <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="cohorts" className="space-y-3">
            {canEdit && (
              <div className="flex gap-2">
                <Input placeholder="New cohort" value={newCohort} onChange={(e) => setNewCohort(e.target.value)} />
                <Button onClick={addCohort}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            )}
            <div className="grid gap-2">
              {cohorts.map((c) => <Card key={c.id} className="p-3">{c.name}</Card>)}
              {cohorts.length === 0 && <p className="text-sm text-muted-foreground">No cohorts.</p>}
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-3">
            {canEdit && cohorts.length > 0 && (
              <Card className="p-3 space-y-2">
                <div className="grid sm:grid-cols-3 gap-2">
                  <Input placeholder="Title" value={schTitle} onChange={(e) => setSchTitle(e.target.value)} />
                  <Input type="datetime-local" value={schWhen} onChange={(e) => setSchWhen(e.target.value)} />
                  <select className="border rounded px-2 py-2 bg-background" value={schCohort} onChange={(e) => setSchCohort(e.target.value)}>
                    <option value="">Cohort...</option>
                    {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <Button onClick={addSchedule}><Calendar className="h-4 w-4 mr-1" />Schedule</Button>
              </Card>
            )}
            <div className="grid gap-2">
              {schedules.map((s) => (
                <Card key={s.id} className="p-3 flex justify-between">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{new Date(s.scheduled_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline">{cohorts.find((c) => c.id === s.cohort_id)?.name}</Badge>
                </Card>
              ))}
              {schedules.length === 0 && <p className="text-sm text-muted-foreground">No schedules.</p>}
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-3">
            {isTeaching && cohorts.length > 0 && (
              <Card className="p-3 space-y-2">
                <div className="flex gap-2">
                  <select className="border rounded px-2 py-2 bg-background flex-1" value={attCohort} onChange={(e) => setAttCohort(e.target.value)}>
                    <option value="">Cohort...</option>
                    {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Button onClick={generateAttendance}><ClipboardCheck className="h-4 w-4 mr-1" />Generate code</Button>
                </div>
              </Card>
            )}
            <div className="grid gap-2">
              {sessions.map((s) => (
                <Card key={s.id} className="p-3 flex justify-between">
                  <div>
                    <p className="font-mono font-bold">{s.code}</p>
                    <p className="text-xs text-muted-foreground">Opened {new Date(s.opened_at).toLocaleString()} · closes {new Date(s.closes_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline">{cohorts.find((c) => c.id === s.cohort_id)?.name}</Badge>
                </Card>
              ))}
              {sessions.length === 0 && <p className="text-sm text-muted-foreground">No attendance sessions yet.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
