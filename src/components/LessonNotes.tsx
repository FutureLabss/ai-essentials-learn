import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StickyNote, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface LessonNotesProps {
  lessonId: string;
}

export default function LessonNotes({ lessonId }: LessonNotesProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || !lessonId) return;
    setLoaded(false);
    loadNote();
  }, [user, lessonId]);

  const loadNote = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("lesson_notes" as any)
      .select("content")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    const noteContent = (data as any)?.content || "";
    setContent(noteContent);
    setSavedContent(noteContent);
    setLoaded(true);
    if (noteContent) setIsOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("lesson_notes" as any)
      .upsert(
        { user_id: user.id, lesson_id: lessonId, content } as any,
        { onConflict: "user_id,lesson_id" }
      );
    if (error) {
      toast.error("Failed to save note");
    } else {
      setSavedContent(content);
      toast.success("Note saved");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    await supabase
      .from("lesson_notes" as any)
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId);
    setContent("");
    setSavedContent("");
    toast.success("Note deleted");
  };

  const hasChanges = content !== savedContent;

  if (!loaded) return null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <StickyNote className="h-4 w-4 text-primary" />
        <span>My Notes</span>
        {savedContent && <span className="ml-auto text-xs text-muted-foreground">•</span>}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          <Textarea
            placeholder="Write your notes for this lesson..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Saving…" : "Save"}
            </Button>
            {savedContent && (
              <Button size="sm" variant="ghost" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
