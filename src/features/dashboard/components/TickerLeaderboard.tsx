import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardMetrics, DashboardMetrics, TimeframeMetrics } from '@/features/dashboard/hooks/useDashboardMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { ChevronUp, ChevronDown, ExternalLink, Clock, SlidersHorizontal, DollarSign } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type TimeframeKey = '1h' | '12h' | '24h' | '48h' | '7d' | '30d';
type MetricType = 'total' | 'bullish' | 'bearish' | 'neutral' | 'ratio' | 'aiScore';

interface ColumnConfig {
  id: string;
  timeframe: TimeframeKey;
  metric: MetricType;
  label: string;
}

const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: '1h', label: '1 Hour' },
  { key: '12h', label: '12 Hours' },
  { key: '24h', label: '24 Hours' },
  { key: '48h', label: '48 Hours' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
];

const METRICS: { key: MetricType; label: string }[] = [
  { key: 'total', label: 'Total Mentions' },
  { key: 'bullish', label: 'Bullish' },
  { key: 'bearish', label: 'Bearish' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'ratio', label: 'Bull/Bear Ratio' },
  { key: 'aiScore', label: 'AI Score' },
];

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: '24h-total', timeframe: '24h', metric: 'total', label: 'Total (24h)' },
  { id: '24h-bullish', timeframe: '24h', metric: 'bullish', label: 'Bullish (24h)' },
  { id: '24h-bearish', timeframe: '24h', metric: 'bearish', label: 'Bearish (24h)' },
  { id: '24h-ratio', timeframe: '24h', metric: 'ratio', label: 'Ratio (24h)' },
];

const ALL_COLUMNS: ColumnConfig[] = TIMEFRAMES.flatMap((tf) =>
  METRICS.map((m) => ({
    id: `${tf.key}-${m.key}`,
    timeframe: tf.key,
    metric: m.key,
    label: `${m.label} (${tf.label})`,
  }))
);

function getMetricValue(metrics: TimeframeMetrics, metric: MetricType): number | null {
  switch (metric) {
    case 'total':
      return metrics.total;
    case 'bullish':
      return metrics.bullish;
    case 'bearish':
      return metrics.bearish;
    case 'neutral':
      return metrics.neutral;
    case 'ratio':
      return metrics.ratio;
    case 'aiScore':
      return metrics.aiScore;
    default:
      return null;
  }
}

function getMetrics(data: DashboardMetrics, timeframe: TimeframeKey): TimeframeMetrics {
  switch (timeframe) {
    case '1h':
      return data.metrics_1h;
    case '12h':
      return data.metrics_12h;
    case '24h':
      return data.metrics_24h;
    case '48h':
      return data.metrics_48h;
    case '7d':
      return data.metrics_7d;
    case '30d':
      return data.metrics_30d;
  }
}

function formatValue(metric: MetricType, value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  if (metric === 'ratio') return value.toFixed(2);
  if (metric === 'aiScore') return value.toFixed(0);
  return value.toLocaleString();
}

function SortIcon({ field, activeField, isAsc }: { field: string; activeField: string; isAsc: boolean }) {
  const isActive = field === activeField;
  if (!isActive) {
    return <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />;
  }
  const Icon = isAsc ? ChevronUp : ChevronDown;
  return <Icon className="h-3.5 w-3.5 text-primary" />;
}

export function TickerLeaderboard() {
  const { metrics, loading, error } = useDashboardMetrics();
  const [selectedColumns, setSelectedColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortField, setSortField] = useState<string>('24h-total');
  const [sortAsc, setSortAsc] = useState(false);
  const [showPrice, setShowPrice] = useState(true);
  const [selectedTimeframeTab, setSelectedTimeframeTab] = useState<TimeframeKey>('24h');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSortValue = (item: DashboardMetrics, field: string): number => {
    const [timeframeStr, metricStr] = field.split('-');
    const timeframe = timeframeStr as TimeframeKey;
    const metric = metricStr as MetricType;
    const timeframeMetrics = getMetrics(item, timeframe);
    const value = getMetricValue(timeframeMetrics, metric);
    return value ?? 0;
  };

  const sortedData = [...metrics].sort((a, b) => {
    const aVal = getSortValue(a, sortField);
    const bVal = getSortValue(b, sortField);
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const lastUpdated = metrics.length > 0
    ? metrics.reduce((latest, item) => {
        const t = new Date(item.latestTimestamp).getTime();
        return t > latest ? t : latest;
      }, 0)
    : null;

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-destructive">
          Error loading data: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="border-b border-border/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="inline-block w-1.5 h-6 bg-primary rounded-full animate-pulse" />
              All Tickers Dashboard
            </CardTitle>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 pl-4">
                <Clock className="h-3 w-3" />
                Last updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrice(!showPrice)}
              className={cn(
                'text-xs transition-all',
                showPrice && 'border-primary text-primary'
              )}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Price
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Columns ({selectedColumns.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Add Metrics
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Pick a timeframe, then select metrics
                    </p>
                  </div>

                  {/* Timeframe Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    {TIMEFRAMES.map((tf) => (
                      <Button
                        key={tf.key}
                        variant={selectedTimeframeTab === tf.key ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 text-xs px-2.5"
                        onClick={() => setSelectedTimeframeTab(tf.key)}
                      >
                        {tf.label}
                      </Button>
                    ))}
                  </div>

                  {/* Metrics for selected timeframe */}
                  <div className="space-y-2.5 max-h-80 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {TIMEFRAMES.find((t) => t.key === selectedTimeframeTab)?.label} Metrics
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {METRICS.map((m) => {
                        const colId = `${selectedTimeframeTab}-${m.key}`;
                        const isSelected = selectedColumns.some((c) => c.id === colId);
                        return (
                          <Label key={colId} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                setSelectedColumns((prev) => {
                                  if (isSelected) {
                                    return prev.length > 1 ? prev.filter((c) => c.id !== colId) : prev;
                                  }
                                  return [
                                    ...prev,
                                    ALL_COLUMNS.find((c) => c.id === colId)!,
                                  ];
                                });
                              }}
                            />
                            <span className="truncate">{m.label}</span>
                          </Label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary of selected columns */}
                  <div className="text-[10px] text-muted-foreground border-t border-border/30 pt-2">
                    <div className="font-semibold mb-1">Selected ({selectedColumns.length}):</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedColumns.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => {
                            setSelectedColumns((prev) =>
                              prev.length > 1 ? prev.filter((c) => c.id !== col.id) : prev
                            );
                          }}
                          className="px-2 py-1 bg-primary/20 text-primary rounded text-[9px] hover:bg-primary/30 transition-colors"
                          title={`Click to remove ${col.label}`}
                        >
                          {col.label} x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-terminal">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-24 font-bold text-foreground">Ticker</TableHead>
                {showPrice && <TableHead className="w-24 font-bold text-foreground">Price</TableHead>}
                {selectedColumns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={cn(
                      'group cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap',
                      sortField === col.id && 'text-primary border-b-2 border-primary'
                    )}
                    onClick={() => handleSort(col.id)}
                  >
                    <div className="flex items-center gap-1">
                      <span title={col.label} className="truncate">
                        {col.label}
                      </span>
                      <SortIcon field={col.id} activeField={sortField} isAsc={sortAsc} />
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={selectedColumns.length + (showPrice ? 3 : 2)}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No tickers found. Data will appear once your Python pipeline processes Reddit posts.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((item, index) => (
                  <TableRow
                    key={item.ticker}
                    className="group hover:bg-primary/5 transition-all duration-200 border-border animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell className="font-mono font-bold text-foreground">
                      <Link
                        to={`/ticker/${item.ticker}`}
                        className="hover:text-primary transition-colors inline-flex items-center gap-1 group-hover:text-glow-green"
                      >
                        <span className="text-primary/50">$</span>
                        {item.ticker}
                      </Link>
                    </TableCell>
                    {showPrice && (
                      <TableCell className="font-mono text-muted-foreground">
                        {item.latestPrice != null ? `$${item.latestPrice.toFixed(2)}` : 'N/A'}
                      </TableCell>
                    )}
                    {selectedColumns.map((col) => {
                      const timeframeMetrics = getMetrics(item, col.timeframe);
                      const value = getMetricValue(timeframeMetrics, col.metric);
                      return (
                        <TableCell key={col.id} className="font-mono text-muted-foreground">
                          {formatValue(col.metric, value)}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Link to={`/ticker/${item.ticker}`} className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
