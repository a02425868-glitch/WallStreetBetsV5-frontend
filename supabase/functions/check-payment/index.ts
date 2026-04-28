import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = data.user;
    const body = await req.json().catch(() => ({}));
    const promoCode = body.promo_code ? String(body.promo_code).trim().toUpperCase() : "";
    const envPromoCode = (Deno.env.get("PROMO_CODE") || "").trim().toUpperCase();

    // Check if already paid
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("has_paid")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.has_paid) {
      return new Response(JSON.stringify({ has_paid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If promo code is provided, validate through RPC first.
    if (promoCode) {
      const { data: redeemed, error: redeemError } = await supabaseAdmin.rpc("redeem_promocode", {
        p_code: promoCode,
        p_user_id: user.id,
        p_email: user.email ?? "",
      });

      if (!redeemError && redeemed) {
        return new Response(JSON.stringify({ has_paid: true, promo_applied: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Backward-compatible fallback for legacy single promo code env setup.
      if (envPromoCode && promoCode === envPromoCode) {
        await supabaseAdmin
          .from("profiles")
          .upsert({ user_id: user.id, email: user.email, has_paid: true, subscription_tier: "pro" });

        return new Response(JSON.stringify({ has_paid: true, promo_applied: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ has_paid: false, error: "Invalid or expired promo code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check Stripe for completed payment when configured.
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeSecret) {
      return new Response(JSON.stringify({ has_paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length > 0) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customers.data[0].id,
        limit: 10,
      });

      const hasPaid = sessions.data.some((s: { payment_status: string }) => s.payment_status === "paid");
      if (hasPaid) {
        await supabaseAdmin
          .from("profiles")
          .update({ has_paid: true })
          .eq("user_id", user.id);

        return new Response(JSON.stringify({ has_paid: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ has_paid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
