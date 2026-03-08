import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Upload, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  courses: any[];
}

export default function AdminBulkTab({ courses }: Props) {
  const [bulkCourseId, setBulkCourseId] = useState("");
  const [emailList, setEmailList] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleBulkEnroll = async () => {
    if (!bulkCourseId || !emailList.trim()) {
      toast.error("Select a course and enter emails");
      return;
    }
    setEnrolling(true);

    const emails = emailList.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    let success = 0;
    let failed = 0;

    for (const email of emails) {
      // Find user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (!profile) {
        failed++;
        continue;
      }

      const { error } = await supabase.from("enrollments").upsert(
        { user_id: profile.user_id, course_id: bulkCourseId, is_paid: true, is_unlocked: true },
        { onConflict: "user_id,course_id" }
      );

      if (error) failed++;
      else success++;
    }

    toast.success(`Enrolled ${success} learners. ${failed > 0 ? `${failed} failed.` : ""}`);
    setEmailList("");
    setEnrolling(false);
  };

  const handleCSVImport = async () => {
    if (!csvFile) { toast.error("Select a CSV file"); return; }
    setImporting(true);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").slice(1).filter(l => l.trim());
      let success = 0;
      let failed = 0;

      for (const line of lines) {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 2) { failed++; continue; }

        const [email, courseId] = cols;
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", email.toLowerCase())
          .maybeSingle();

        if (!profile) { failed++; continue; }

        const { error } = await supabase.from("enrollments").upsert(
          { user_id: profile.user_id, course_id: courseId, is_paid: true, is_unlocked: true },
          { onConflict: "user_id,course_id" }
        );

        if (error) failed++;
        else success++;
      }

      toast.success(`Imported ${success} enrollments. ${failed > 0 ? `${failed} failed.` : ""}`);
      setCsvFile(null);
    } catch (err) {
      toast.error("Failed to parse CSV");
    }
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Bulk Enroll */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Bulk Enroll
        </h3>
        <div>
          <Label>Course</Label>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            value={bulkCourseId}
            onChange={(e) => setBulkCourseId(e.target.value)}
          >
            <option value="">Select course…</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Email Addresses (one per line or comma-separated)</Label>
          <Textarea
            rows={5}
            placeholder="user1@email.com&#10;user2@email.com"
            value={emailList}
            onChange={(e) => setEmailList(e.target.value)}
            className="text-sm font-mono"
          />
        </div>
        <Button onClick={handleBulkEnroll} disabled={enrolling}>
          <Send className="h-4 w-4 mr-1" />
          {enrolling ? "Enrolling…" : "Enroll All"}
        </Button>
      </div>

      {/* CSV Import */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> CSV Import
        </h3>
        <p className="text-xs text-muted-foreground">
          Upload a CSV with columns: <code className="font-mono">email,course_id</code>. First row is treated as header.
        </p>
        <Input
          type="file"
          accept=".csv"
          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
          className="text-sm"
        />
        <Button onClick={handleCSVImport} disabled={importing || !csvFile}>
          <Upload className="h-4 w-4 mr-1" />
          {importing ? "Importing…" : "Import CSV"}
        </Button>
      </div>
    </div>
  );
}
