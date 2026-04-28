import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function quoteSqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const trendCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const liveCutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const { data: whitelistRows, error: whitelistError } = await supabase
      .from("tickers_whitelist")
      .select("ticker");

    if (whitelistError) {
      return jsonResponse({ error: whitelistError.message }, 500);
    }

    const whitelist = (whitelistRows ?? []).map((row) => row.ticker as string).filter(Boolean);

    const cleanupResults: Record<string, unknown> = {};

    const { error: trendError } = await supabase
      .from("trend_data")
      .delete()
      .lt("timestamp", trendCutoff);

    if (trendError) {
      cleanupResults.trend_data_error = trendError.message;
    }

    const { error: liveError } = await supabase
      .from("live_data")
      .delete()
      .lt("created_at", liveCutoff);

    if (liveError) {
      cleanupResults.live_data_error = liveError.message;
    }

    if (whitelist.length === 0) {
      await supabase.from("trend_data").delete().neq("id", 0);
      await supabase.from("live_data").delete().neq("id", 0);
      await supabase.from("summaries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      const inList = `(${whitelist.map(quoteSqlLiteral).join(",")})`;
      await supabase.from("trend_data").delete().not("ticker", "in", inList);
      await supabase.from("live_data").delete().not("ticker", "in", inList);
      await supabase.from("summaries").delete().not("ticker", "in", inList);
    }

    return jsonResponse({ ok: true, trendCutoff, liveCutoff, whitelistCount: whitelist.length, ...cleanupResults });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
