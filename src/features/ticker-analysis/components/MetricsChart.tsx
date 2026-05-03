"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { TrendingUp, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { TrendsMetricsRow } from '@/shared/types/database';
import { MetricKey } from './MetricCheckboxes';
import { COLORS } from './TickerSelector';
import { IntervalWindow } from '@/features/ticker-analysis/hooks/useTickerMetrics';

interface MetricsChartProps {
  metricsData: Record<string, TrendsMetricsRow[]>;
  selectedTickers: string[];
  selectedMetrics: MetricKey[];
  timeWindow: IntervalWindow;
  loading: boolean;
}

const METRIC_COLORS: Record<string, string> = {
  total_mentions: '#00ff9a',
  bullish_mentions: '#4ade80',
  bearish_mentions: '#ef4444',
  neutral_mentions: '#fbbf24',
  bull_bear_ratio: '#22d3ee',
  price: '#60a5fa',
  ai_score: '#c084fc',
};

const METRIC_DISPLAY_NAMES: Record<string, string> = {
  total_mentions: 'Total Mentions',
  bullish_mentions: 'Bullish Mentions',
  bearish_mentions: 'Bearish Mentions',
  neutral_mentions: 'Neutral Mentions',
  bull_bear_ratio: 'Bull/Bear Ratio',
  price: 'Stock Price',
  ai_score: 'AI Confidence Score',
};

function formatTimestamp(ts: string, tw: IntervalWindow) {
  const d = new Date(ts);
  if (tw === '15m' || tw === '30m' || tw === '1h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (tw === '3h' || tw === '6h') {
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatTimeLabel(time: number, timeWindow: IntervalWindow): string {
  const date = new Date(time * 1000);
  
  // Adaptive formatting based on time window to match expected data density
  if (timeWindow === '15m' || timeWindow === '30m' || timeWindow === '1h') {
    // For 1-day view: show hours with time (15-min intervals)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (timeWindow === '3h' || timeWindow === '6h') {
    // For 1-week view: show date with hour (hourly intervals)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  } else {
    // For 1-month view: show just date (4-hour intervals, so just date makes sense)
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}

function getBucketMinutes(spanSeconds: number): number {
  if (spanSeconds <= 6 * 60 * 60) return 15;
  if (spanSeconds <= 24 * 60 * 60) return 30;
  if (spanSeconds <= 3 * 24 * 60 * 60) return 60;
  return 120;
}

function intervalToMinutes(interval: IntervalWindow): number {
  switch (interval) {
    case '15m':
      return 15;
    case '30m':
      return 30;
    case '1h':
      return 60;
    case '3h':
      return 180;
    case '6h':
      return 360;
    case '12h':
      return 720;
    default:
      return 15;
  }
}

function aggregateSeries(
  chartData: Array<{ timestamp: string; label: string } & Record<string, number | null | string>>,
  lineConfigs: Array<{ key: string; color: string; name: string }>,
  bucketMinutes: number
) {
  const bucketMs = bucketMinutes * 60 * 1000;
  const buckets = new Map<number, Record<string, { sum: number; count: number }>>();

  chartData.forEach((row) => {
    const tsMs = new Date(row.timestamp).getTime();
    if (isNaN(tsMs)) return;
    const bucketStart = Math.floor(tsMs / bucketMs) * bucketMs;
    const bucket = buckets.get(bucketStart) || {};

    lineConfigs.forEach((line) => {
      const val = row[line.key] as number | null;
      if (typeof val !== 'number') return;
      const entry = bucket[line.key] || { sum: 0, count: 0 };
      entry.sum += val;
      entry.count += 1;
      bucket[line.key] = entry;
    });

    buckets.set(bucketStart, bucket);
  });

  const seriesData = new Map<string, { time: number; value: number }[]>();
  const rawValuesMap = new Map<
    number,
    { timestamp: string; values: Record<string, number>; bucketMinutes: number }
  >();

  const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  sortedBuckets.forEach(([bucketStart, values]) => {
    const timeSec = Math.floor(bucketStart / 1000);
    const aggValues: Record<string, number> = {};

    lineConfigs.forEach((line) => {
      const entry = values[line.key];
      if (!entry || entry.count === 0) return;
      const avg = entry.sum / entry.count;
      if (!seriesData.has(line.key)) seriesData.set(line.key, []);
      seriesData.get(line.key)!.push({ time: timeSec, value: avg });
      aggValues[line.key] = avg;
    });

    rawValuesMap.set(timeSec, {
      timestamp: new Date(bucketStart).toISOString(),
      values: aggValues,
      bucketMinutes,
    });
  });

  return { seriesData, rawValuesMap };
}

export function MetricsChart({
  metricsData,
  selectedTickers,
  selectedMetrics,
  timeWindow,
  loading,
}: MetricsChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesMap = useRef<Map<string, any>>(new Map());
  const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set());
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const rawValuesMapRef = useRef<
    Map<number, { timestamp: string; values: Record<string, number>; bucketMinutes: number }>
  >(new Map());
  const lineConfigsRef = useRef<{ key: string; color: string; name: string }[]>([]);
  const visibleLinesRef = useRef<Set<string>>(new Set());
  const [bucketMinutes, setBucketMinutes] = useState(intervalToMinutes(timeWindow));
  const minBucketRef = useRef(intervalToMinutes(timeWindow));

  // Each line is independently scaled to 0-1 so no metric washes out another.
  // Raw values are preserved for the tooltip.
  const { chartData, lineConfigs, initialVisibleLines } = useMemo(() => {
    if (selectedTickers.length === 0 || selectedMetrics.length === 0)
      return { chartData: [], lineConfigs: [], initialVisibleLines: new Set<string>() };

    // Defensive check - make sure metricsData is valid
    if (!metricsData || typeof metricsData !== 'object') {
      return { chartData: [], lineConfigs: [], initialVisibleLines: new Set<string>() };
    }

    const timeMap = new Map<string, Record<string, number | null>>();
    const allValues = new Map<string, number[]>();

    selectedTickers.forEach(ticker => {
      const points = metricsData[ticker] || [];
      if (!Array.isArray(points)) {
        console.warn(`Invalid data for ticker ${ticker}:`, points);
        return;
      }
      
      points.forEach(p => {
        if (!p || !p.timestamp) {
          console.warn('Invalid data point:', p);
          return;
        }
        
        const key = p.timestamp;
        const existing = timeMap.get(key) || {};
        selectedMetrics.forEach(metric => {
          const lineKey = selectedTickers.length > 1 ? `${ticker}_${metric}` : metric;
          const value = p[metric as keyof TrendsMetricsRow];
          const num = typeof value === 'number' ? value : null;
          existing[lineKey] = num as number | null;
          if (num !== null) {
            if (!allValues.has(lineKey)) allValues.set(lineKey, []);
            allValues.get(lineKey)!.push(num);
          }
        });
        timeMap.set(key, existing);
      });
    });

    // Compute mean and stddev per line for z-score normalization
    const stats = new Map<string, { mean: number; std: number }>();
    allValues.forEach((vals, lineKey) => {
      if (vals.length === 0) return;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      const std = Math.sqrt(variance) || 1; // fallback to 1 if flat
      stats.set(lineKey, { mean, std });
    });

    // Z-score normalize: mean maps to 0.5, +/-2 stddev maps near 0/1.
    const sorted = Array.from(timeMap.entries())
      .map(([ts, values]) => {
        const scaled: Record<string, number> = {};
        Object.entries(values).forEach(([lineKey, val]) => {
          if (val === null || val === undefined) {
            scaled[lineKey] = null as unknown as number;
            return;
          }
          const s = stats.get(lineKey);
          if (!s) {
            scaled[lineKey] = null as unknown as number;
            return;
          }
          const z = (val - s.mean) / s.std; // z-score
          // Map z-score to 0-1 range: mean=0.5, clamped near +/-3 std.
          scaled[lineKey] = Math.max(0, Math.min(1, 0.5 + z * 0.25));
        });
        return { timestamp: ts, label: formatTimestamp(ts, timeWindow), ...scaled };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const configs: { key: string; color: string; name: string }[] = [];
    selectedTickers.forEach((ticker, tIdx) => {
      selectedMetrics.forEach(metric => {
        const key = selectedTickers.length > 1 ? `${ticker}_${metric}` : metric;
        const color = selectedTickers.length > 1
          ? COLORS[tIdx % COLORS.length]
          : METRIC_COLORS[metric];
        const displayName = METRIC_DISPLAY_NAMES[metric] || metric;
        const name = selectedTickers.length > 1 ? `${ticker} ${displayName}` : displayName;
        configs.push({ key, color, name });
      });
    });

    // Initialize only total_mentions as visible
    const initialVisible = new Set(
      configs
        .filter(c => c.key === 'total_mentions' || (selectedTickers.length > 1 && c.key.endsWith('_total_mentions')))
        .map(c => c.key)
    );

    return { chartData: sorted, lineConfigs: configs, initialVisibleLines: initialVisible };
  }, [metricsData, selectedTickers, selectedMetrics, timeWindow]);

  // Sync visible lines with new configs
  useEffect(() => {
    setVisibleLines(initialVisibleLines);
  }, [initialVisibleLines]);

  useEffect(() => {
    lineConfigsRef.current = lineConfigs;
  }, [lineConfigs]);

  useEffect(() => {
    visibleLinesRef.current = visibleLines;
  }, [visibleLines]);

  useEffect(() => {
    const minBucket = intervalToMinutes(timeWindow);
    minBucketRef.current = minBucket;
    setBucketMinutes(minBucket);
  }, [timeWindow]);

  // Reset chart view helper
  const handleResetView = useCallback(() => {
    if (chartInstance.current) {
      chartInstance.current.timeScale().fitContent();
    }
  }, []);

  // Toggle line visibility
  const handleToggleLine = useCallback((lineKey: string) => {
    setVisibleLines(prev => {
      const updated = new Set(prev);
      if (updated.has(lineKey)) {
        updated.delete(lineKey);
      } else {
        updated.add(lineKey);
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!chartRef.current || lineConfigs.length === 0) return;

    try {
      // Create chart only once (on first render after refs are ready)
      if (!chartInstance.current) {
        const chart = createChart(chartRef.current, {
          height: 320,
          layout: {
            background: { color: 'transparent' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#374151' },
            horzLines: { color: '#374151' },
          },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: { visible: false },
          timeScale: { 
            borderColor: '#374151',
            timeVisible: true,
            secondsVisible: false,
            tickMarkFormatter: (time: number) => formatTimeLabel(time, timeWindow),
          },
        });
        chartInstance.current = chart;

        // Enhanced tooltip
        const tooltipDiv = document.createElement('div');
        tooltipDiv.style.cssText = `
          position: absolute;
          display: none;
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.92), rgba(20, 20, 30, 0.92));
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 12px;
          z-index: 1000;
          pointer-events: none;
          color: #fff;
          max-width: 280px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-family: 'Courier New', monospace;
          backdrop-filter: blur(10px);
          animation: fadeIn 0.15s ease-out;
        `;
        
        // Add animation keyframes
        if (!document.getElementById('metrics-chart-animation')) {
          const style = document.createElement('style');
          style.id = 'metrics-chart-animation';
          style.textContent = `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `;
          document.head.appendChild(style);
        }
        
        chartRef.current!.appendChild(tooltipDiv);

        // Crosshair move for enhanced tooltip + hover highlight
        chart.subscribeCrosshairMove((param) => {
          if (!param.point) {
            tooltipDiv.style.display = 'none';
            setHoveredLine(null);
            return;
          }
          
          if (param.time && typeof param.time === 'number') {
            let closestTime: number | null = null;
            let minDiff = Infinity;
            let closestLineKey: string | null = null;

            rawValuesMapRef.current.forEach((_, time) => {
              const diff = Math.abs(time - Number(param.time));
              if (diff < minDiff) {
                minDiff = diff;
                closestTime = time;
              }
            });
            
            // Find closest series under cursor for hover highlight
            if (param.seriesData && param.seriesData.size > 0) {
              param.seriesData.forEach((value, series) => {
                const idx = Array.from(seriesMap.current.values()).indexOf(series);
                if (idx >= 0) {
                  const lineKey = Array.from(seriesMap.current.keys())[idx];
                  if (value && typeof value === 'object' && 'value' in value) {
                    closestLineKey = lineKey;
                  }
                }
              });
            }

            setHoveredLine(closestLineKey);
            
            if (closestTime !== null) {
              const data = rawValuesMapRef.current.get(closestTime);
              if (data) {
                const bucketMins = data.bucketMinutes ?? 15;
                const start = new Date(closestTime * 1000);
                const end = new Date(start.getTime() + bucketMins * 60 * 1000);
                const header = bucketMins > 15
                  ? `${start.toLocaleString()} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : start.toLocaleString();
                const relativeTime = formatRelativeTime(new Date(data.timestamp));
                let html = `<div style="margin-bottom: 8px; color: #d0d0d0; font-size: 11px; font-family: sans-serif;">
                  <strong style="display: block; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; margin-bottom: 2px;">${header}</strong>
                  <span style="opacity: 0.7;">${relativeTime}</span>
                </div><div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;"></div>`;

                lineConfigsRef.current.forEach(line => {
                  if (!visibleLinesRef.current.has(line.key)) return;
                  const val = data.values[line.key] ?? 0;
                  const formatted = typeof val === 'number' ? val.toFixed(2) : '-';
                  const isHovered = line.key === closestLineKey ? 'font-weight: bold; opacity: 1;' : 'opacity: 0.8;';
                  html += `<div style="color: ${line.color}; margin: 4px 0; ${isHovered}">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${line.color}; margin-right: 6px; vertical-align: middle;"></span>
                    <span>${line.name}:</span> <strong>${formatted}</strong>
                  </div>`;
                });
                
                tooltipDiv.innerHTML = html;
                tooltipDiv.style.display = 'block';
                tooltipDiv.style.left = (param.point.x ?? 0) + 10 + 'px';
                tooltipDiv.style.top = (param.point.y ?? 0) - 10 + 'px';
              }
            }
          } else {
            tooltipDiv.style.display = 'none';
            setHoveredLine(null);
          }
        });

        // Add all series (initially without data)
        lineConfigs.forEach((line) => {
          const series = chart.addLineSeries({
            color: line.color,
            lineWidth: 2,
          });
          seriesMap.current.set(line.key, series);
        });

        chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
          if (!range || typeof range.from !== 'number' || typeof range.to !== 'number') return;
          const spanSeconds = Math.max(0, range.to - range.from);
          const nextBucket = Math.max(minBucketRef.current, getBucketMinutes(spanSeconds));
          setBucketMinutes((prev) => (prev !== nextBucket ? nextBucket : prev));
        });

        const handleResize = () => {
          if (chartRef.current && chartInstance.current) {
            chartInstance.current.applyOptions({ width: chartRef.current.clientWidth });
          }
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } else {
        chartInstance.current.applyOptions({
          timeScale: {
            tickMarkFormatter: (time: number) => formatTimeLabel(time, timeWindow),
          },
        });
      }
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }, [lineConfigs, timeWindow]);

  // Update series data when time window or data changes
  useEffect(() => {
    if (!chartInstance.current || lineConfigs.length === 0 || chartData.length === 0) return;

    // Update raw values map for tooltip
    const { seriesData, rawValuesMap } = aggregateSeries(chartData, lineConfigs, bucketMinutes);
    rawValuesMapRef.current = rawValuesMap as Map<
      number,
      { timestamp: string; values: Record<string, number>; bucketMinutes: number }
    >;

    lineConfigs.forEach((line) => {
      let series = seriesMap.current.get(line.key);
      if (!series && chartInstance.current) {
        series = chartInstance.current.addLineSeries({
          color: line.color,
          lineWidth: 2,
        });
        seriesMap.current.set(line.key, series);
      }
      if (!series) return;

      const data = seriesData.get(line.key) || [];
      if (data.length > 0) {
        series.setData(data);
      }
    });

    // Fit all data in view
    chartInstance.current.timeScale().fitContent();
  }, [chartData, lineConfigs, selectedTickers, selectedMetrics, metricsData, timeWindow, bucketMinutes]);

  // Apply visibility and hover highlighting to series
  useEffect(() => {
    seriesMap.current.forEach((series, lineKey) => {
      const isVisible = visibleLines.has(lineKey);
      const isHovered = lineKey === hoveredLine;
      
      series.applyOptions({
        visible: isVisible,
        lineWidth: isHovered ? 3 : 2,
        color: isHovered && isVisible 
          ? lineConfigs.find(c => c.key === lineKey)?.color ?? '#fff'
          : lineConfigs.find(c => c.key === lineKey)?.color ?? '#fff',
      });
    });
  }, [visibleLines, hoveredLine, lineConfigs]);

  if (loading) return <Skeleton className="h-80 w-full" />;
  if (lineConfigs.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trends
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Each metric scaled independently - hover for actual values</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            className="whitespace-nowrap"
            title="Double-click chart to reset, or use this button"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>

        {/* Interactive Legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          {lineConfigs.map((line) => {
            const isVisible = visibleLines.has(line.key);
            return (
              <button
                key={line.key}
                onClick={() => handleToggleLine(line.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  isVisible
                    ? 'bg-opacity-20 hover:bg-opacity-30 border border-opacity-30 hover:border-opacity-50'
                    : 'bg-muted/20 text-muted-foreground/60 border border-muted/20 opacity-50 hover:opacity-75'
                }`}
                style={{
                  backgroundColor: isVisible ? `${line.color}20` : undefined,
                  borderColor: isVisible ? `${line.color}40` : undefined,
                  color: isVisible ? line.color : undefined,
                }}
                title={`Click to toggle "${line.name}"`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: line.color, opacity: isVisible ? 1 : 0.4 }}
                />
                {line.name}
                {isVisible ? (
                  <Eye className="h-3 w-3 ml-0.5" />
                ) : (
                  <EyeOff className="h-3 w-3 ml-0.5 opacity-50" />
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 relative">
          <div ref={chartRef} className="h-full w-full rounded-lg overflow-hidden" />
          {chartData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No data available for the selected range
            </div>
          )}
          <p className="text-xs text-muted-foreground/60 mt-2 text-center">
            Drag to pan horizontally, use legend to toggle metrics
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
