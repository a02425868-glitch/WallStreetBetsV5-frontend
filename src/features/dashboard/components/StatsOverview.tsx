"use client";

import { useState } from 'react';
import { useTickerData } from '@/features/dashboard/hooks/useTickerData';
import { useHourlyMentionVelocity } from '@/features/live-feed/hooks/useHourlyMentionVelocity';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { TrendingUp, Info } from 'lucide-react';

export function StatsOverview() {
  const { data: tickerData, loading: tickersLoading } = useTickerData();
  const { data: velocityData, loading: velocityLoading } = useHourlyMentionVelocity();
  const [showVelocityTooltip, setShowVelocityTooltip] = useState(false);

  const loading = tickersLoading || velocityLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalTickers = tickerData.length;
  
  // Top 3 trending by hourly mention velocity from tracked leaderboard metrics
  const top3Trending = velocityData.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tracked Tickers Card */}
        <Card 
          className="bg-card border-border card-interactive group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardContent className="p-4 relative">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Tracked Tickers</p>
            <p className="text-2xl lg:text-3xl font-mono font-bold mt-2 text-terminal-green group-hover:text-glow-green transition-all duration-300">{totalTickers}</p>
          </CardContent>
        </Card>

        {/* Top 3 Trending Tickers Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-terminal-yellow" />
                Top 3 Active Tickers
              </CardTitle>
              <div 
                className="relative"
                onMouseEnter={() => setShowVelocityTooltip(true)}
                onMouseLeave={() => setShowVelocityTooltip(false)}
              >
                <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                {showVelocityTooltip && (
                  <div className="absolute right-0 top-6 bg-foreground text-background text-xs rounded py-2 px-3 whitespace-nowrap z-10 shadow-lg">
                    Uses 1h mentions when active; otherwise falls back to 24h volume
                    <div className="absolute bottom-full right-2 border-4 border-transparent border-b-foreground" />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-xs">
              {top3Trending.map((ticker, idx) => (
                <div key={ticker.ticker} className="flex items-center justify-between">
                  <span className="text-muted-foreground">#{idx + 1} {ticker.ticker}</span>
                  <span className="font-mono font-bold text-terminal-cyan">{ticker.mentionCount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
