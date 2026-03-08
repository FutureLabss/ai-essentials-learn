import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const serviceClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (action === "initialize" && req.method === "POST") {
      const { courseId, amount, email, callbackUrl, discountCode } = await req.json();

      // Check discount code from DB
      if (discountCode) {
        const { data: codeData } = await serviceClient
          .from("discount_codes")
          .select("*")
          .eq("code", discountCode.toUpperCase())
          .eq("is_active", true)
          .maybeSingle();

        if (codeData) {
          // Check expiry
          if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: "Discount code has expired" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Check usage limit
          if (codeData.max_uses && codeData.current_uses >= codeData.max_uses) {
            return new Response(JSON.stringify({ error: "Discount code usage limit reached" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Check course restriction
          if (codeData.course_id && codeData.course_id !== courseId) {
            return new Response(JSON.stringify({ error: "Discount code not valid for this course" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const discountPercent = codeData.discount_percent || 100;

          if (discountPercent >= 100) {
            // Full discount — unlock immediately
            await serviceClient.from("enrollments").upsert(
              { user_id: userId, course_id: courseId, is_paid: true, is_unlocked: true },
              { onConflict: "user_id,course_id" }
            );

            const ref = `DISCOUNT-${codeData.code}-${Date.now()}`;
            await supabase.from("payments").insert({
              user_id: userId,
              course_id: courseId,
              amount: 0,
              currency: "NGN",
              status: "completed",
              payment_reference: ref,
              paid_at: new Date().toISOString(),
            });

            // Increment usage
            await serviceClient.from("discount_codes").update({
              current_uses: codeData.current_uses + 1,
            }).eq("id", codeData.id);

            return new Response(JSON.stringify({ success: true, discountApplied: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } else {
            // Partial discount — reduce amount and proceed to Paystack
            const discountedAmount = Math.round(amount * (1 - discountPercent / 100));

            // Increment usage
            await serviceClient.from("discount_codes").update({
              current_uses: codeData.current_uses + 1,
            }).eq("id", codeData.id);

            // Continue with discounted amount below
            return await initializePaystack(supabase, PAYSTACK_SECRET, userId, courseId, discountedAmount, email, callbackUrl);
          }
        } else {
          return new Response(JSON.stringify({ error: "Invalid discount code" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // No discount code — full price
      return await initializePaystack(supabase, PAYSTACK_SECRET, userId, courseId, amount, email, callbackUrl);
    }

    if (action === "verify" && req.method === "POST") {
      const { reference } = await req.json();

      const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      });
      const paystackData = await paystackRes.json();

      if (paystackData.data?.status === "success") {
        await supabase.from("payments").update({
          status: "completed",
          paid_at: new Date().toISOString(),
        }).eq("payment_reference", reference);

        const { data: payment } = await supabase.from("payments").select("course_id, user_id").eq("payment_reference", reference).single();
        if (payment) {
          await serviceClient.from("enrollments").update({ is_paid: true, is_unlocked: true })
            .eq("user_id", payment.user_id).eq("course_id", payment.course_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: false, message: "Payment not verified" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function initializePaystack(supabase: any, paystackSecret: string, userId: string, courseId: string, amount: number, email: string, callbackUrl: string) {
  await supabase.from("enrollments").upsert(
    { user_id: userId, course_id: courseId },
    { onConflict: "user_id,course_id" }
  );

  const ref = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  await supabase.from("payments").insert({
    user_id: userId,
    course_id: courseId,
    amount,
    currency: "NGN",
    status: "pending",
    payment_reference: ref,
  });

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      reference: ref,
      callback_url: callbackUrl,
      metadata: { user_id: userId, course_id: courseId },
    }),
  });

  const paystackData = await paystackRes.json();
  if (!paystackData.status) {
    return new Response(JSON.stringify({ error: paystackData.message }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ authorization_url: paystackData.data.authorization_url, reference: ref }), {
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
