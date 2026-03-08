import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, TicketPercent } from "lucide-react";
import { toast } from "sonner";

interface Props {
  courses: any[];
}

export default function AdminDiscountTab({ courses }: Props) {
  const [codes, setCodes] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_percent: 100,
    max_uses: "",
    course_id: "",
    expires_at: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadCodes(); }, []);

  const loadCodes = async () => {
    const { data } = await supabase
      .from("discount_codes" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setCodes((data as any[]) || []);
  };

  const handleCreate = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    setCreating(true);
    const payload: any = {
      code: form.code.toUpperCase().trim(),
      discount_percent: form.discount_percent,
      is_active: true,
    };
    if (form.max_uses) payload.max_uses = parseInt(form.max_uses);
    if (form.course_id) payload.course_id = form.course_id;
    if (form.expires_at) payload.expires_at = new Date(form.expires_at).toISOString();

    const { error } = await supabase.from("discount_codes" as any).insert(payload);
    if (error) {
      toast.error(error.message.includes("unique") ? "Code already exists" : error.message);
    } else {
      toast.success("Discount code created!");
      setShowCreate(false);
      setForm({ code: "", discount_percent: 100, max_uses: "", course_id: "", expires_at: "" });
      loadCodes();
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("discount_codes" as any).update({ is_active: active } as any).eq("id", id);
    loadCodes();
  };

  const deleteCode = async (id: string) => {
    await supabase.from("discount_codes" as any).delete().eq("id", id);
    toast.success("Code deleted");
    loadCodes();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Discount Codes ({codes.length})</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Code
        </Button>
      </div>

      <div className="rounded-lg border bg-card divide-y">
        {codes.length === 0 && (
          <div className="py-6 text-center text-muted-foreground text-sm">No discount codes yet</div>
        )}
        {codes.map((code: any) => {
          const courseName = code.course_id ? courses.find((c: any) => c.id === code.course_id)?.name : "All courses";
          const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
          const isMaxed = code.max_uses && code.current_uses >= code.max_uses;

          return (
            <div key={code.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <TicketPercent className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-mono text-sm font-bold">{code.code}</span>
                  <Badge variant={code.is_active && !isExpired && !isMaxed ? "default" : "secondary"} className="text-[10px]">
                    {!code.is_active ? "Inactive" : isExpired ? "Expired" : isMaxed ? "Maxed" : `${code.discount_percent}% off`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {courseName} · {code.current_uses}{code.max_uses ? `/${code.max_uses}` : ""} uses
                  {code.expires_at && ` · Expires ${new Date(code.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={code.is_active} onCheckedChange={(v) => toggleActive(code.id, v)} />
                <Button size="sm" variant="ghost" onClick={() => deleteCode(code.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Discount Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. WELCOME50" className="font-mono uppercase" />
            </div>
            <div>
              <Label>Discount %</Label>
              <Input type="number" min={1} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Max Uses (leave empty for unlimited)</Label>
              <Input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" />
            </div>
            <div>
              <Label>Restrict to Course (optional)</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}>
                <option value="">All courses</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Expires At (optional)</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? "Creating…" : "Create Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
