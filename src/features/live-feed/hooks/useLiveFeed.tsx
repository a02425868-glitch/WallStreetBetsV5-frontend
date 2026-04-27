"use client";

import { useState, useCallback, useEffect } from 'react';
import { fetchLiveFeed, type LiveFeedRpcRow } from '@/shared/lib/backendApi';
import type { LiveFeedRow } from '@/shared/types/database';

function mapFeedRow(row: LiveFeedRpcRow): LiveFeedRow {
  return {
    id: row.mention_id,
    timestamp: row.created_utc,
    subreddit: row.subreddit,
    post_type: row.object_type,
    text: row.body ?? row.title,
    link: row.permalink ?? row.url,
    ticker: row.ticker,
    sentiment_label: row.sentiment_label,
    sentiment_confidence: row.sentiment_confidence,
  };
}

export function useLiveFeed(tickerFilter?: string, pageSize: number = 20) {
  const [items, setItems] = useState<LiveFeedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (pageNumber: number, append: boolean) => {
    try {
      const limit = pageNumber * pageSize;
      const rows = await fetchLiveFeed({
        ticker: tickerFilter,
        limit: Math.min(1000, limit),
      });

      const mapped = rows.map(mapFeedRow);
      const pageRows = mapped.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
      setHasMore(mapped.length > pageNumber * pageSize);
      setItems((prev) => (append ? [...prev, ...pageRows] : pageRows));
    } catch (error) {
      setItems((prev) => (append ? prev : []));
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tickerFilter, pageSize]);

  const refresh = useCallback(() => {
    setLoading(true);
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setPage(nextPage);
    fetchPage(nextPage, true);
  }, [fetchPage, hasMore, loadingMore, page]);

  useEffect(() => {
    setLoading(true);
    fetchPage(1, false);
  }, [fetchPage]);

  return {
    items,
    loading,
    refetch: refresh,
    loadMore,
    hasMore,
    loadingMore,
  };
}
