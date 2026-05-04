BEGIN;

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
    WITH runtime AS (
        SELECT
            prs.status AS runtime_status,
            prs.details AS runtime_details,
            prs.updated_at_utc AS runtime_updated_at_utc
        FROM pipeline_runtime_status prs
        WHERE prs.status_key = 'backend.runtime_health'
    )
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
        COALESCE((SELECT runtime_status FROM runtime), 'unknown'),
        COALESCE((
            SELECT runtime_details || jsonb_build_object('updated_at_utc', runtime_updated_at_utc)
            FROM runtime
        ), '{}'::jsonb)
    UNION ALL
    SELECT
        'local_storage',
        CASE WHEN EXISTS (SELECT 1 FROM runtime) THEN 'ok' ELSE 'unknown' END,
        COALESCE((
            SELECT runtime_details -> 'local_storage'
            FROM runtime
        ), '{}'::jsonb)
    UNION ALL
    SELECT
        'providers',
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM runtime) THEN 'unknown'
            WHEN COALESCE((SELECT (runtime_details ->> 'reddit_lag_s')::integer FROM runtime), 2147483647) < 3600
             AND COALESCE((SELECT (runtime_details ->> 'market_lag_s')::integer FROM runtime), 2147483647) < 86400
            THEN 'ok'
            ELSE 'warn'
        END,
        COALESCE((
            SELECT jsonb_build_object(
                'reddit_lag_s', runtime_details -> 'reddit_lag_s',
                'news_lag_s', runtime_details -> 'news_lag_s',
                'market_lag_s', runtime_details -> 'market_lag_s',
                'ai_lag_s', runtime_details -> 'ai_lag_s'
            )
            FROM runtime
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

GRANT EXECUTE ON FUNCTION public.admin_system_status() TO authenticated;

COMMIT;
