import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = "https://ai.futurelabs.ng";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const { email, classroom_id, cohort_id, staff_role } = body;
    if (!email || !classroom_id || !["teaching","non_teaching"].includes(staff_role)) {
      return json({ error: "invalid_input" }, 400);
    }

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const { data: inv, error } = await admin.from("staff_invitations").insert({
      email: email.toLowerCase(),
      classroom_id,
      cohort_id: cohort_id || null,
      staff_role,
      token,
      invited_by: userRes.user.id,
    }).select().single();
    if (error) return json({ error: error.message }, 400);

    // Lookup classroom name
    const { data: classroom } = await admin.from("classrooms").select("name").eq("id", classroom_id).single();

    // In-app notification if user already exists
    const { data: existingProfile } = await admin
      .from("profiles").select("user_id").eq("email", email.toLowerCase()).maybeSingle();
    if (existingProfile?.user_id) {
      await admin.from("notifications").insert({
        user_id: existingProfile.user_id,
        title: "Classroom invitation",
        message: `You've been invited to join ${classroom?.name ?? "a classroom"} as ${staff_role.replace("_"," ")} staff.`,
        type: "info",
        link: `/invitation/${token}`,
      });
    }

    // Email
    const acceptUrl = `${APP_URL}/invitation/${token}`;
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "AI Essentials <noreply@ai.futurelabs.ng>",
          to: [email],
          subject: `You're invited to ${classroom?.name ?? "the classroom"}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
            <h2>Classroom Invitation</h2>
            <p>You've been invited to join <strong>${classroom?.name ?? "a classroom"}</strong> as <strong>${staff_role.replace("_"," ")} staff</strong>.</p>
            <p><a href="${acceptUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Accept invitation</a></p>
            <p style="color:#666;font-size:12px">Or paste this link: ${acceptUrl}</p>
          </div>`,
        }),
      }).catch((e) => console.error("email error", e));
    }

    return json({ ok: true, invitation: inv, accept_url: acceptUrl });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
