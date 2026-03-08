import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import EmailPreferences from "@/components/EmailPreferences";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading]);

  if (loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="container max-w-xl py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground text-sm mb-6">Manage your preferences</p>

          {/* Profile summary */}
          <div className="rounded-lg border bg-card p-4 mb-6">
            <h3 className="font-display font-semibold text-sm mb-2">Profile</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Name:</span> {profile?.first_name} {profile?.last_name}</p>
              <p><span className="text-muted-foreground">Email:</span> {profile?.email}</p>
            </div>
          </div>

          <EmailPreferences />
        </motion.div>
      </div>
    </AppShell>
  );
}
