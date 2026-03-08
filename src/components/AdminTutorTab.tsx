import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff, Send, Mail } from "lucide-react";

interface Props {
  tutors: any[];
  users: any[];
  tutorSearch: string;
  setTutorSearch: (v: string) => void;
  promoteTutor: (userId: string) => void;
  demoteTutor: (userId: string) => void;
}

export default function AdminTutorTab({ tutors, users, tutorSearch, setTutorSearch, promoteTutor, demoteTutor }: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) { toast.error("Enter an email address"); return; }

    setInviting(true);
    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        // Check if already a tutor
        const isTutor = tutors.some(t => t.user_id === existing.user_id);
        if (isTutor) {
          toast.info("This user is already a tutor");
          setInviting(false);
          return;
        }
        // Promote directly
        promoteTutor(existing.user_id);
        toast.success(`${existing.first_name || email} has been made a tutor!`);
      } else {
        // Send invitation email
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: hsl(20, 90%, 48%); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: hsl(33, 100%, 96%); margin: 0; font-size: 20px;">AI Essentials</h1>
            </div>
            <div style="background: #ffffff; padding: 24px; border: 1px solid #d4d4d4; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: hsl(0, 0%, 9%); margin: 0 0 16px;">You're Invited as a Tutor!</h2>
              <p style="color: hsl(0, 0%, 9%); line-height: 1.6;">
                You've been invited to join <strong>AI Essentials</strong> as a tutor. As a tutor, you'll be able to manage courses, track learner progress, and engage with students.
              </p>
              <p style="color: hsl(0, 0%, 9%); line-height: 1.6;">
                Click the button below to create your account and get started:
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/signup" 
                   style="background: hsl(20, 90%, 48%); color: hsl(33, 100%, 96%); padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Create Your Account
                </a>
              </div>
              <p style="color: #666; font-size: 13px; line-height: 1.6;">
                Once you sign up, an admin will assign you the tutor role. If you have questions, reply to this email.
              </p>
            </div>
            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;">AI Essentials Learning Platform</p>
          </div>
        `;

        const { error } = await supabase.functions.invoke("send-email", {
          body: { to: [email], subject: "You're Invited as a Tutor — AI Essentials", html },
        });

        if (error) {
          toast.error("Failed to send invitation: " + error.message);
        } else {
          toast.success(`Invitation sent to ${email}! They'll need to sign up first, then you can promote them.`);
        }
      }

      setInviteEmail("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to process invitation");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite tutor by email */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Invite Tutor</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter an email to invite someone as a tutor. If they already have an account, they'll be promoted immediately.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="tutor@email.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleInvite()}
          />
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
            <Send className="h-4 w-4 mr-1" />
            {inviting ? "Sending…" : "Invite"}
          </Button>
        </div>
      </div>

      {/* Search existing users to promote */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search existing users to promote..."
            value={tutorSearch}
            onChange={e => setTutorSearch(e.target.value)}
          />
        </div>

        {tutorSearch && (
          <div className="rounded-lg border bg-card divide-y">
            {users
              .filter(u => {
                const q = tutorSearch.toLowerCase();
                const isTutor = tutors.some(t => t.user_id === u.user_id);
                return !isTutor && (
                  u.email?.toLowerCase().includes(q) ||
                  u.first_name?.toLowerCase().includes(q) ||
                  u.last_name?.toLowerCase().includes(q)
                );
              })
              .slice(0, 10)
              .map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{u.first_name || ""} {u.last_name || ""}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Button size="sm" onClick={() => promoteTutor(u.user_id)}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Make Tutor
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Current tutors */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Current Tutors ({tutors.length})</h3>
        <div className="rounded-lg border bg-card divide-y">
          {tutors.length === 0 && (
            <div className="py-6 text-center text-muted-foreground text-sm">No tutors assigned yet</div>
          )}
          {tutors.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t.first_name || ""} {t.last_name || ""}</p>
                <p className="text-xs text-muted-foreground">{t.email}</p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => demoteTutor(t.user_id)}>
                <ShieldOff className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
