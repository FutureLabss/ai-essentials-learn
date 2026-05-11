import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const token = body.token || url.searchParams.get("token");
    const peek = body.peek === true || url.searchParams.get("peek") === "1";
    if (!token) return json({ error: "missing_token" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: inv, error } = await admin.from("staff_invitations")
      .select("*, classrooms(name)")
      .eq("token", token).maybeSingle();
    if (error || !inv) return json({ error: "invitation_not_found" }, 404);
    if (inv.status !== "pending") return json({ error: `invitation_${inv.status}` }, 400);
    if (new Date(inv.expires_at) < new Date()) {
      await admin.from("staff_invitations").update({ status: "expired" }).eq("id", inv.id);
      return json({ error: "invitation_expired" }, 400);
    }

    if (peek) {
      return json({ ok: true, invitation: { email: inv.email, classroom_name: inv.classrooms?.name, staff_role: inv.staff_role } });
    }

    // Need authenticated user to accept
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return json({ error: "unauthorized" }, 401);
    if (userRes.user.email?.toLowerCase() !== inv.email.toLowerCase()) {
      return json({ error: "email_mismatch", expected: inv.email }, 403);
    }

    const role = inv.staff_role === "teaching" ? "teaching_staff" : "non_teaching_staff";

    // Add app role (idempotent)
    await admin.from("user_roles").upsert(
      { user_id: userRes.user.id, role },
      { onConflict: "user_id,role", ignoreDuplicates: true } as any
    );

    // Add staff_classrooms
    await admin.from("staff_classrooms").upsert({
      user_id: userRes.user.id,
      classroom_id: inv.classroom_id,
      staff_role: inv.staff_role,
      assigned_by: inv.invited_by,
    }, { onConflict: "user_id,classroom_id" });

    await admin.from("staff_invitations").update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    }).eq("id", inv.id);

    return json({ ok: true, classroom_id: inv.classroom_id });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
