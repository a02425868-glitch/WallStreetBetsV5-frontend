import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const notificationIdRaw = body.notification_id ?? body.ticker_alert_id;
    const notificationId = notificationIdRaw ? String(notificationIdRaw) : null;
    const ticker = body.ticker ? String(body.ticker).toUpperCase() : "";
    const type = body.type ? String(body.type) : "total_mentions";
    const threshold = body.threshold !== undefined ? Number(body.threshold) : null;
    const direction = body.direction === "below" ? "below" : "above";
    const valueRaw = body.triggered_value ?? body.value;
    const triggeredValue = valueRaw !== undefined ? Number(valueRaw) : null;

    if (!ticker) {
      return jsonResponse({ error: "ticker is required" }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from("notifications_history")
      .insert({
        user_id: userData.user.id,
        notification_id: notificationId,
        ticker,
        type,
        threshold,
        direction,
        triggered_value: Number.isNaN(triggeredValue) ? null : triggeredValue,
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
