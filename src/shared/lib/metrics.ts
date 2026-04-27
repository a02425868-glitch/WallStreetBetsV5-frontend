import { TrendsDataRow, TrendsMetricsRow } from '@/shared/types/database';

export interface TimeframeMetrics {
  total: number;
  bullish: number;
  bearish: number;
  neutral: number;
  ratio: number;
  aiScore: number | null;
}

export function resolveTotalMentions(row: TrendsDataRow): number {
  return (row.total_mentions ?? 0)
    || ((row.bullish_mentions ?? 0) + (row.bearish_mentions ?? 0) + (row.neutral_mentions ?? 0));
}

export function normalizeTrendRow(row: TrendsDataRow): TrendsMetricsRow | null {
  const parsed = new Date(row.timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    ...row,
    timestamp: parsed.toISOString(),
    total_mentions: resolveTotalMentions(row),
  };
}

export function calculateTimeframeMetrics(rows: TrendsDataRow[]): TimeframeMetrics {
  const total = rows.reduce((sum, row) => sum + resolveTotalMentions(row), 0);
  const bullish = rows.reduce((sum, row) => sum + (row.bullish_mentions ?? 0), 0);
  const bearish = rows.reduce((sum, row) => sum + (row.bearish_mentions ?? 0), 0);
  const neutral = rows.reduce((sum, row) => sum + (row.neutral_mentions ?? 0), 0);

  const ratio = bearish > 0 ? bullish / bearish : bullish > 0 ? bullish : 0;

  const scoredRows = rows.filter((row) => row.ai_score !== null && row.ai_score !== undefined);
  const aiScore = scoredRows.length > 0
    ? scoredRows.reduce((sum, row) => sum + (row.ai_score ?? 0), 0) / scoredRows.length
    : null;

  return { total, bullish, bearish, neutral, ratio, aiScore };
}
