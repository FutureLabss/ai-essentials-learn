import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUser(u.user);
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: { token, peek: true },
      });
      if (error || (data as any)?.error) setError((data as any)?.error || error?.message || "Invalid invitation");
      else setInfo((data as any).invitation);
      setLoading(false);
    })();
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    const { data, error } = await supabase.functions.invoke("accept-invitation", { body: { token } });
    setAccepting(false);
    if (error || (data as any)?.error) {
      const e = (data as any)?.error || error?.message;
      toast.error(e);
      return;
    }
    toast.success("Invitation accepted!");
    navigate(`/classroom/${(data as any).classroom_id}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-6 space-y-4">
        <h1 className="text-2xl font-bold">Classroom invitation</h1>
        {error ? (
          <>
            <p className="text-destructive">{error}</p>
            <Link to="/" className="text-primary underline text-sm">Return home</Link>
          </>
        ) : (
          <>
            <p>You've been invited to join <strong>{info?.classroom_name}</strong> as <strong>{info?.staff_role?.replace("_"," ")}</strong> staff.</p>
            <p className="text-sm text-muted-foreground">Invitation for: {info?.email}</p>
            {!user ? (
              <div className="space-y-2">
                <p className="text-sm">Sign in or create an account with <strong>{info?.email}</strong> to accept.</p>
                <div className="flex gap-2">
                  <Button asChild className="flex-1"><Link to={`/login?next=/invitation/${token}`}>Log in</Link></Button>
                  <Button asChild variant="outline" className="flex-1"><Link to={`/signup?email=${encodeURIComponent(info?.email)}&next=/invitation/${token}`}>Sign up</Link></Button>
                </div>
              </div>
            ) : user.email?.toLowerCase() !== info?.email?.toLowerCase() ? (
              <p className="text-sm text-destructive">You're signed in as {user.email}. Please sign in with {info?.email} to accept.</p>
            ) : (
              <Button onClick={accept} disabled={accepting} className="w-full">
                {accepting ? "Accepting..." : "Accept invitation"}
              </Button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
