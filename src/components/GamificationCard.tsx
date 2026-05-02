import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Flame, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GamificationCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    points: number;
    streak: number;
    rank: number | null;
    badges: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    if (!user) return;
    try {
      const [{ data: g }, { count: badges }] = await Promise.all([
        supabase
          .from("user_gamification")
          .select("total_points, current_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_badges")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      let rank: number | null = null;
      if (g && g.total_points > 0) {
        const { count } = await supabase
          .from("user_gamification")
          .select("*", { count: "exact", head: true })
          .gt("total_points", g.total_points)
          .eq("leaderboard_opt_in", true);
        rank = (count || 0) + 1;
      }

      setStats({
        points: g?.total_points || 0,
        streak: g?.current_streak || 0,
        rank,
        badges: badges || 0,
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!stats) return null;

  return (
    <Link to="/leaderboard">
      <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-4 grid grid-cols-4 gap-2 text-center">
          <Stat
            icon={<Trophy className="h-5 w-5 text-amber-500" />}
            value={stats.points.toLocaleString()}
            label="Points"
          />
          <Stat
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            value={stats.streak}
            label="Day streak"
          />
          <Stat
            icon={<Award className="h-5 w-5 text-primary" />}
            value={stats.badges}
            label="Badges"
          />
          <Stat
            icon={<span className="text-base font-bold text-foreground">#</span>}
            value={stats.rank ?? "—"}
            label="Rank"
          />
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-5 flex items-center justify-center">{icon}</div>
      <div className="font-bold text-base md:text-lg leading-none">{value}</div>
      <div className="text-[10px] md:text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
