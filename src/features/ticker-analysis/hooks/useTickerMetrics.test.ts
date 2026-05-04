import { describe, expect, it } from 'vitest';
import { getTrendSourceWindow } from './useTickerMetrics';

describe('trend source windows', () => {
  it('keeps 15m requests under the Supabase REST row cap', () => {
    expect(getTrendSourceWindow('15m')).toEqual({ sourceInterval: '15m', lookbackHours: 24 });
  });

  it('uses coarser source buckets for 30-day chart windows', () => {
    expect(getTrendSourceWindow('12h')).toEqual({ sourceInterval: '1h', lookbackHours: 720 });
  });
});
