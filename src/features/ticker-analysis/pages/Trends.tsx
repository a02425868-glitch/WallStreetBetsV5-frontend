"use client";

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { TickerSelector } from '@/features/ticker-analysis/components/TickerSelector';
import { TimeWindowSelector } from '@/features/ticker-analysis/components/TimeWindowSelector';
import { AdvancedMetricsChart } from '@/features/ticker-analysis/components/AdvancedMetricsChart';
import { useAvailableTickers, useTickerMetrics, IntervalWindow } from '@/features/ticker-analysis/hooks/useTickerMetrics';
import { RefreshCw } from 'lucide-react';

export default function Trends() {
  const { tickers: availableTickers, loading: tickersLoading, refetch: refetchTickers } = useAvailableTickers();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [intervalWindow, setIntervalWindow] = useState<IntervalWindow>('1h');

  const activeTickers = useMemo(() => {
    return selectedTicker ? [selectedTicker] : [];
  }, [selectedTicker]);

  const { data: metricsData, loading: metricsLoading, refetch: refetchMetrics } = useTickerMetrics(activeTickers, intervalWindow);

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <span className="inline-block w-1 h-8 bg-primary rounded-full" />
              Trends & Analytics
            </h1>
            <p className="text-muted-foreground text-sm pl-4">
              Analyze ticker metrics over time â€” select a ticker, time window, and metrics
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchTickers();
              if (activeTickers.length > 0) refetchMetrics();
            }}
            disabled={metricsLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        <TickerSelector
          availableTickers={availableTickers}
          selectedTicker={selectedTicker}
          onSelectTicker={setSelectedTicker}
          loading={tickersLoading}
        />

        {selectedTicker && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Select interval:</h2>
              <TimeWindowSelector value={intervalWindow} onChange={setIntervalWindow} />
            </div>
            <AdvancedMetricsChart
              metricsData={metricsData}
              selectedTickers={activeTickers}
              timeWindow={intervalWindow}
              loading={metricsLoading}
            />
          </div>
        )}

        {!selectedTicker && !tickersLoading && availableTickers.length > 0 && (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center text-muted-foreground">
              Select a ticker above to view trends and analytics
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
