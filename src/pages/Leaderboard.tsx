import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  current_streak: number;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  rank: number;
}

type Range = "all" | "month" | "week";

function displayName(first?: string | null, last?: string | null) {
  const f = (first || "").trim();
  const l = (last || "").trim();
  if (!f && !l) return "Learner";
  if (!l) return f;
  return `${f} ${l[0]}.`;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("all");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [self, setSelf] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const load = async () => {
    setLoading(true);
    try {
      let entries: { user_id: string; points: number; streak: number }[] = [];

      if (range === "all") {
        const { data } = await supabase
          .from("user_gamification")
          .select("user_id, total_points, current_streak")
          .eq("leaderboard_opt_in", true)
          .order("total_points", { ascending: false })
          .limit(50);
        entries = (data || []).map((r) => ({
          user_id: r.user_id,
          points: r.total_points,
          streak: r.current_streak,
        }));
      } else {
        const since = new Date();
        if (range === "week") since.setDate(since.getDate() - 7);
        else since.setDate(since.getDate() - 30);

        const { data: events } = await supabase
          .from("point_events")
          .select("user_id, points, created_at")
          .gte("created_at", since.toISOString());

        const totals = new Map<string, number>();
        (events || []).forEach((e: any) => {
          totals.set(e.user_id, (totals.get(e.user_id) || 0) + e.points);
        });
        const userIds = Array.from(totals.keys());
        if (userIds.length > 0) {
          const { data: gam } = await supabase
            .from("user_gamification")
            .select("user_id, current_streak, leaderboard_opt_in")
            .in("user_id", userIds);
          const optIn = new Map(
            (gam || []).map((g: any) => [g.user_id, g]),
          );
          entries = userIds
            .filter((id) => optIn.get(id)?.leaderboard_opt_in !== false)
            .map((id) => ({
              user_id: id,
              points: totals.get(id) || 0,
              streak: optIn.get(id)?.current_streak || 0,
            }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 50);
        }
      }

      // Hydrate profiles
      const ids = entries.map((e) => e.user_id);
      let profiles: any[] = [];
      if (ids.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, avatar_url")
          .in("user_id", ids);
        profiles = p || [];
      }
      const pMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      const enriched: LeaderboardEntry[] = entries.map((e, i) => {
        const p = pMap.get(e.user_id) || {};
        return {
          user_id: e.user_id,
          total_points: e.points,
          current_streak: e.streak,
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url,
          rank: i + 1,
        };
      });
      setRows(enriched);

      // Self entry
      if (user) {
        const isInList = enriched.find((r) => r.user_id === user.id);
        if (!isInList) {
          const { data: mine } = await supabase
            .from("user_gamification")
            .select("total_points, current_streak")
            .eq("user_id", user.id)
            .maybeSingle();
          const { data: prof } = await supabase
            .from("profiles")
            .select("first_name, last_name, avatar_url")
            .eq("user_id", user.id)
            .maybeSingle();
          if (mine) {
            // Compute rank approximately
            const { count } = await supabase
              .from("user_gamification")
              .select("*", { count: "exact", head: true })
              .gt("total_points", mine.total_points)
              .eq("leaderboard_opt_in", true);
            setSelf({
              user_id: user.id,
              total_points: mine.total_points,
              current_streak: mine.current_streak,
              first_name: prof?.first_name,
              last_name: prof?.last_name,
              avatar_url: prof?.avatar_url,
              rank: (count || 0) + 1,
            });
          } else {
            setSelf(null);
          }
        } else {
          setSelf(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="container max-w-3xl py-6 md:py-10">
        <header className="mb-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-3"
          >
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Top learners on AI Essentials by FutureLabs
          </p>
        </header>

        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value={range} className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top 50</CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-4">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No activity yet. Be the first!
                  </p>
                ) : (
                  <ul className="divide-y">
                    {rows.map((r) => (
                      <Row
                        key={r.user_id}
                        entry={r}
                        isSelf={r.user_id === user?.id}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {self && (
              <Card className="mt-3 border-primary/40">
                <CardContent className="p-2">
                  <Row entry={self} isSelf />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Row({ entry, isSelf }: { entry: LeaderboardEntry; isSelf: boolean }) {
  const medal =
    entry.rank === 1
      ? "text-amber-500"
      : entry.rank === 2
      ? "text-slate-400"
      : entry.rank === 3
      ? "text-orange-600"
      : "";
  return (
    <li
      className={`flex items-center gap-3 p-2 md:p-3 rounded-lg ${
        isSelf ? "bg-primary/5" : ""
      }`}
    >
      <div className="w-8 text-center font-bold flex items-center justify-center">
        {entry.rank <= 3 ? (
          <Medal className={`h-5 w-5 ${medal}`} />
        ) : (
          <span className="text-muted-foreground text-sm">{entry.rank}</span>
        )}
      </div>
      <Avatar className="h-9 w-9">
        <AvatarImage src={entry.avatar_url || undefined} />
        <AvatarFallback>
          {(entry.first_name?.[0] || "L").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {displayName(entry.first_name, entry.last_name)}
          {isSelf && (
            <Badge variant="secondary" className="ml-2 text-xs">
              You
            </Badge>
          )}
        </div>
        {entry.current_streak > 0 && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            {entry.current_streak}-day streak
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="font-bold">{entry.total_points.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">pts</div>
      </div>
    </li>
  );
}
