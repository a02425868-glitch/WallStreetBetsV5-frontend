import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version",
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
    const page = Math.max(1, Number(body.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(body.pageSize ?? 20)));
    const ticker = body.ticker ? String(body.ticker) : null;
    const sinceMinutes = Math.max(1, Number(body.sinceMinutes ?? 60));
    const sinceIso = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

    let query = supabaseAdmin
      .from("live_data")
      .select("*")
      .gte("timestamp", sinceIso)
      .order("timestamp", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (ticker) {
      query = query.eq("ticker", ticker);
    }

    const { data, error } = await query;
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ data: data ?? [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
  }
});
