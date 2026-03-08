import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Send, Users, User } from "lucide-react";

interface Course {
  id: string;
  name: string;
}

export default function AdminEmailTab({ courses }: { courses: Course[] }) {
  const [audience, setAudience] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [individualEmail, setIndividualEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    loadRecipientCount();
  }, [audience, selectedCourse]);

  const loadRecipientCount = async () => {
    if (audience === "individual") {
      setRecipientCount(individualEmail ? 1 : 0);
      return;
    }

    if (audience === "all") {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      setRecipientCount(count || 0);
    } else if (audience === "course" && selectedCourse) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", selectedCourse);
      setRecipientCount(enrollments?.length || 0);
    } else {
      setRecipientCount(0);
    }
  };

  const getRecipientEmails = async (): Promise<string[]> => {
    if (audience === "individual") {
      return individualEmail ? [individualEmail] : [];
    }

    let userIds: string[] = [];

    if (audience === "all") {
      const { data } = await supabase.from("profiles").select("email");
      return (data || []).map(p => p.email);
    }

    if (audience === "course" && selectedCourse) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", selectedCourse);
      userIds = (enrollments || []).map(e => e.user_id);
    }

    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("email")
      .in("user_id", userIds);

    return (profiles || []).map(p => p.email);
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }

    setSending(true);
    try {
      const emails = await getRecipientEmails();
      if (emails.length === 0) {
        toast.error("No recipients found");
        setSending(false);
        return;
      }

      // Build HTML email
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: hsl(20, 90%, 48%); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: hsl(33, 100%, 96%); margin: 0; font-size: 20px;">AI Essentials</h1>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #d4d4d4; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: hsl(0, 0%, 9%); margin: 0 0 16px;">${subject}</h2>
            <div style="color: hsl(0, 0%, 9%); line-height: 1.6; white-space: pre-wrap;">${message}</div>
          </div>
          <p style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;">AI Essentials Learning Platform</p>
        </div>
      `;

      // Resend free tier: max 2 recipients per call on test domain
      // Send individually for reliability
      const batchSize = 1;
      let sent = 0;
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: { to: batch, subject, html },
        });
        if (error) {
          console.error("Email send error:", error);
        } else {
          sent += batch.length;
        }
      }

      toast.success(`Sent to ${sent}/${emails.length} recipients`);
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Audience selector */}
      <div className="space-y-3">
        <label className="text-sm font-semibold">Recipients</label>
        <Select value={audience} onValueChange={setAudience}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-2"><Users className="h-4 w-4" /> All learners</span>
            </SelectItem>
            <SelectItem value="course">
              <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Course enrollees</span>
            </SelectItem>
            <SelectItem value="individual">
              <span className="flex items-center gap-2"><User className="h-4 w-4" /> Individual</span>
            </SelectItem>
          </SelectContent>
        </Select>

        {audience === "course" && (
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {audience === "individual" && (
          <Input
            placeholder="recipient@email.com"
            value={individualEmail}
            onChange={e => { setIndividualEmail(e.target.value); }}
          />
        )}

        <p className="text-xs text-muted-foreground">
          {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Compose */}
      <div className="space-y-3">
        <Input
          placeholder="Email subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
        <Textarea
          placeholder="Write your message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={8}
        />
      </div>

      <Button onClick={handleSend} disabled={sending || !subject || !message}>
        <Send className="h-4 w-4 mr-2" />
        {sending ? "Sending..." : "Send Email"}
      </Button>
    </div>
  );
}
