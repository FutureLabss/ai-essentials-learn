import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Mail, Users, Trash2 } from "lucide-react";

export default function AdminClassroomsTab() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [cohortName, setCohortName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"teaching" | "non_teaching">("teaching");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("classrooms").select("*").order("created_at", { ascending: false });
    setClassrooms(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadDetail = async (c: any) => {
    setSelected(c);
    const [{ data: co }, { data: st }, { data: inv }] = await Promise.all([
      supabase.from("cohorts").select("*").eq("classroom_id", c.id).order("created_at"),
      supabase.from("staff_classrooms").select("*").eq("classroom_id", c.id),
      supabase.from("staff_invitations").select("*").eq("classroom_id", c.id).order("created_at", { ascending: false }),
    ]);
    setCohorts(co || []);
    setInvitations(inv || []);
    if (st && st.length) {
      const ids = st.map((s) => s.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, email, first_name, last_name").in("user_id", ids);
      setStaff((st || []).map((s) => ({ ...s, profile: profs?.find((p) => p.user_id === s.user_id) })));
    } else setStaff([]);
  };

  const createClassroom = async () => {
    if (!newName.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("classrooms").insert({
      name: newName.trim(), description: newDesc.trim() || null, created_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Classroom created");
    setCreateOpen(false); setNewName(""); setNewDesc("");
    load();
  };

  const addCohort = async () => {
    if (!cohortName.trim() || !selected) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("cohorts").insert({
      classroom_id: selected.id, name: cohortName.trim(), created_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    setCohortName("");
    loadDetail(selected);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !selected) return;
    const { data, error } = await supabase.functions.invoke("invite-staff", {
      body: { email: inviteEmail.trim(), classroom_id: selected.id, staff_role: inviteRole },
    });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success("Invitation sent");
    setInviteEmail("");
    loadDetail(selected);
  };

  const removeStaff = async (id: string) => {
    if (!confirm("Remove this staff member from the classroom?")) return;
    const { error } = await supabase.from("staff_classrooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    loadDetail(selected);
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("staff_invitations").update({ status: "revoked" }).eq("id", id);
    if (error) return toast.error(error.message);
    loadDetail(selected);
  };

  if (loading) return <div className="p-6">Loading classrooms...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Classrooms</h2>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New classroom</Button>
      </div>

      {classrooms.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No classrooms yet. Create one to start inviting staff.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((c) => (
            <Card key={c.id} className="p-4 cursor-pointer hover:bg-accent/40" onClick={() => loadDetail(c)}>
              <h3 className="font-semibold">{c.name}</h3>
              {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description}</p>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New classroom</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={createClassroom}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-6">
              <section>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" />Cohorts</h4>
                <div className="flex gap-2 mb-2">
                  <Input placeholder="Cohort name" value={cohortName} onChange={(e) => setCohortName(e.target.value)} />
                  <Button onClick={addCohort}>Add</Button>
                </div>
                <ul className="space-y-1 text-sm">
                  {cohorts.map((co) => <li key={co.id} className="px-3 py-2 rounded border">{co.name}</li>)}
                  {cohorts.length === 0 && <li className="text-muted-foreground text-sm">No cohorts yet.</li>}
                </ul>
              </section>

              <section>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Mail className="h-4 w-4" />Invite staff</h4>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <Input placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                    <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teaching">Teaching</SelectItem>
                      <SelectItem value="non_teaching">Non-teaching</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={sendInvite}>Send</Button>
                </div>

                <h5 className="text-sm font-medium mt-4 mb-2">Pending invitations</h5>
                <ul className="space-y-1 text-sm">
                  {invitations.filter((i) => i.status === "pending").map((i) => (
                    <li key={i.id} className="flex items-center justify-between px-3 py-2 rounded border">
                      <span>{i.email} <Badge variant="outline" className="ml-2">{i.staff_role}</Badge></span>
                      <Button size="sm" variant="ghost" onClick={() => revokeInvite(i.id)}>Revoke</Button>
                    </li>
                  ))}
                  {invitations.filter((i) => i.status === "pending").length === 0 && (
                    <li className="text-muted-foreground text-sm">None pending.</li>
                  )}
                </ul>

                <h5 className="text-sm font-medium mt-4 mb-2">Assigned staff</h5>
                <ul className="space-y-1 text-sm">
                  {staff.map((s) => (
                    <li key={s.id} className="flex items-center justify-between px-3 py-2 rounded border">
                      <span>
                        {s.profile?.first_name} {s.profile?.last_name} {s.profile?.email && <span className="text-muted-foreground">({s.profile.email})</span>}
                        <Badge variant="outline" className="ml-2">{s.staff_role}</Badge>
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => removeStaff(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  ))}
                  {staff.length === 0 && <li className="text-muted-foreground text-sm">No staff yet.</li>}
                </ul>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
