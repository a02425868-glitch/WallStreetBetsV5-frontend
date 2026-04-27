"use client";

import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { StatsOverview } from '@/features/dashboard/components/StatsOverview';
import { TickerLeaderboard } from '@/features/dashboard/components/TickerLeaderboard';
import { useTickerData } from '@/features/dashboard/hooks/useTickerData';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { data } = useTickerData();

  const lastUpdated = data.length > 0
    ? data.reduce((latest, item) => {
        if (!item.latest_timestamp) return latest;
        const t = new Date(item.latest_timestamp).getTime();
        return t > latest ? t : latest;
      }, 0)
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <span className="inline-block w-1 h-8 bg-primary rounded-full" />
            Dashboard Overview
          </h1>
          <div className="pl-4 flex items-center gap-3">
            <p className="text-muted-foreground">
              Real-time Reddit sentiment analysis for stock tickers
            </p>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <StatsOverview />
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <TickerLeaderboard />
        </div>
      </div>
    </DashboardLayout>
  );
}
