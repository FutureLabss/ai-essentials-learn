import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Classrooms() {
  const [items, setItems] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: assigns } = await supabase
        .from("staff_classrooms")
        .select("*, classrooms(*)")
        .eq("user_id", u.user.id);
      setItems(assigns || []);
      const email = u.user.email?.toLowerCase();
      if (email) {
        const { data: inv } = await supabase
          .from("staff_invitations")
          .select("*, classrooms(name)")
          .eq("status", "pending");
        setPending(inv || []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell>
      <div className="container mx-auto py-6 space-y-6">
        <h1 className="text-2xl font-bold">My Classrooms</h1>

        {pending.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Pending invitations</h2>
            <div className="grid gap-3">
              {pending.map((i) => (
                <Card key={i.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium">{i.classrooms?.name ?? "Classroom"}</p>
                    <p className="text-sm text-muted-foreground">Invited as {i.staff_role.replace("_"," ")} staff</p>
                  </div>
                  <Link to={`/invitation/${i.token}`} className="text-primary underline text-sm">Accept</Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {loading ? <p>Loading...</p> : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No classroom assignments yet.</Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <Link key={s.id} to={`/classroom/${s.classroom_id}`}>
                <Card className="p-4 hover:bg-accent/40 h-full">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{s.classrooms?.name}</h3>
                    <Badge variant="outline">{s.staff_role}</Badge>
                  </div>
                  {s.classrooms?.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{s.classrooms.description}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
