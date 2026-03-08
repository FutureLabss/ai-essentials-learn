import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import EmailPreferences from "@/components/EmailPreferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const EDITABLE_FIELDS = [
  { key: "phone", label: "Phone", type: "text" },
  { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other", "Prefer not to say"] },
  { key: "date_of_birth", label: "Date of Birth", type: "date" },
  { key: "country", label: "Country", type: "text" },
  { key: "state_region", label: "State/Region", type: "text" },
  { key: "city_town", label: "City/Town", type: "text" },
  { key: "education_level", label: "Education Level", type: "select", options: ["Secondary School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Other"] },
  { key: "occupation", label: "Occupation", type: "text" },
  { key: "device_used", label: "Device Used", type: "select", options: ["Smartphone", "Laptop", "Desktop", "Tablet"] },
] as const;

const READ_ONLY_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "reason_for_course", label: "Reason for Course" },
];

export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading]);

  useEffect(() => {
    if (profile) {
      const initial: Record<string, string> = {};
      EDITABLE_FIELDS.forEach(f => {
        initial[f.key] = profile[f.key] || "";
      });
      setForm(initial);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const updates: Record<string, string | null> = {};
    EDITABLE_FIELDS.forEach(f => {
      updates[f.key] = form[f.key]?.trim() || null;
    });

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Profile updated!");
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    if (profile) {
      const initial: Record<string, string> = {};
      EDITABLE_FIELDS.forEach(f => {
        initial[f.key] = profile[f.key] || "";
      });
      setForm(initial);
    }
    setEditing(false);
  };

  if (loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="container max-w-xl py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground text-sm mb-6">Manage your preferences</p>

          <div className="rounded-lg border bg-card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm">Profile Information</h3>
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </div>

            <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {/* Read-only fields */}
              {READ_ONLY_FIELDS.map(f => (
                <p key={f.key} className={f.key === "reason_for_course" ? "sm:col-span-2" : ""}>
                  <span className="text-muted-foreground">{f.label}:</span>{" "}
                  {profile?.[f.key] || "—"}
                </p>
              ))}

              {/* Editable fields */}
              {EDITABLE_FIELDS.map(f => (
                <div key={f.key} className="space-y-1">
                  <span className="text-muted-foreground text-sm">{f.label}</span>
                  {!editing ? (
                    <p className="text-sm">{profile?.[f.key] || "—"}</p>
                  ) : f.type === "select" ? (
                    <Select value={form[f.key] || ""} onValueChange={v => setForm(prev => ({ ...prev, [f.key]: v }))}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={`Select ${f.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type}
                      value={form[f.key] || ""}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <EmailPreferences />
        </motion.div>
      </div>
    </AppShell>
  );
}
