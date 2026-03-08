import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { toast } from "sonner";

export default function EmailPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({
    welcome_emails: true,
    progress_emails: true,
    completion_emails: true,
    reminder_emails: true,
    announcement_emails: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadPrefs();
  }, [user]);

  const loadPrefs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_preferences" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setPrefs({
        welcome_emails: d.welcome_emails,
        progress_emails: d.progress_emails,
        completion_emails: d.completion_emails,
        reminder_emails: d.reminder_emails,
        announcement_emails: d.announcement_emails,
      });
    }
    setLoaded(true);
  };

  const updatePref = async (key: string, value: boolean) => {
    if (!user) return;
    setPrefs((prev) => ({ ...prev, [key]: value }));

    const payload = { ...prefs, [key]: value, user_id: user.id };
    const { error } = await supabase
      .from("email_preferences" as any)
      .upsert(payload as any, { onConflict: "user_id" });
    if (error) {
      toast.error("Failed to update preference");
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  };

  if (!loaded) return null;

  const items = [
    { key: "welcome_emails", label: "Welcome Emails", desc: "Receive a welcome email when you enroll in a course" },
    { key: "progress_emails", label: "Progress Updates", desc: "Get notified when you complete a week" },
    { key: "completion_emails", label: "Completion Emails", desc: "Receive congratulations when you finish a course" },
    { key: "reminder_emails", label: "Reminders", desc: "Get nudged if you haven't been active for a while" },
    { key: "announcement_emails", label: "Announcements", desc: "Receive course announcements from instructors" },
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Email Preferences</h3>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">{item.label}</Label>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={(prefs as any)[item.key]}
              onCheckedChange={(v) => updatePref(item.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
