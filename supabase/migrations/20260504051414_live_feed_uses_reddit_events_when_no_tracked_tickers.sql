BEGIN;

CREATE OR REPLACE FUNCTION get_live_reddit_feed(
    p_limit integer DEFAULT 200,
    p_ticker text DEFAULT NULL
)
RETURNS TABLE (
    mention_id text,
    ticker text,
    object_uid text,
    object_type text,
    subreddit text,
    reddit_id text,
    parent_id text,
    author text,
    title text,
    body text,
    created_utc timestamptz,
    permalink text,
    url text,
    score integer,
    sentiment_label text,
    sentiment_confidence double precision,
    model_name text,
    model_version text,
    rationale text,
    classified_at_utc timestamptz
)
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    SELECT
        feed.mention_id,
        feed.ticker,
        feed.object_uid,
        feed.object_type,
        feed.subreddit,
        feed.reddit_id,
        feed.parent_id,
        feed.author,
        feed.title,
        feed.body,
        feed.created_utc,
        feed.permalink,
        feed.url,
        feed.score,
        feed.label AS sentiment_label,
        feed.confidence::double precision AS sentiment_confidence,
        feed.model_name,
        feed.model_version,
        feed.rationale,
        feed.classified_at_utc
    FROM reddit_sentiment_events AS feed
    WHERE p_ticker IS NULL OR feed.ticker = upper(p_ticker)
    ORDER BY feed.created_utc DESC, feed.mention_id DESC
    LIMIT GREATEST(COALESCE(p_limit, 200), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_live_reddit_feed(integer, text) TO anon, authenticated, service_role;

COMMIT;
