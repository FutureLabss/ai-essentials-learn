import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import * as LucideIcons from "lucide-react";
import { Lock } from "lucide-react";

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export default function BadgeGallery() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    if (!user) return;
    const [{ data: all }, { data: mine }] = await Promise.all([
      supabase.from("badges").select("*"),
      supabase.from("user_badges").select("badge_id").eq("user_id", user.id),
    ]);
    setBadges((all || []) as any);
    setEarned(new Set((mine || []).map((b: any) => b.badge_id)));
    setLoading(false);
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Badges</span>
          <span className="text-sm font-normal text-muted-foreground">
            {earned.size} / {badges.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {badges.map((b) => {
            const has = earned.has(b.id);
            const Icon = (LucideIcons as any)[b.icon] || LucideIcons.Award;
            return (
              <div
                key={b.id}
                className={`flex flex-col items-center text-center p-3 rounded-lg border transition ${
                  has
                    ? "bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30"
                    : "opacity-50 grayscale"
                }`}
                title={b.description}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center mb-1 ${
                    has ? "bg-primary/20 text-primary" : "bg-muted"
                  }`}
                >
                  {has ? (
                    <Icon className="h-5 w-5" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </div>
                <div className="text-xs font-medium leading-tight">{b.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                  {b.description}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
