"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { createChart, CrosshairMode, LineStyle, UTCTimestamp } from 'lightweight-charts';
import { TrendingUp, Zap } from 'lucide-react';
import { TrendsMetricsRow } from '@/shared/types/database';
import { IntervalWindow } from '@/features/ticker-analysis/hooks/useTickerMetrics';

type LineStyleType = 'solid' | 'dotted' | 'dashed' | 'area' | 'points' | 'markers';

interface AdvancedMetricsChartProps {
  metricsData: Record<string, TrendsMetricsRow[]>;
  selectedTickers: string[];
  timeWindow: IntervalWindow;
  loading: boolean;
}

const SENTIMENT_COLORS = {
  bullish: '#10b981',
  bearish: '#ef4444',
  neutral: '#ffd700',
  price: '#3b82f6',
  confidence: '#8b5cf6',
};

interface AggregatedPoint {
  time: UTCTimestamp;
  label: string;
  total: number;
  bullish: number;
  bearish: number;
  neutral: number;
  price: number | null;
  bullishPercentage: number | null; // 0-100 scale
  aiConfidence: number | null; // 0-100 scale
}

function getIntervalMinutes(interval: IntervalWindow | undefined): number {
  const minutes: Record<IntervalWindow, number> = {
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '3h': 180,
    '6h': 360,
    '12h': 720,
  };
  return interval ? minutes[interval] : minutes['12h'];
}

function formatBucketLabel(bucketStartMs: number) {
  return new Date(bucketStartMs).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
}

// Aggregate canonical 15-minute rows into UTC-aligned chart buckets.
function aggregateData(
  rawPoints: TrendsMetricsRow[],
  interval: IntervalWindow | undefined
): AggregatedPoint[] {
  const bucketMs = getIntervalMinutes(interval) * 60 * 1000;
  const buckets = new Map<number, TrendsMetricsRow[]>();

  for (const point of rawPoints) {
    if (!point?.timestamp) {
      continue;
    }
    const timestampMs = new Date(point.timestamp).getTime();
    if (Number.isNaN(timestampMs)) {
      continue;
    }
    const bucketStartMs = Math.floor(timestampMs / bucketMs) * bucketMs;
    const bucket = buckets.get(bucketStartMs) ?? [];
    bucket.push(point);
    buckets.set(bucketStartMs, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([bucketStartMs, bucket]) => {
    const total = bucket.reduce((sum, p) => sum + (p.total_mentions ?? 0), 0);
    const bullish = bucket.reduce((sum, p) => sum + (p.bullish_mentions ?? 0), 0);
    const bearish = bucket.reduce((sum, p) => sum + (p.bearish_mentions ?? 0), 0);
    const neutral = bucket.reduce((sum, p) => sum + (p.neutral_mentions ?? 0), 0);
    const prices = bucket.filter((p) => p.price != null).map((p) => p.price!);
    const confidences = bucket.filter((p) => p.ai_score != null).map((p) => p.ai_score!);
    const sentimentTotal = bullish + bearish;

    return {
      time: Math.floor(bucketStartMs / 1000) as UTCTimestamp,
      label: formatBucketLabel(bucketStartMs),
      total,
      bullish,
      bearish,
      neutral,
      price: prices.length > 0 ? prices.reduce((a, b) => a + b) / prices.length : null,
      bullishPercentage: sentimentTotal > 0 ? (bullish / sentimentTotal) * 100 : null,
      aiConfidence: confidences.length > 0 ? confidences.reduce((a, b) => a + b) / confidences.length : null,
    };
  });
}

export function AdvancedMetricsChart({
  metricsData,
  selectedTickers,
  timeWindow,
  loading,
}: AdvancedMetricsChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesMapRef = useRef<Map<string, any>>(new Map());
  const dataMapRef = useRef<Map<UTCTimestamp, AggregatedPoint>>(new Map());
  const visibleMetricsRef = useRef<Set<string>>(new Set(['total_mentions']));
  const dataLengthRef = useRef<number>(0); // Track data length for zoom/scroll constraints

  const [visibleMetrics, setVisibleMetrics] = useState(() => new Set(['total_mentions']));
  const [metricStyles, setMetricStyles] = useState(() => new Map<string, LineStyleType>()); // Track line style for each metric
  const [sentiment, setSentiment] = useState({ 
    direction: 'neutral' as 'bullish' | 'bearish' | 'neutral', 
    bullishCount: 0,
    bearishCount: 0,
    totalMentions: 0, 
    momentum: 'stable' as 'rising' | 'falling' | 'stable' 
  });
  // Keep a ref in sync with visibleMetrics for the tooltip handler
  useEffect(() => {
    visibleMetricsRef.current = visibleMetrics;
  }, [visibleMetrics]);

  // Aggregate data across all tickers
  const aggregatedData = useMemo(() => {
    if (selectedTickers.length === 0 || Object.keys(metricsData).length === 0) {
      return [];
    }

    // Collect ALL raw points from all selected tickers
    const allRawPoints: TrendsMetricsRow[] = [];
    selectedTickers.forEach((ticker) => {
      const points = metricsData[ticker];
      if (Array.isArray(points)) {
        allRawPoints.push(...points);
      }
    });



    // Sort by timestamp to ensure proper aggregation
    allRawPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const aggregated = aggregateData(allRawPoints, timeWindow);

    return aggregated;
  }, [metricsData, selectedTickers, timeWindow]);

  // Update sentiment
  useEffect(() => {
    if (aggregatedData.length === 0) {
      setSentiment({
        direction: 'neutral',
        bullishCount: 0,
        bearishCount: 0,
        totalMentions: 0,
        momentum: 'stable',
      });
      return;
    }
    const latest = [...aggregatedData]
      .reverse()
      .find((point) => point.bullish + point.bearish > 0)
      ?? [...aggregatedData].reverse().find((point) => point.total > 0)
      ?? aggregatedData[aggregatedData.length - 1];
    const total = latest.bullish + latest.bearish;
    
    // Calculate momentum from last 2 points
    let momentum: 'rising' | 'falling' | 'stable' = 'stable';
    if (aggregatedData.length >= 2) {
      const previous = aggregatedData[aggregatedData.length - 2];
      const change = latest.total - previous.total;
      if (change > previous.total * 0.1) momentum = 'rising';
      else if (change < -previous.total * 0.1) momentum = 'falling';
    }
    
    setSentiment({
      direction: total > 0
        ? latest.bullish > latest.bearish ? 'bullish' : latest.bearish > latest.bullish ? 'bearish' : 'neutral'
        : 'neutral',
      bullishCount: latest.bullish,
      bearishCount: latest.bearish,
      totalMentions: latest.total,
      momentum,
    });
  }, [aggregatedData]);

  // Initialize chart once on mount
  useEffect(() => {
    if (!chartRef.current || chartInstanceRef.current) {
      return;
    }

    try {


      const chart = createChart(chartRef.current, {
        height: 400,
        layout: { background: { color: 'transparent' }, textColor: '#94a3b8', fontSize: 12, fontFamily: 'system-ui' },
        grid: {
          vertLines: { color: 'transparent' },
          horzLines: { color: '#1e293b80' },
        },
        crosshair: { 
          mode: CrosshairMode.Normal, 
          vertLine: { visible: true, width: 1, color: '#0ea5e9cc', labelVisible: false } 
        },
        timeScale: {
          borderColor: '#334155',
          visible: true,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 5,
          barSpacing: 6,
          fixLeftEdge: false,
          fixRightEdge: false,
          lockVisibleTimeRangeOnResize: true,
        },
      });



      chart.priceScale('left').applyOptions({ 
        scaleMargins: { top: 0.05, bottom: 0.05 },
        autoScale: true,
        visible: false, // Hide all Y-axis labels - each line has different scale
        borderVisible: false,
      });
      chart.priceScale('right').applyOptions({ 
        scaleMargins: { top: 0.05, bottom: 0.05 },
        autoScale: true,
        visible: false, // Hide all Y-axis labels - each line has different scale
        borderVisible: false,
      });

      const timeScale = chart.timeScale();
      timeScale.fitContent();

      // Add zoom and scroll constraints
      timeScale.subscribeVisibleLogicalRangeChange((logicalRange) => {
        if (!logicalRange) return;
        
        const barsInfo = timeScale.getVisibleLogicalRange();
        if (!barsInfo) return;

        const dataLength = dataLengthRef.current;
        if (dataLength === 0) return;

        const MIN_ZOOM_BARS = 4; // Minimum 4 data points visible (about 1 hour for 15min data)
        const MAX_ZOOM_BARS = dataLength; // Maximum = all data (30 days)
        
        const currentBars = barsInfo.to - barsInfo.from;
        
        // Prevent zooming in too much
        if (currentBars < MIN_ZOOM_BARS) {
          const center = (barsInfo.from + barsInfo.to) / 2;
          timeScale.setVisibleLogicalRange({
            from: Math.max(0, center - MIN_ZOOM_BARS / 2),
            to: Math.min(dataLength - 1, center + MIN_ZOOM_BARS / 2)
          });
          return;
        }
        
        // Prevent zooming out beyond all data
        if (currentBars > MAX_ZOOM_BARS) {
          timeScale.setVisibleLogicalRange({
            from: 0,
            to: dataLength - 1
          });
          return;
        }
        
        // Prevent scrolling too far left (before first data point)
        if (barsInfo.from < 0) {
          const range = barsInfo.to - barsInfo.from;
          timeScale.setVisibleLogicalRange({
            from: 0,
            to: range
          });
          return;
        }
        
        // Prevent scrolling too far right (beyond last data point + small offset)
        const MAX_RIGHT_OFFSET = 5;
        if (barsInfo.to > dataLength - 1 + MAX_RIGHT_OFFSET) {
          const range = barsInfo.to - barsInfo.from;
          timeScale.setVisibleLogicalRange({
            from: Math.max(0, dataLength - 1 + MAX_RIGHT_OFFSET - range),
            to: dataLength - 1 + MAX_RIGHT_OFFSET
          });
          return;
        }
      });

      // Create modern floating tooltip
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: absolute; display: none; pointer-events: none; z-index: 1000;
        padding: 8px 10px; border-radius: 6px; font-size: 11px; line-height: 1.4;
        background: transparent;
        backdrop-filter: blur(16px) saturate(1.2);
        color: #f1f5f9; 
        border: none;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        font-family: system-ui, -apple-system, sans-serif;
        transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      chartRef.current.appendChild(tooltip);

      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || typeof param.time !== 'number') {
          tooltip.style.display = 'none';
          return;
        }

        const data = dataMapRef.current.get(param.time as UTCTimestamp);
        if (!data) {
          tooltip.style.display = 'none';
          return;
        }

        let html = `<div style="font-weight: 600; margin-bottom: 4px; color: #f1f5f9; font-size: 11px; padding-bottom: 3px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${data.label}</div>`;
        
        const metrics = [];
        if (visibleMetricsRef.current.has('total_mentions')) {
          metrics.push(`<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;"><span style="color: #06b6d4; font-size: 12px; filter: drop-shadow(0 0 2px rgba(6, 182, 212, 0.5));">&bull;</span><span style="color: #cbd5e1; min-width: 75px; font-size: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Total</span><span style="color: #f1f5f9; font-weight: 600; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${data.total}</span></div>`);
        }
        if (visibleMetricsRef.current.has('bullish_mentions')) {
          metrics.push(`<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;"><span style="color: ${SENTIMENT_COLORS.bullish}; font-size: 12px; filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.5));">&bull;</span><span style="color: #cbd5e1; min-width: 75px; font-size: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Bullish</span><span style="color: #f1f5f9; font-weight: 600; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${data.bullish}</span></div>`);
        }
        if (visibleMetricsRef.current.has('bearish_mentions')) {
          metrics.push(`<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;"><span style="color: ${SENTIMENT_COLORS.bearish}; font-size: 12px; filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.5));">&bull;</span><span style="color: #cbd5e1; min-width: 75px; font-size: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Bearish</span><span style="color: #f1f5f9; font-weight: 600; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${data.bearish}</span></div>`);
        }
        if (visibleMetricsRef.current.has('neutral_mentions')) {
          metrics.push(`<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;"><span style="color: ${SENTIMENT_COLORS.neutral}; font-size: 12px; filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.5));">&bull;</span><span style="color: #cbd5e1; min-width: 75px; font-size: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Neutral</span><span style="color: #f1f5f9; font-weight: 600; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${data.neutral}</span></div>`);
        }
        if (visibleMetricsRef.current.has('bullish_percentage') && data.bullishPercentage !== null) {
          metrics.push(`<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;"><span style="color: ${SENTIMENT_COLORS.confidence}; font-size: 12px; filter: drop-shadow(0 0 2px rgba(168, 85, 247, 0.5));">&bull;</span><span style="color: #cbd5e1; min-width: 75px; font-size: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Sentiment %</span><span style="color: #f1f5f9; font-weight: 600; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${data.bullishPercentage.toFixed(1)}%</span></div>`);
        }
        if (visibleMetricsRef.current.has('price') && data.price != null) {
          metrics.push(`<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;"><span style="color: ${SENTIMENT_COLORS.price}; font-size: 12px; filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));">&bull;</span><span style="color: #cbd5e1; min-width: 75px; font-size: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Price</span><span style="color: #f1f5f9; font-weight: 600; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">$${data.price.toFixed(2)}</span></div>`);
        }
        if (visibleMetricsRef.current.has('ai_score') && data.aiConfidence !== null) {
          metrics.push(`<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;"><span style="color: #f59e0b; font-size: 12px; filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0.5));">&bull;</span><span style="color: #cbd5e1; min-width: 75px; font-size: 10px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">AI Score</span><span style="color: #f1f5f9; font-weight: 600; font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${data.aiConfidence.toFixed(1)}</span></div>`);
        }
        
        html += metrics.join('');

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';

        // Smart positioning: follow cursor with dynamic bounds checking
        const rect = chartRef.current!.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let x = param.point.x + 10;
        let y = param.point.y + 10;

        // Auto-position left if near right edge
        if (x + tooltipRect.width > rect.width - 10) {
          x = param.point.x - tooltipRect.width - 10;
        }
        // Auto-position above if near bottom edge
        if (y + tooltipRect.height > rect.height - 10) {
          y = param.point.y - tooltipRect.height - 10;
        }

        tooltip.style.left = `${Math.max(5, x)}px`;
        tooltip.style.top = `${Math.max(5, y)}px`;
      });

      chart.timeScale().fitContent();
      chartInstanceRef.current = chart;



      return () => {

        chart.remove();
        tooltip.remove();
        chartInstanceRef.current = null;
      };
    } catch (error) {
      console.error('[AdvancedMetricsChart] Error creating chart:', error);
    }
  }, []);

  // Update series when data changes
  useEffect(() => {
    if (!chartInstanceRef.current || aggregatedData.length === 0) {

      return;
    }

    try {


      const chart = chartInstanceRef.current;

      // Remove old series (safely handle already-removed series)
      seriesMapRef.current.forEach((s) => {
        try {
          chart.removeSeries(s);
        } catch (e) {
          // Series already removed, ignore
        }
      });
      seriesMapRef.current.clear();
      dataMapRef.current.clear();

      // Index data by time for tooltip
      aggregatedData.forEach((d) => dataMapRef.current.set(d.time, d));
      
      // Update data length for zoom/scroll constraints
      dataLengthRef.current = aggregatedData.length;



      // Add series for visible metrics
      if (visibleMetrics.has('total_mentions')) {

        const style = metricStyles.get('total_mentions') || 'solid';
        if (style === 'area') {
          const line = chart.addAreaSeries({ 
            topColor: 'rgba(6, 182, 212, 0.3)',
            bottomColor: 'rgba(6, 182, 212, 0.05)',
            lineColor: '#06b6d4', 
            lineWidth: 2, 
            priceScaleId: 'right',
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.total })));
          seriesMapRef.current.set('total', line);
        } else if (style === 'points') {
          const line = chart.addHistogramSeries({ 
            color: 'rgba(6, 182, 212, 0.5)',
            priceScaleId: 'right',
            base: 0
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.total })));
          seriesMapRef.current.set('total', line);
        } else if (style === 'markers') {
          const line = chart.addLineSeries({ 
            color: '#06b6d4', 
            lineWidth: 0,
            priceScaleId: 'right',
            lineVisible: false,
            pointMarkersVisible: true,
            pointMarkersRadius: 3,
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.total })));
          seriesMapRef.current.set('total', line);
        } else {
          const line = chart.addLineSeries({ 
            color: '#06b6d4', 
            lineWidth: 2, 
            priceScaleId: 'right',
            lineStyle: style === 'dotted' ? LineStyle.Dotted : style === 'dashed' ? LineStyle.Dashed : LineStyle.Solid,
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.total })));
          seriesMapRef.current.set('total', line);
        }
      }

      if (visibleMetrics.has('bullish_mentions')) {

        const style = metricStyles.get('bullish_mentions') || 'solid';
        if (style === 'area') {
          const line = chart.addAreaSeries({ 
            topColor: 'rgba(16, 185, 129, 0.2)',
            bottomColor: 'rgba(16, 185, 129, 0.0)',
            lineColor: SENTIMENT_COLORS.bullish, 
            lineWidth: 2, 
            priceScaleId: 'right',
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.bullish })));
          seriesMapRef.current.set('bullish', line);
        } else if (style === 'points') {
          const line = chart.addHistogramSeries({ 
            color: 'rgba(16, 185, 129, 0.5)',
            priceScaleId: 'right',
            base: 0
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.bullish })));
          seriesMapRef.current.set('bullish', line);
        } else if (style === 'markers') {
          const line = chart.addLineSeries({ 
            color: SENTIMENT_COLORS.bullish, 
            lineWidth: 0,
            priceScaleId: 'right',
            lineVisible: false,
            pointMarkersVisible: true,
            pointMarkersRadius: 3,
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.bullish })));
          seriesMapRef.current.set('bullish', line);
        } else {
          const line = chart.addLineSeries({ 
            color: SENTIMENT_COLORS.bullish, 
            lineWidth: 2, 
            priceScaleId: 'right',
            lineStyle: style === 'dotted' ? LineStyle.Dotted : style === 'dashed' ? LineStyle.Dashed : LineStyle.Solid,
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.bullish })));
          seriesMapRef.current.set('bullish', line);
        }
      }

      if (visibleMetrics.has('bearish_mentions')) {

        const style = metricStyles.get('bearish_mentions') || 'solid';
        if (style === 'area') {
          const line = chart.addAreaSeries({ 
            topColor: 'rgba(239, 68, 68, 0.2)',
            bottomColor: 'rgba(239, 68, 68, 0.0)',
            lineColor: SENTIMENT_COLORS.bearish, 
            lineWidth: 2, 
            priceScaleId: 'right',
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.bearish })));
          seriesMapRef.current.set('bearish', line);
        } else if (style === 'points') {
          const line = chart.addHistogramSeries({ 
            color: 'rgba(239, 68, 68, 0.5)',
            priceScaleId: 'right',
            base: 0
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.bearish })));
          seriesMapRef.current.set('bearish', line);
        } else if (style === 'markers') {
          const line = chart.addLineSeries({ 
            color: SENTIMENT_COLORS.bearish, 
            lineWidth: 0,
            priceScaleId: 'right',
            lineVisible: false,
            pointMarkersVisible: true,
            pointMarkersRadius: 3,
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.bearish })));
          seriesMapRef.current.set('bearish', line);
        } else {
          const line = chart.addLineSeries({ 
            color: SENTIMENT_COLORS.bearish, 
            lineWidth: 2, 
            priceScaleId: 'right',
            lineStyle: style === 'dotted' ? LineStyle.Dotted : style === 'dashed' ? LineStyle.Dashed : LineStyle.Solid,
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.bearish })));
          seriesMapRef.current.set('bearish', line);
        }
      }

      if (visibleMetrics.has('neutral_mentions')) {

        const style = metricStyles.get('neutral_mentions') || 'solid';
        if (style === 'area') {
          const line = chart.addAreaSeries({ 
            topColor: 'rgba(255, 215, 0, 0.2)',
            bottomColor: 'rgba(255, 215, 0, 0.0)',
            lineColor: '#ffd700', 
            lineWidth: 2, 
            priceScaleId: 'right',
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.neutral })));
          seriesMapRef.current.set('neutral', line);
        } else if (style === 'points') {
          const line = chart.addHistogramSeries({ 
            color: 'rgba(255, 215, 0, 0.5)',
            priceScaleId: 'right',
            base: 0
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.neutral })));
          seriesMapRef.current.set('neutral', line);
        } else if (style === 'markers') {
          const line = chart.addLineSeries({ 
            color: '#ffd700', 
            lineWidth: 0,
            priceScaleId: 'right',
            lineVisible: false,
            pointMarkersVisible: true,
            pointMarkersRadius: 3,
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.neutral })));
          seriesMapRef.current.set('neutral', line);
        } else if (style === 'dashed' || style === 'dotted') {
          const line = chart.addLineSeries({ 
            color: '#ffd700', 
            lineWidth: 2, 
            priceScaleId: 'right',
            lineStyle: style === 'dotted' ? LineStyle.Dotted : LineStyle.Dashed,
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.neutral })));
          seriesMapRef.current.set('neutral', line);
        } else {
          const line = chart.addLineSeries({ 
            color: '#ffd700', 
            lineWidth: 2, 
            priceScaleId: 'right',
            priceLineVisible: false
          });
          line.setData(aggregatedData.map((d) => ({ time: d.time, value: d.neutral })));
          seriesMapRef.current.set('neutral', line);
        }
      }

      if (visibleMetrics.has('bullish_percentage')) {

        const style = metricStyles.get('bullish_percentage') || 'solid';
        if (style === 'area') {
          const line = chart.addAreaSeries({ 
            topColor: 'rgba(168, 85, 247, 0.2)',
            bottomColor: 'rgba(168, 85, 247, 0.0)',
            lineColor: SENTIMENT_COLORS.confidence, 
            lineWidth: 3, 
            priceScaleId: 'percentage',
            priceLineVisible: false
          });
          line.setData(aggregatedData.filter(d => d.bullishPercentage !== null).map((d) => ({ 
            time: d.time, 
            value: d.bullishPercentage! 
          })));
          seriesMapRef.current.set('bullish_percentage', line);
        } else if (style === 'points') {
          const line = chart.addHistogramSeries({ 
            color: 'rgba(168, 85, 247, 0.5)',
            priceScaleId: 'percentage',
            base: 0
          });
          line.setData(aggregatedData.filter(d => d.bullishPercentage !== null).map((d) => ({ 
            time: d.time, 
            value: d.bullishPercentage! 
          })));
          seriesMapRef.current.set('bullish_percentage', line);
        } else if (style === 'markers') {
          const line = chart.addLineSeries({ 
            color: SENTIMENT_COLORS.confidence, 
            lineWidth: 0,
            priceScaleId: 'percentage',
            lineVisible: false,
            pointMarkersVisible: true,
            pointMarkersRadius: 3,
            priceLineVisible: false
          });
          line.setData(aggregatedData.filter(d => d.bullishPercentage !== null).map((d) => ({ 
            time: d.time, 
            value: d.bullishPercentage! 
          })));
          seriesMapRef.current.set('bullish_percentage', line);
        } else {
          const line = chart.addLineSeries({ 
            color: SENTIMENT_COLORS.confidence, 
            lineWidth: 3, 
            priceScaleId: 'percentage',
            lineStyle: style === 'dotted' ? LineStyle.Dotted : style === 'dashed' ? LineStyle.Dashed : LineStyle.Solid,
            priceLineVisible: false
          });
          line.setData(aggregatedData.filter((d) => d.bullishPercentage !== null).map((d) => ({ time: d.time, value: d.bullishPercentage! })));
          seriesMapRef.current.set('bullish_percentage', line);
        }
        
        // Add 50% reference line
        const refLine = chart.addLineSeries({
          color: 'rgba(148, 163, 184, 0.3)',
          lineWidth: 1,
          priceScaleId: 'percentage',
          lineStyle: LineStyle.Dashed,
        });
        if (aggregatedData.length > 0) {
          refLine.setData([
            { time: aggregatedData[0].time, value: 50 },
            { time: aggregatedData[aggregatedData.length - 1].time, value: 50 }
          ]);
        }
        seriesMapRef.current.set('percentageRef', refLine);
        
        // Configure percentage scale after it's been created
        chart.priceScale('percentage').applyOptions({ 
          scaleMargins: { top: 0.05, bottom: 0.05 },
          autoScale: true,
          visible: false,
          borderVisible: false,
        });
      }

      if (visibleMetrics.has('price')) {

        const style = metricStyles.get('price') || 'solid';
        if (style === 'area') {
          const line = chart.addAreaSeries({ 
            topColor: 'rgba(59, 130, 246, 0.2)',
            bottomColor: 'rgba(59, 130, 246, 0.0)',
            lineColor: SENTIMENT_COLORS.price, 
            lineWidth: 2,
            priceScaleId: 'left',
            lastValueVisible: true,
            priceLineVisible: false,
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
          });
          line.setData(aggregatedData.filter((d) => d.price != null).map((d) => ({ time: d.time, value: d.price! })));
          seriesMapRef.current.set('price', line);
        } else if (style === 'points') {
          const line = chart.addHistogramSeries({ 
            color: 'rgba(59, 130, 246, 0.5)',
            priceScaleId: 'left',
            base: 0,
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
          });
          line.setData(aggregatedData.filter((d) => d.price != null).map((d) => ({ time: d.time, value: d.price! })));
          seriesMapRef.current.set('price', line);
        } else if (style === 'markers') {
          const line = chart.addLineSeries({ 
            color: SENTIMENT_COLORS.price, 
            lineWidth: 0,
            priceScaleId: 'left',
            lastValueVisible: true,
            priceLineVisible: false,
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
            lineVisible: false,
            pointMarkersVisible: true,
            pointMarkersRadius: 3
          });
          line.setData(aggregatedData.filter((d) => d.price != null).map((d) => ({ time: d.time, value: d.price! })));
          seriesMapRef.current.set('price', line);
        } else {
          const line = chart.addLineSeries({ 
            color: SENTIMENT_COLORS.price, 
            lineWidth: 2,
            priceScaleId: 'left',
            lastValueVisible: true,
            priceLineVisible: false,
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
            lineStyle: style === 'dotted' ? LineStyle.Dotted : style === 'dashed' ? LineStyle.Dashed : LineStyle.Solid
          });
          line.setData(aggregatedData.filter((d) => d.price != null).map((d) => ({ time: d.time, value: d.price! })));
          seriesMapRef.current.set('price', line);
        }
      }

      if (visibleMetrics.has('ai_score')) {

        const style = metricStyles.get('ai_score') || 'solid';
        if (style === 'area') {
          const line = chart.addAreaSeries({ 
            topColor: 'rgba(245, 158, 11, 0.2)',
            bottomColor: 'rgba(245, 158, 11, 0.0)',
            lineColor: '#f59e0b', 
            lineWidth: 2, 
            priceScaleId: 'percentage',
            priceLineVisible: false
          });
          line.setData(aggregatedData.filter(d => d.aiConfidence !== null).map((d) => ({ 
            time: d.time, 
            value: d.aiConfidence! 
          })));
          seriesMapRef.current.set('ai_score', line);
        } else if (style === 'points') {
          const line = chart.addHistogramSeries({ 
            color: 'rgba(245, 158, 11, 0.5)',
            priceScaleId: 'percentage',
            base: 0
          });
          line.setData(aggregatedData.filter(d => d.aiConfidence !== null).map((d) => ({ 
            time: d.time, 
            value: d.aiConfidence! 
          })));
          seriesMapRef.current.set('ai_score', line);
        } else if (style === 'markers') {
          const line = chart.addLineSeries({ 
            color: '#f59e0b', 
            lineWidth: 0,
            priceScaleId: 'percentage',
            lineVisible: false,
            pointMarkersVisible: true,
            pointMarkersRadius: 3,
            priceLineVisible: false
          });
          line.setData(aggregatedData.filter(d => d.aiConfidence !== null).map((d) => ({ 
            time: d.time, 
            value: d.aiConfidence! 
          })));
          seriesMapRef.current.set('ai_score', line);
        } else {
          const line = chart.addLineSeries({ 
            color: '#f59e0b', 
            lineWidth: 2, 
            priceScaleId: 'percentage',
            lineStyle: style === 'dotted' ? LineStyle.Dotted : style === 'dashed' ? LineStyle.Dashed : LineStyle.Solid,
            priceLineVisible: false
          });
          line.setData(aggregatedData.filter((d) => d.aiConfidence !== null).map((d) => ({ time: d.time, value: d.aiConfidence! })));
          seriesMapRef.current.set('ai_score', line);
        }
        
        // Configure percentage scale after it's been created
        chart.priceScale('percentage').applyOptions({ 
          scaleMargins: { top: 0.05, bottom: 0.05 },
          autoScale: true,
          visible: false,
          borderVisible: false,
        });
      }

      // Set adaptive visible range based on interval window
      const timeScale = chart.timeScale();
      
      // Force all price scales to rescale after adding series
      chart.priceScale('left').applyOptions({ autoScale: true });
      chart.priceScale('right').applyOptions({ autoScale: true });
      if (visibleMetrics.has('bullish_percentage') || visibleMetrics.has('ai_score')) {
        chart.priceScale('percentage').applyOptions({ autoScale: true });
      }
      
      let startTime = 0;
      let endTime = 0;
      
      if (aggregatedData.length > 0) {
        endTime = aggregatedData[aggregatedData.length - 1].time;
        let rangeSeconds = 24 * 60 * 60; // default 24 hours
        
        // Adaptive ranges based on interval
        switch (timeWindow) {
          case '15m':
            rangeSeconds = 6 * 60 * 60; // 6 hours
            break;
          case '30m':
            rangeSeconds = 12 * 60 * 60; // 12 hours
            break;
          case '1h':
            rangeSeconds = 24 * 60 * 60; // 24 hours
            break;
          case '3h':
            rangeSeconds = 3 * 24 * 60 * 60; // 3 days
            break;
          case '6h':
            rangeSeconds = 7 * 24 * 60 * 60; // 1 week
            break;
          case '12h':
            rangeSeconds = 14 * 24 * 60 * 60; // 2 weeks
            break;
        }
        
        startTime = endTime - rangeSeconds;
      }

      // Force chart to redraw and apply zoom after data is set
      setTimeout(() => {
        if (chartRef.current && chartInstanceRef.current) {
          const rect = chartRef.current.getBoundingClientRect();
          chartInstanceRef.current.applyOptions({ width: rect.width });
          
          // Apply zoom range after chart is fully rendered
          if (aggregatedData.length > 0 && startTime > 0) {
            chartInstanceRef.current.timeScale().setVisibleRange({ from: startTime, to: endTime });
          }
        }
      }, 50);


    } catch (error) {
      console.error('[AdvancedMetricsChart] Error updating series:', error);
    }
  }, [aggregatedData, visibleMetrics, metricStyles, timeWindow]);

  return (
    <Card className="w-full bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <CardTitle className="text-base">Sentiment Analysis</CardTitle>
              <div className="text-xs text-slate-400 mt-1">
                {selectedTickers.length === 1 ? selectedTickers[0] : `${selectedTickers.length} tickers`} at {timeWindow} intervals
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              sentiment.direction === 'bullish' ? 'bg-green-900/30 border border-green-700/50' : 
              sentiment.direction === 'bearish' ? 'bg-red-900/30 border border-red-700/50' : 
              'bg-slate-700/30 border border-slate-600/50'
            }`}>
              <Zap className={`w-4 h-4 ${
                sentiment.direction === 'bullish' ? 'text-green-400' : 
                sentiment.direction === 'bearish' ? 'text-red-400' : 
                'text-yellow-400'
              }`} />
              <span className={`text-sm font-semibold ${
                sentiment.direction === 'bullish' ? 'text-green-300' : 
                sentiment.direction === 'bearish' ? 'text-red-300' : 
                'text-yellow-200'
              }`}>
                {sentiment.direction === 'bullish' ? 'Bullish' : 
                 sentiment.direction === 'bearish' ? 'Bearish' : 
                 'Neutral'}
              </span>
              <span className="text-xs ml-1">
                (<span className={sentiment.bullishCount > sentiment.bearishCount ? 'text-green-400' : 'text-slate-400'}>
                  {sentiment.bullishCount} bullish
                </span>
                {' / '}
                <span className={sentiment.bearishCount > sentiment.bullishCount ? 'text-red-400' : 'text-slate-400'}>
                  {sentiment.bearishCount} bearish
                </span>)
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'total_mentions', label: 'Total', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.2)', border: 'rgba(6, 182, 212, 0.4)' },
            { key: 'bullish_mentions', label: 'Bullish', color: SENTIMENT_COLORS.bullish, bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)' },
            { key: 'bearish_mentions', label: 'Bearish', color: SENTIMENT_COLORS.bearish, bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)' },
            { key: 'neutral_mentions', label: 'Neutral', color: SENTIMENT_COLORS.neutral, bg: 'rgba(255, 215, 0, 0.2)', border: 'rgba(255, 215, 0, 0.4)' },
            { key: 'bullish_percentage', label: 'Sentiment %', color: SENTIMENT_COLORS.confidence, bg: 'rgba(168, 85, 247, 0.2)', border: 'rgba(168, 85, 247, 0.4)' },
            { key: 'ai_score', label: 'AI Score', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)' },
            { key: 'price', label: 'Price', color: SENTIMENT_COLORS.price, bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)' },
          ].map(({ key, label, color, bg, border }) => {
            const isActive = visibleMetrics.has(key);
            const currentStyle = metricStyles.get(key) || 'solid';
            
            const cycleStyle = () => {
              if (!isActive) return;
              const styles: LineStyleType[] = ['solid', 'dotted', 'dashed', 'area', 'points', 'markers'];
              const currentIndex = styles.indexOf(currentStyle);
              const nextStyle = styles[(currentIndex + 1) % styles.length];
              const newMap = new Map(metricStyles);
              newMap.set(key, nextStyle);
              setMetricStyles(newMap);
            };

            const getStyleIcon = () => {
              switch (currentStyle) {
                case 'solid':
                  return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  );
                case 'dotted':
                  return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray="1 2" />
                    </svg>
                  );
                case 'dashed':
                  return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
                    </svg>
                  );
                case 'area':
                  return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 12 L5 8 L8 10 L11 6 L14 9 L14 14 L2 14 Z" fill="currentColor" opacity="0.5" />
                      <path d="M2 12 L5 8 L8 10 L11 6 L14 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  );
                case 'points':
                  return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="5" width="2" height="8" fill="currentColor" />
                      <rect x="5" y="7" width="2" height="6" fill="currentColor" />
                      <rect x="8" y="4" width="2" height="9" fill="currentColor" />
                      <rect x="12" y="6" width="2" height="7" fill="currentColor" />
                    </svg>
                  );
                case 'markers':
                  return (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="3" cy="10" r="1.5" fill="currentColor" />
                      <circle cx="6" cy="6" r="1.5" fill="currentColor" />
                      <circle cx="10" cy="8" r="1.5" fill="currentColor" />
                      <circle cx="13" cy="5" r="1.5" fill="currentColor" />
                    </svg>
                  );
              }
            };

            const getStyleLabel = () => {
              switch (currentStyle) {
                case 'solid': return 'Solid line (click for dotted)';
                case 'dotted': return 'Dotted line (click for dashed)';
                case 'dashed': return 'Dashed line (click for area)';
                case 'area': return 'Area fill (click for bars)';
                case 'points': return 'Bars (click for markers)';
                case 'markers': return 'Markers only (click for solid)';
              }
            };
            
            return (
              <div key={key} className="inline-flex items-center rounded-lg overflow-hidden border transition-all duration-200"
                   style={{
                     backgroundColor: isActive ? bg : 'transparent',
                     borderColor: isActive ? border : '#475569'
                   }}>
                <button 
                  onClick={() => { 
                    const s = new Set(visibleMetrics); 
                    if (s.has(key)) {
                      s.delete(key);
                    } else {
                      s.add(key);
                    }
                    setVisibleMetrics(s); 
                  }}
                  className="px-3 py-1.5 text-xs font-semibold transition-all duration-150 hover:brightness-110"
                  style={{ 
                    color: isActive ? color : '#64748b',
                    backgroundColor: 'transparent'
                  }} 
                >
                  {label}
                </button>
                <button
                  onClick={cycleStyle}
                  disabled={!isActive}
                  className="px-2.5 py-1.5 border-l transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed hover:enabled:brightness-110 hover:enabled:scale-105"
                  style={{ 
                    borderColor: isActive ? border : '#475569',
                    color: isActive ? color : '#475569',
                    backgroundColor: 'transparent'
                  }}
                  title={isActive ? getStyleLabel() : 'Enable metric first'}
                >
                  {getStyleIcon()}
                </button>
              </div>
            );
          })}
        </div>
        {loading && <Skeleton className="h-[400px] bg-slate-800" />}
        {!loading && aggregatedData.length === 0 && (
          <div className="h-[400px] flex items-center justify-center text-slate-400">
            No data available for the selected ticker
          </div>
        )}
        <div ref={chartRef} className="relative w-full h-[400px] rounded-lg overflow-hidden bg-gradient-to-b from-slate-800/20 to-slate-900/20" style={{ display: loading || aggregatedData.length === 0 ? 'none' : 'block' }} />
      </CardContent>
    </Card>
  );
}
