import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, CheckCircle, Send, Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const linkSchema = z.string().trim().url("Please enter a valid URL").max(2000, "Link is too long");

interface AssignmentSubmissionProps {
  lessonId: string;
}

export default function AssignmentSubmission({ lessonId }: AssignmentSubmissionProps) {
  const { user } = useAuth();
  const [link, setLink] = useState("");
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSubmission();
  }, [user, lessonId]);

  const loadSubmission = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (data) {
      setSubmission(data);
      setLink(data.submission_link);
    } else {
      setSubmission(null);
      setLink("");
    }
    setEditing(false);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const result = linkSchema.safeParse(link);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    if (submission) {
      const { error } = await supabase
        .from("assignment_submissions")
        .update({ submission_link: result.data, submitted_at: new Date().toISOString(), status: "submitted" })
        .eq("id", submission.id);
      if (error) { toast.error("Failed to update submission"); setSubmitting(false); return; }
      toast.success("Assignment updated!");
    } else {
      const { error } = await supabase
        .from("assignment_submissions")
        .insert({ user_id: user.id, lesson_id: lessonId, submission_link: result.data });
      if (error) { toast.error("Failed to submit assignment"); setSubmitting(false); return; }
      toast.success("Assignment submitted!");
    }
    setSubmitting(false);
    await loadSubmission();
  };

  if (loading) return null;

  if (submission && !editing) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="h-4 w-4 text-success shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Assignment Submitted</p>
              <a
                href={submission.submission_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
              >
                {submission.submission_link}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              {submission.feedback && (
                <p className="text-xs text-muted-foreground mt-1">💬 Feedback: {submission.feedback}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-medium">📎 Submit Your Assignment</p>
      <p className="text-xs text-muted-foreground">Paste a link to your completed work (Google Docs, Drive, GitHub, etc.)</p>
      <div className="flex gap-2">
        <Input
          placeholder="https://docs.google.com/..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="flex-1 text-sm"
        />
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !link.trim()}>
          <Send className="h-3.5 w-3.5 mr-1" />
          {submitting ? "..." : submission ? "Update" : "Submit"}
        </Button>
      </div>
      {editing && (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setLink(submission.submission_link); }}>
          Cancel
        </Button>
      )}
    </div>
  );
}
