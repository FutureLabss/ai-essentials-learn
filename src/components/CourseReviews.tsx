import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CourseReviewsProps {
  courseId: string;
  hasCompleted: boolean;
}

export default function CourseReviews({ courseId, hasCompleted }: CourseReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [myReview, setMyReview] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [courseId]);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("course_reviews" as any)
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    const items = (data as any[]) || [];
    setReviews(items);
    if (user) {
      const mine = items.find((r: any) => r.user_id === user.id);
      if (mine) {
        setMyReview(mine);
        setRating(mine.rating);
        setReviewText(mine.review || "");
      }
    }
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    const payload = { user_id: user.id, course_id: courseId, rating, review: reviewText || null };
    const { error } = await supabase
      .from("course_reviews" as any)
      .upsert(payload as any, { onConflict: "user_id,course_id" });
    if (error) {
      toast.error("Failed to submit review");
    } else {
      toast.success(myReview ? "Review updated!" : "Review submitted!");
      setShowForm(false);
      loadReviews();
    }
    setSubmitting(false);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const StarRating = ({ value, interactive = false }: { value: number; interactive?: boolean }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${(interactive ? (hoverRating || rating) : value) >= i ? "fill-primary text-primary" : "text-muted-foreground/30"} ${interactive ? "cursor-pointer" : ""}`}
          onClick={() => interactive && setRating(i)}
          onMouseEnter={() => interactive && setHoverRating(i)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        />
      ))}
    </div>
  );

  return (
    <div className="rounded-lg border bg-card p-4 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-sm">Reviews</h3>
          {avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={parseFloat(avgRating)} />
              <span className="text-xs text-muted-foreground">{avgRating} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
        {hasCompleted && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            {myReview ? "Edit Review" : "Write Review"}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-lg p-3 mb-4 space-y-3 bg-muted/20">
          <div>
            <p className="text-xs font-medium mb-1">Your Rating</p>
            <StarRating value={rating} interactive />
          </div>
          <Textarea
            placeholder="Share your experience (optional)…"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={submitting || rating === 0}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {reviews.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground">No reviews yet. {hasCompleted ? "Be the first to review!" : "Complete the course to leave a review."}</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {reviews.map((r: any) => (
            <div key={r.id} className="border-b last:border-0 pb-3 last:pb-0">
              <div className="flex items-center gap-2">
                <StarRating value={r.rating} />
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
              {r.review && <p className="text-sm mt-1 text-foreground/80">{r.review}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
