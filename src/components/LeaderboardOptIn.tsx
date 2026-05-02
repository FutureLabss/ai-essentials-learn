import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LeaderboardOptIn() {
  const { user } = useAuth();
  const [optIn, setOptIn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_gamification")
        .select("leaderboard_opt_in")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setOptIn(data.leaderboard_opt_in);
      setLoading(false);
    })();
  }, [user]);

  const toggle = async (val: boolean) => {
    if (!user) return;
    setOptIn(val);
    const { error } = await supabase
      .from("user_gamification")
      .upsert(
        { user_id: user.id, leaderboard_opt_in: val },
        { onConflict: "user_id" },
      );
    if (error) {
      toast.error("Could not update preference");
      setOptIn(!val);
    } else {
      toast.success(val ? "You're on the leaderboard" : "Hidden from leaderboard");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="lb-opt" className="text-sm font-medium">
              Show me on the leaderboard
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Your first name and last initial will be visible to other learners.
            </p>
          </div>
          <Switch
            id="lb-opt"
            checked={optIn}
            disabled={loading}
            onCheckedChange={toggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
