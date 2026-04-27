import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedTypes = new Set([
  "total_mentions",
  "bullish_mentions",
  "bearish_mentions",
  "neutral_mentions",
  "bull_bear_ratio",
  "price",
  "ai_score",
]);

function jsonResponse(body: unknown, status: number = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

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
      return jsonResponse({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const ticker = body.ticker ? String(body.ticker).toUpperCase() : "";
    const alertTypeRaw = body.type ?? body.alert_type;
    let alertType = alertTypeRaw ? String(alertTypeRaw) : "";
    const threshold = body.threshold !== undefined ? Number(body.threshold) : null;
    const direction = body.direction === "below" ? "below" : "above";

    if (alertType === "price_alert") {
      alertType = "price";
    }

    if (!ticker || !alertType || threshold === null || Number.isNaN(threshold)) {
      return jsonResponse({ error: "ticker, type, and threshold are required" }, 400);
    }

    if (!allowedTypes.has(alertType)) {
      return jsonResponse({ error: "Invalid alert type" }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userData.user.id,
        ticker,
        type: alertType,
        threshold,
        direction,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
  }
});
