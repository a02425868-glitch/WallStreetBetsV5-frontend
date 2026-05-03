-- Retire the old frontend projection layer.
-- The production frontend reads canonical backend RPCs over ticker_snapshots_15m,
-- reddit_sentiment_events, tracked_tickers, and digest tables.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'project_frontend_data_5m') THEN
      PERFORM cron.unschedule('project_frontend_data_5m');
    END IF;

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_live_data_daily') THEN
      PERFORM cron.unschedule('cleanup_live_data_daily');
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table OR insufficient_privilege THEN
    NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename IN ('trend_data', 'live_data', 'summaries')
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE
      public.trend_data,
      public.live_data,
      public.summaries;
  END IF;
EXCEPTION
  WHEN undefined_object OR undefined_table THEN
    NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_eval_notifications_on_trend_data ON public.trend_data;
DROP TRIGGER IF EXISTS set_trend_data_updated_at ON public.trend_data;
DROP TRIGGER IF EXISTS set_summaries_updated_at ON public.summaries;

DROP FUNCTION IF EXISTS public.project_frontend_data(integer);
DROP FUNCTION IF EXISTS public.cleanup_live_data_retention();
DROP FUNCTION IF EXISTS public.evaluate_notifications_for_trend_row();
DROP FUNCTION IF EXISTS public.refresh_leaderboard_mv();

DROP MATERIALIZED VIEW IF EXISTS public.leaderboard_7d_mv;

DROP TABLE IF EXISTS public.trend_data CASCADE;
DROP TABLE IF EXISTS public.live_data CASCADE;
DROP TABLE IF EXISTS public.summaries CASCADE;

COMMIT;
