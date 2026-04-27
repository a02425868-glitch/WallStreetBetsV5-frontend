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
    const ticker = body.ticker ? String(body.ticker) : "";
    const hours = Math.min(168, Math.max(1, Number(body.hours ?? 24)));

    if (!ticker) {
      return jsonResponse({ error: "ticker is required" }, 400);
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("trend_data")
      .select("ticker,timestamp,total_mentions,bullish_mentions,bearish_mentions,neutral_mentions,ai_score,price,volume")
      .eq("ticker", ticker)
      .gte("timestamp", since)
      .order("timestamp", { ascending: true });

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const rows = (data ?? []).map((row) => ({
      ...row,
      hour_bucket: row.timestamp,
    }));

    return jsonResponse({ data: rows });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
  }
});
