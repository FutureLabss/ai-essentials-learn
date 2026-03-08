import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Trash2, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface LessonDiscussionProps {
  lessonId: string;
}

export default function LessonDiscussion({ lessonId }: LessonDiscussionProps) {
  const { user, role } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) loadComments();
  }, [lessonId, isOpen]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("lesson_discussions" as any)
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    setComments((data as any[]) || []);
  };

  const handleSubmit = async (parentId: string | null = null) => {
    if (!user) return;
    const content = parentId ? replyText.trim() : newComment.trim();
    if (!content) return;

    setSubmitting(true);
    const { error } = await supabase
      .from("lesson_discussions" as any)
      .insert({ lesson_id: lessonId, user_id: user.id, content, parent_id: parentId } as any);
    if (error) {
      toast.error("Failed to post comment");
    } else {
      if (parentId) { setReplyText(""); setReplyTo(null); }
      else setNewComment("");
      loadComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("lesson_discussions" as any).delete().eq("id", id);
    loadComments();
    toast.success("Comment deleted");
  };

  const topLevel = comments.filter((c: any) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c: any) => c.parent_id === parentId);

  return (
    <div className="rounded-lg border bg-card overflow-hidden mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <MessageCircle className="h-4 w-4 text-primary" />
        <span>Discussion</span>
        {comments.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{comments.length}</span>
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {/* New comment */}
          <div className="flex gap-2 mb-4">
            <Textarea
              placeholder="Ask a question or share your thoughts…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="text-sm resize-none flex-1"
            />
            <Button size="sm" onClick={() => handleSubmit()} disabled={submitting || !newComment.trim()} className="self-end">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Comments */}
          <div className="space-y-3">
            {topLevel.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No comments yet. Start the discussion!</p>
            ) : (
              topLevel.map((comment: any) => (
                <div key={comment.id} className="space-y-2">
                  <CommentItem
                    comment={comment}
                    canDelete={user?.id === comment.user_id || role === "admin"}
                    onDelete={() => handleDelete(comment.id)}
                    onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  />
                  {/* Replies */}
                  {getReplies(comment.id).map((reply: any) => (
                    <div key={reply.id} className="ml-6">
                      <CommentItem
                        comment={reply}
                        canDelete={user?.id === reply.user_id || role === "admin"}
                        onDelete={() => handleDelete(reply.id)}
                        isReply
                      />
                    </div>
                  ))}
                  {/* Reply form */}
                  {replyTo === comment.id && (
                    <div className="ml-6 flex gap-2">
                      <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                      <Textarea
                        placeholder="Write a reply…"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        className="text-sm resize-none flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleSubmit(comment.id)} disabled={submitting || !replyText.trim()} className="self-end">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, canDelete, onDelete, onReply, isReply }: {
  comment: any; canDelete: boolean; onDelete: () => void; onReply?: () => void; isReply?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-muted/20 p-3 ${isReply ? "border-l-2 border-primary/20" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
        </span>
        <div className="flex gap-1">
          {onReply && !isReply && (
            <button onClick={onReply} className="text-xs text-primary hover:underline">Reply</button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-foreground/90">{comment.content}</p>
    </div>
  );
}
