import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTickerDetail } from '@/features/dashboard/hooks/useTickerData';
import { useTickerMetrics, IntervalWindow, TimeframeRange, TIMEFRAME_HOURS_BY_RANGE } from '@/features/ticker-analysis/hooks/useTickerMetrics';
import { useLiveFeed } from '@/features/live-feed/hooks/useLiveFeed';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Badge } from '@/shared/components/ui/badge';
import { SentimentChart } from '@/features/ticker-analysis/components/SentimentChart';
import { AdvancedMetricsChart } from '@/features/ticker-analysis/components/AdvancedMetricsChart';
import { TimeWindowSelector } from '@/features/ticker-analysis/components/TimeWindowSelector';
import { TimeframeSelector } from '@/features/ticker-analysis/components/TimeframeSelector';
import {
  ArrowLeft, MessageCircle, TrendingUp, Brain, Clock, Activity, Zap,
  BarChart3, Newspaper, Hash,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/shared/lib/utils';

export default function TickerDetail() {
  const params = useParams<{ ticker: string }>();
  const ticker = params?.ticker || '';
  const { data, loading, error } = useTickerDetail(ticker);
  const [intervalWindow, setIntervalWindow] = useState<IntervalWindow>('12h');
  const [timeframeRange, setTimeframeRange] = useState<TimeframeRange>('7d');

  const { data: metricsData, loading: metricsLoading } = useTickerMetrics(
    ticker ? [ticker] : [], intervalWindow
  );
  const { items: feedItems, loading: feedLoading } = useLiveFeed(ticker);

  // Calculate aggregated metrics from the selected timeframe - MUST be before any returns
  const timeframeMetrics = useMemo(() => {
    let tickerData = metricsData[ticker] || [];
    
    // Filter data by timeframe range
    const timeframeHours = TIMEFRAME_HOURS_BY_RANGE[timeframeRange];
    const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    tickerData = tickerData.filter(row => new Date(row.timestamp) >= cutoffTime);
    
    if (tickerData.length === 0) {
      return {
        totalMentions: 0,
        bullishMentions: 0,
        bearishMentions: 0,
        neutralMentions: 0,
        sentimentPercentage: 50,
        aiConfidence: 0,
      };
    }

    const totalMentions = tickerData.reduce((sum, row) => sum + (row.total_mentions ?? 0), 0);
    const bullishMentions = tickerData.reduce((sum, row) => sum + (row.bullish_mentions ?? 0), 0);
    const bearishMentions = tickerData.reduce((sum, row) => sum + (row.bearish_mentions ?? 0), 0);
    const neutralMentions = tickerData.reduce((sum, row) => sum + (row.neutral_mentions ?? 0), 0);
    
    const sentimentTotal = bullishMentions + bearishMentions;
    const sentimentPercentage = sentimentTotal > 0 ? (bullishMentions / sentimentTotal) * 100 : 50;
    
    // Average AI confidence
    const validScores = tickerData.filter(row => row.ai_score != null);
    const aiConfidence = validScores.length > 0 
      ? validScores.reduce((sum, row) => sum + (row.ai_score ?? 0), 0) / validScores.length 
      : 0;

    return {
      totalMentions,
      bullishMentions,
      bearishMentions,
      neutralMentions,
      sentimentPercentage,
      aiConfidence,
    };
  }, [metricsData, ticker, timeframeRange]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            {error || `No data found for $${ticker}`}
          </p>
          <Link to="/" className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const bullBearRatio = Number(data.bull_bear_ratio ?? 0);
  const isBullish = bullBearRatio >= 1;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground transition-all duration-200 p-2 rounded-lg hover:bg-muted/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl lg:text-4xl font-mono font-bold text-primary text-glow-green">
                <span className="text-primary/50">$</span>{ticker}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last update: {formatDistanceToNow(new Date(), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe Selector - Above stat cards */}
        <div className="flex justify-start">
          <TimeframeSelector value={timeframeRange} onChange={setTimeframeRange} />
        </div>

        {/* Key Metrics Grid - 6 columns */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <StatCard label="Total Mentions" value={timeframeMetrics.totalMentions} icon={MessageCircle} />
          <StatCard label="Bullish" value={timeframeMetrics.bullishMentions} icon={TrendingUp} color="text-terminal-green" />
          <StatCard label="Bearish" value={timeframeMetrics.bearishMentions} icon={TrendingUp} color="text-terminal-red" />
          <StatCard label="Neutral" value={timeframeMetrics.neutralMentions} icon={BarChart3} color="text-terminal-yellow" />
          <StatCard label="Sentiment" value={`${timeframeMetrics.sentimentPercentage.toFixed(0)}%`} icon={Zap} color="text-terminal-cyan" />
          <StatCard label="AI Confidence" value={`${timeframeMetrics.aiConfidence.toFixed(0)}%`} icon={Brain} color="text-terminal-purple" />
        </div>

        {/* Stock Price (if available) */}
        {data.price && (
          <Card className="bg-card border-border animate-fade-in" style={{ animationDelay: '75ms' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Current Stock Price</p>
                <p className="text-2xl font-mono font-bold text-foreground mt-2">${data.price.toFixed(2)}</p>
              </div>
              <Activity className="h-6 w-6 text-terminal-cyan opacity-40" />
            </CardContent>
          </Card>
        )}

        {/* Trend Analysis Chart with Interval Selector */}
        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trend Analysis
            </h2>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Interval:</p>
              <TimeWindowSelector value={intervalWindow} onChange={setIntervalWindow} />
            </div>
          </div>
          <AdvancedMetricsChart
            metricsData={metricsData}
            selectedTickers={ticker ? [ticker] : []}
            timeWindow={intervalWindow}
            loading={metricsLoading}
          />
        </div>

        {/* Hourly Sentiment */}
        <div className="animate-fade-in" style={{ animationDelay: '125ms' }}>
          <SentimentChart ticker={ticker} hours={48} />
        </div>

        {/* Summaries - Side by Side */}
        <div className="grid gap-4 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-terminal-orange" />
                  Reddit Summary
                </span>
                {data.reddit_updated_at && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {formatDistanceToNow(new Date(data.reddit_updated_at), { addSuffix: true })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data.reddit_summary ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {data.reddit_summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic text-center py-8">
                  No Reddit summary available yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-terminal-cyan" />
                  News Summary
                </span>
                {data.news_updated_at && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {formatDistanceToNow(new Date(data.news_updated_at), { addSuffix: true })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data.news_summary ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {data.news_summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic text-center py-8">
                  No news summary available yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Feed */}
        <Card className="bg-card border-border animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary animate-pulse" />
              Live Feed â€” ${ticker}
              <div className="w-2 h-2 rounded-full bg-terminal-green animate-pulse shadow-lg shadow-terminal-green/30 ml-1" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80 px-4 pb-4">
              {feedLoading ? (
                <div className="space-y-3 pt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : feedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent activity for ${ticker}
                </div>
              ) : (
                <div className="space-y-2 pt-4">
                  {feedItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-border font-mono">
                            {item.post_type}
                          </Badge>
                          <span className="text-xs text-terminal-orange">r/{item.subreddit}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap opacity-70">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 hover:text-foreground/80 transition-colors">
                        {item.text?.slice(0, 150) || 'No content'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-foreground',
}: {
  label: string;
  value: string | number;
  icon: typeof MessageCircle;
  color?: string;
}) {
  return (
    <Card className="bg-card border-border group overflow-hidden h-full">
      <CardContent className="p-4 h-full flex flex-col justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
          <p className={cn(
            'text-2xl font-mono font-bold mt-2 transition-all duration-300 tabular-nums',
            color
          )}>
            {value}
          </p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-all duration-300 self-end" />
      </CardContent>
    </Card>
  );
}
