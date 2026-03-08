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
            <h3 className="font-display font-semibold text-sm mb-3">Profile Information</h3>
            <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <p><span className="text-muted-foreground">First Name:</span> {profile?.first_name || "—"}</p>
              <p><span className="text-muted-foreground">Last Name:</span> {profile?.last_name || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {profile?.email || "—"}</p>
              <p><span className="text-muted-foreground">Phone:</span> {profile?.phone || "—"}</p>
              <p><span className="text-muted-foreground">Gender:</span> {profile?.gender || "—"}</p>
              <p><span className="text-muted-foreground">Date of Birth:</span> {profile?.date_of_birth || "—"}</p>
              <p><span className="text-muted-foreground">Country:</span> {profile?.country || "—"}</p>
              <p><span className="text-muted-foreground">State/Region:</span> {profile?.state_region || "—"}</p>
              <p><span className="text-muted-foreground">City/Town:</span> {profile?.city_town || "—"}</p>
              <p><span className="text-muted-foreground">Education Level:</span> {profile?.education_level || "—"}</p>
              <p><span className="text-muted-foreground">Occupation:</span> {profile?.occupation || "—"}</p>
              <p><span className="text-muted-foreground">Device Used:</span> {profile?.device_used || "—"}</p>
              <p className="sm:col-span-2"><span className="text-muted-foreground">Reason for Course:</span> {profile?.reason_for_course || "—"}</p>
            </div>
          </div>

          <EmailPreferences />
        </motion.div>
      </div>
    </AppShell>
  );
}
