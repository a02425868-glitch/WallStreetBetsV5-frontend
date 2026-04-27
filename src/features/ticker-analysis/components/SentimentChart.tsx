"use client";

import { useEffect, useMemo, useRef } from 'react';
import { createChart, CrosshairMode, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { useHourlyStats } from '@/features/ticker-analysis/hooks/useHourlyStats';

interface SentimentChartProps {
  ticker: string;
  hours?: number;
}

export function SentimentChart({ ticker, hours = 24 }: SentimentChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const sentimentSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const mentionsSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const { data, loading } = useHourlyStats(ticker, hours);

  const seriesData = useMemo(() => {
    return data.map((row) => ({
      time: Math.floor(new Date(row.hour_bucket).getTime() / 1000) as UTCTimestamp,
      sentiment: row.avg_sentiment ?? 0,
      mentions: row.mention_count ?? 0,
    }));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || !ticker) return;

    const chart = createChart(chartRef.current, {
      height: 280,
      layout: {
        background: { color: 'transparent' },
        textColor: 'hsl(var(--muted-foreground))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--border))' },
        horzLines: { color: 'hsl(var(--border))' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: 'hsl(var(--border))' },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
        scaleMargins: { top: 0.2, bottom: 0.2 },
      },
      leftPriceScale: {
        visible: true,
        borderColor: 'hsl(var(--border))',
        scaleMargins: { top: 0.7, bottom: 0 },
      },
    });

    const mentionsSeries = chart.addHistogramSeries({
      priceScaleId: 'left',
      color: 'hsla(190, 100%, 50%, 0.35)',
      base: 0,
    });

    const sentimentSeries = chart.addLineSeries({
      color: 'hsl(160, 100%, 50%)',
      lineWidth: 2,
    });

    chartApiRef.current = chart;
    mentionsSeriesRef.current = mentionsSeries;
    sentimentSeriesRef.current = sentimentSeries;

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartApiRef.current = null;
      mentionsSeriesRef.current = null;
      sentimentSeriesRef.current = null;
    };
  }, [ticker]);

  useEffect(() => {
    if (!mentionsSeriesRef.current || !sentimentSeriesRef.current || seriesData.length === 0) return;

    mentionsSeriesRef.current.setData(seriesData.map((point) => ({
      time: point.time,
      value: point.mentions,
    })));

    sentimentSeriesRef.current.setData(seriesData.map((point) => ({
      time: point.time,
      value: point.sentiment,
    })));

    chartApiRef.current?.timeScale().fitContent();
  }, [seriesData]);

  if (loading) return <Skeleton className="h-72 w-full" />;
  if (seriesData.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Hourly Sentiment
        </CardTitle>
        <p className="text-xs text-muted-foreground">Avg sentiment (line) vs mentions (bars)</p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <div ref={chartRef} className="h-full w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
