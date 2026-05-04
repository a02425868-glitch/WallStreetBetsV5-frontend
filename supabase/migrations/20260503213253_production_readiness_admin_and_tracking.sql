BEGIN;

CREATE TABLE IF NOT EXISTS pipeline_runtime_status (
    status_key text PRIMARY KEY,
    status text NOT NULL CHECK (status IN ('ok', 'warn', 'error', 'unknown')),
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at_utc timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE pipeline_runtime_status ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_email_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        lower(COALESCE(auth.jwt() ->> 'email', '')) = 'camjofficial@gmail.com'
        OR lower(COALESCE(auth.jwt() -> 'app_metadata' ->> 'admin', 'false')) = 'true';
$$;

DROP POLICY IF EXISTS p_pipeline_runtime_status_admin_read ON pipeline_runtime_status;
CREATE POLICY p_pipeline_runtime_status_admin_read
    ON pipeline_runtime_status
    FOR SELECT
    TO authenticated
    USING (admin_email_allowed());

GRANT SELECT ON pipeline_runtime_status TO authenticated;

DROP FUNCTION IF EXISTS public.refresh_tracked_tickers_from_events(integer, integer);
CREATE OR REPLACE FUNCTION public.refresh_tracked_tickers_from_events(
    p_threshold_24h integer DEFAULT 100,
    p_lookback_hours integer DEFAULT 24
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cutoff timestamptz;
    v_rows integer := 0;
BEGIN
    v_cutoff := NOW() - make_interval(hours => GREATEST(COALESCE(p_lookback_hours, 24), 1));

    WITH recent_mentions AS (
        SELECT
            ticker,
            COUNT(*)::integer AS mention_count
        FROM reddit_sentiment_events
        WHERE created_utc >= v_cutoff
        GROUP BY ticker
        HAVING COUNT(*) > GREATEST(COALESCE(p_threshold_24h, 100), 0)
    )
    INSERT INTO tracked_tickers (
        ticker,
        last_met_at,
        last_met_reason,
        recent_30d_mentions,
        updated_at
    )
    SELECT
        ticker,
        NOW(),
        'qualification_via_24h_mentions_gt_threshold',
        mention_count,
        NOW()
    FROM recent_mentions
    ON CONFLICT (ticker)
    DO UPDATE
    SET
        recent_30d_mentions = EXCLUDED.recent_30d_mentions,
        last_met_at = EXCLUDED.last_met_at,
        last_met_reason = EXCLUDED.last_met_reason,
        updated_at = NOW();

    DELETE FROM tracked_tickers t
    WHERE NOT EXISTS (
        SELECT 1
        FROM reddit_sentiment_events e
        WHERE e.ticker = t.ticker
          AND e.created_utc >= v_cutoff
        GROUP BY e.ticker
        HAVING COUNT(*) > GREATEST(COALESCE(p_threshold_24h, 100), 0)
    );

    SELECT COUNT(*)::integer
    INTO v_rows
    FROM tracked_tickers;

    RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION tracked_tickers(
    p_limit integer DEFAULT 200
)
RETURNS TABLE (
    ticker text,
    recent_mentions_24h integer,
    last_met_at timestamptz,
    last_met_reason text,
    updated_at_utc timestamptz
)
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    SELECT
        t.ticker,
        t.recent_30d_mentions::integer AS recent_mentions_24h,
        t.last_met_at,
        t.last_met_reason,
        t.updated_at
    FROM public.tracked_tickers t
    ORDER BY t.recent_30d_mentions DESC, t.updated_at DESC, t.ticker
    LIMIT GREATEST(COALESCE(p_limit, 200), 1);
$$;

CREATE OR REPLACE FUNCTION admin_system_status()
RETURNS TABLE (
    section text,
    status text,
    details jsonb
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT admin_email_allowed() THEN
        RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        'supabase'::text,
        'ok'::text,
        jsonb_build_object(
            'reddit_sentiment_events', (SELECT COUNT(*) FROM reddit_sentiment_events),
            'ticker_snapshots_15m', (SELECT COUNT(*) FROM ticker_snapshots_15m),
            'news_articles', (SELECT COUNT(*) FROM news_articles),
            'tracked_tickers', (SELECT COUNT(*) FROM tracked_tickers)
        )
    UNION ALL
    SELECT
        'tracked_ticker_rule',
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM tracked_tickers t
                WHERE COALESCE((
                    SELECT SUM(s.total_mentions)
                    FROM ticker_snapshots_15m s
                    WHERE s.ticker = t.ticker
                      AND s.bucket_start_utc >= NOW() - INTERVAL '24 hours'
                ), 0) <= 100
            ) THEN 'warn'
            ELSE 'ok'
        END,
        jsonb_build_object(
            'rule', '>100 mentions in trailing 24h',
            'violations', (
                SELECT COUNT(*)
                FROM tracked_tickers t
                WHERE COALESCE((
                    SELECT SUM(s.total_mentions)
                    FROM ticker_snapshots_15m s
                    WHERE s.ticker = t.ticker
                      AND s.bucket_start_utc >= NOW() - INTERVAL '24 hours'
                ), 0) <= 100
            )
        )
    UNION ALL
    SELECT
        'snapshots',
        CASE
            WHEN (
                SELECT COUNT(*)
                FROM ticker_snapshots_15m
                WHERE bucket_start_utc >= NOW() - INTERVAL '30 days'
                  AND (
                    total_mentions IS NULL OR bullish_mentions IS NULL OR bearish_mentions IS NULL
                    OR neutral_mentions IS NULL OR unclassified_mentions IS NULL
                    OR market_session_name(bucket_start_utc) = 'closed'
                  )
            ) > 0 THEN 'warn'
            ELSE 'ok'
        END,
        jsonb_build_object(
            'invalid_mention_null_rows_30d', (
                SELECT COUNT(*)
                FROM ticker_snapshots_15m
                WHERE bucket_start_utc >= NOW() - INTERVAL '30 days'
                  AND (
                    total_mentions IS NULL OR bullish_mentions IS NULL OR bearish_mentions IS NULL
                    OR neutral_mentions IS NULL OR unclassified_mentions IS NULL
                  )
            ),
            'closed_session_rows_30d', (
                SELECT COUNT(*)
                FROM ticker_snapshots_15m
                WHERE bucket_start_utc >= NOW() - INTERVAL '30 days'
                  AND market_session_name(bucket_start_utc) = 'closed'
            )
        )
    UNION ALL
    SELECT
        'runtime',
        COALESCE((
            SELECT status
            FROM pipeline_runtime_status
            WHERE status_key = 'backend.runtime_health'
        ), 'unknown'),
        COALESCE((
            SELECT details || jsonb_build_object('updated_at_utc', updated_at_utc)
            FROM pipeline_runtime_status
            WHERE status_key = 'backend.runtime_health'
        ), '{}'::jsonb)
    UNION ALL
    SELECT
        'retention',
        CASE
            WHEN (SELECT COUNT(*) FROM reddit_sentiment_events WHERE created_utc < NOW() - INTERVAL '30 days') > 0
              OR (SELECT COUNT(*) FROM news_articles WHERE published_at_utc < NOW() - INTERVAL '48 hours') > 0
            THEN 'warn'
            ELSE 'ok'
        END,
        jsonb_build_object(
            'old_reddit_rows', (SELECT COUNT(*) FROM reddit_sentiment_events WHERE created_utc < NOW() - INTERVAL '30 days'),
            'old_news_rows', (SELECT COUNT(*) FROM news_articles WHERE published_at_utc < NOW() - INTERVAL '48 hours')
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_email_allowed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_system_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_tracked_tickers_from_events(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.tracked_tickers(integer) TO anon, authenticated, service_role;

COMMIT;
