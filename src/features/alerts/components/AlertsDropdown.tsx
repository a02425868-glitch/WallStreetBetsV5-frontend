"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Bell, Plus, Trash2, ChevronRight, ChevronLeft, Search, BellRing, Zap, Clock, History } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { Badge } from '@/shared/components/ui/badge';
import { useTickerAlerts, METRIC_OPTIONS, METRIC_LABELS, AlertMetric, MetricOption } from '@/features/ticker-analysis/hooks/useTickerAlerts';
import { useTickerData } from '@/features/dashboard/hooks/useTickerData';
import { cn } from '@/shared/lib/utils';
import { toast } from '@/shared/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type FormStep = 'idle' | 'ticker' | 'metric' | 'threshold';
type PanelTab = 'alerts' | 'history';

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export function AlertsDropdown() {
  const { alerts, isLoading, history, historyLoading, createAlert, deleteAlert, logTriggered, clearHistory } = useTickerAlerts();
  const { data: leaderboardTickers } = useTickerData();

  const [step, setStep] = useState<FormStep>('idle');
  const [tab, setTab] = useState<PanelTab>('alerts');
  const [tickerSearch, setTickerSearch] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<MetricOption | null>(null);
  const [threshold, setThreshold] = useState('');
  const [thresholdDirection, setThresholdDirection] = useState<'above' | 'below'>('above');
  const [open, setOpen] = useState(false);
  const [triggeredCount, setTriggeredCount] = useState(0);

  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const firedAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const checkAlerts = useCallback((row: Record<string, unknown>) => {
    const currentAlerts = alertsRef.current;
    for (const alert of currentAlerts) {
      if (alert.ticker !== row.ticker) continue;
      if (alert.threshold === null || alert.threshold === undefined) continue;
      
      let value = row[alert.type as string];
      if (alert.type === 'total_mentions') {
        const bullish = Number(row.bullish_mentions ?? 0);
        const bearish = Number(row.bearish_mentions ?? 0);
        const neutral = Number(row.neutral_mentions ?? 0);
        value = bullish + bearish + neutral;
      }
      if (typeof value !== 'number') continue;

      // Check threshold based on direction
      const thresholdDirection = alert.direction || 'above';
      const triggered = thresholdDirection === 'above' 
        ? value >= alert.threshold 
        : value <= alert.threshold;

      const alertKey = `${alert.id}`;

      if (triggered) {
        if (firedAlertsRef.current.has(alertKey)) continue;

        firedAlertsRef.current.add(alertKey);
        const metricLabel = METRIC_LABELS[alert.type] || alert.type;
        const directionText = thresholdDirection === 'above' ? 'above' : 'below';
        const msg = `${alert.ticker} ${metricLabel} is ${value} (${directionText} ${alert.threshold})`;

        toast({ title: `Alert: ${alert.ticker}`, description: msg });
        sendBrowserNotification(`Alert: ${alert.ticker}`, msg);
        setTriggeredCount(c => c + 1);

        // Log to history
        logTriggered.mutate({
          ticker: alert.ticker,
          type: alert.type,
          threshold: alert.threshold ?? undefined,
          direction: thresholdDirection,
          value,
        });
      } else {
        firedAlertsRef.current.delete(alertKey);
      }
    }
  }, [logTriggered]);

  useEffect(() => {
    leaderboardTickers.forEach((row) => {
      checkAlerts({
        ticker: row.ticker,
        total_mentions: row.total_mentions_24h,
        bullish_mentions: row.bullish_mentions_24h,
        bearish_mentions: row.bearish_mentions_24h,
        neutral_mentions: row.neutral_mentions_24h,
        bull_bear_ratio: row.bull_bear_ratio_24h,
        price: row.latest_price,
        ai_score: row.ai_score_avg_24h,
      });
    });
  }, [leaderboardTickers, checkAlerts]);

  useEffect(() => {
    if (open) setTriggeredCount(0);
  }, [open]);

  const availableTickers = useMemo(() => {
    const tickers = leaderboardTickers.map(t => t.ticker);
    if (!tickerSearch.trim()) return tickers;
    const q = tickerSearch.toUpperCase();
    return tickers.filter(t => t.includes(q));
  }, [leaderboardTickers, tickerSearch]);

  const resetForm = () => {
    setStep('idle');
    setTickerSearch('');
    setSelectedTicker('');
    setSelectedMetric(null);
    setThreshold('');
    setThresholdDirection('above');
  };

  const handleCreate = () => {
    if (!selectedTicker || !selectedMetric || !threshold.trim()) return;
    const val = parseFloat(threshold);
    if (isNaN(val)) return;

    createAlert.mutate(
      { ticker: selectedTicker, type: selectedMetric.key, threshold: val, direction: thresholdDirection },
      {
        onSuccess: () => {
          toast({
            title: 'Alert created',
            description: `${selectedTicker} - ${selectedMetric.label} ${thresholdDirection} ${val}`,
          });
          resetForm();
        },
      }
    );
  };

  const renderTabBar = () => (
    <div className="flex gap-1 p-1 bg-muted/30 rounded-lg mb-4">
      <button
        onClick={() => { setTab('alerts'); resetForm(); }}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all duration-200',
          tab === 'alerts'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Bell className="h-3.5 w-3.5" />
        Alerts
      </button>
      <button
        onClick={() => { setTab('history'); resetForm(); }}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all duration-200',
          tab === 'history'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <History className="h-3.5 w-3.5" />
        History
        {history.length > 0 && (
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{history.length}</span>
        )}
      </button>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-2 animate-fade-in">
      {history.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Recent Notifications
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => clearHistory.mutate()}
            disabled={clearHistory.isPending}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {historyLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground/70">Triggered alerts will appear here</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {history.map((entry) => {
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50"
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-bold text-foreground">{entry.ticker}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.type}
                    {entry.direction ? ` ${entry.direction}` : ''}
                    {entry.threshold != null ? ` ${entry.threshold}` : ''}
                    {entry.value != null ? ` (value ${entry.value})` : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatDistanceToNow(new Date(entry.triggered_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAlertsList = () => (
    <div className="space-y-2">
      <button
        onClick={() => setStep('ticker')}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 group"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Plus className="h-5 w-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Create New Alert</p>
          <p className="text-xs text-muted-foreground">Get notified when a ticker hits your threshold</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
      </button>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <BellRing className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">No alerts yet</p>
          <p className="text-xs text-muted-foreground/70">Create your first alert to get started</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 pt-2">
            Your Alerts ({alerts.length})
          </p>
          {alerts.map((alert) => {
            const metricOpt = METRIC_OPTIONS.find(m => m.key === alert.type);
            const Icon = metricOpt?.icon || Zap;
            const direction = alert.direction || 'above';
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 transition-all duration-200 hover:border-primary/30'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-primary/10'
                )}>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-bold text-foreground">{alert.ticker}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border">
                      {METRIC_LABELS[alert.type] || alert.type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5 block">
                    {direction === 'above' ? 'Above' : 'Below'} {alert.threshold ?? '-'}{metricOpt ? ` ${metricOpt.unit}` : ''}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteAlert.mutate(alert.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderTickerStep = () => (
    <div className="space-y-3 animate-fade-in">
      <button onClick={resetForm} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-3 w-3" /> Back
      </button>
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">Step 1: Choose Ticker</h4>
        <p className="text-xs text-muted-foreground">Select a ticker or type a custom one</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search or type ticker..."
          value={tickerSearch}
          onChange={(e) => setTickerSearch(e.target.value)}
          className="pl-9 h-10 uppercase font-mono"
          maxLength={10}
          autoFocus
        />
      </div>

      {tickerSearch.trim() && !availableTickers.includes(tickerSearch.toUpperCase().trim()) && (
        <button
          onClick={() => {
            setSelectedTicker(tickerSearch.toUpperCase().trim());
            setStep('metric');
          }}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-accent/30 hover:border-accent/60 hover:bg-accent/5 transition-all"
        >
          <Plus className="h-4 w-4 text-accent" />
          <span className="text-sm font-mono font-medium text-foreground">
            Use "{tickerSearch.toUpperCase().trim()}"
          </span>
          <span className="text-xs text-muted-foreground ml-auto">Custom ticker</span>
        </button>
      )}

      <div className="grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto scrollbar-terminal pr-1">
        {availableTickers.map((t) => (
          <button
            key={t}
            onClick={() => { setSelectedTicker(t); setStep('metric'); }}
            className="px-3 py-2.5 rounded-lg border border-border/50 bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 text-center group"
          >
            <span className="text-sm font-mono font-bold text-foreground group-hover:text-primary transition-colors">{t}</span>
          </button>
        ))}
      </div>

      {availableTickers.length === 0 && !tickerSearch.trim() && (
        <p className="text-xs text-muted-foreground text-center py-4">No tickers found in leaderboard yet.</p>
      )}
    </div>
  );

  const renderMetricStep = () => (
    <div className="space-y-3 animate-fade-in">
      <button onClick={() => setStep('ticker')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-3 w-3" /> Back
      </button>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-foreground">Step 2: Choose Metric</h4>
          <Badge variant="outline" className="font-mono text-xs">{selectedTicker}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">What do you want to track?</p>
      </div>
      <div className="space-y-1.5 max-h-[360px] overflow-y-auto scrollbar-terminal pr-1">
        {METRIC_OPTIONS.map((m) => (
          <button
            key={m.key}
            onClick={() => { setSelectedMetric(m); setStep('threshold'); }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 text-left group"
          >
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
              <m.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderThresholdStep = () => (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => setStep('metric')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-3 w-3" /> Back
      </button>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-foreground">Step 3: Set Threshold</h4>
          <Badge variant="outline" className="font-mono text-xs">{selectedTicker}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Alert me when <span className="text-foreground font-medium">{selectedMetric?.label}</span> goes...
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground mb-1.5 block">Direction</label>
        <div className="flex gap-2">
          <button
            onClick={() => setThresholdDirection('above')}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg border transition-all text-sm font-medium',
              thresholdDirection === 'above'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border/50 bg-card/50 text-muted-foreground hover:border-border'
            )}
          >
            Above
          </button>
          <button
            onClick={() => setThresholdDirection('below')}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg border transition-all text-sm font-medium',
              thresholdDirection === 'below'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border/50 bg-card/50 text-muted-foreground hover:border-border'
            )}
          >
            Below
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">
          Threshold value ({selectedMetric?.unit})
        </label>
        <Input
          type="number"
          placeholder={selectedMetric?.placeholder || '0'}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="h-12 text-lg font-mono text-center"
          autoFocus
        />
      </div>

      {threshold && !isNaN(parseFloat(threshold)) && (
        <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Alert preview:</p>
          <p className="text-sm text-foreground">
            Notify me when <span className="font-mono font-bold text-primary">{selectedTicker}</span>'s{' '}
            <span className="font-medium">{selectedMetric?.label}</span> goes{' '}
            <span className="font-medium text-primary">
              {thresholdDirection} {parseFloat(threshold)} {selectedMetric?.unit}
            </span>
          </p>
        </div>
      )}

      <Button
        className="w-full h-11"
        onClick={handleCreate}
        disabled={!threshold.trim() || isNaN(parseFloat(threshold)) || createAlert.isPending}
      >
        {createAlert.isPending ? 'Creating...' : 'Create Alert'}
      </Button>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) { resetForm(); setTab('alerts'); } }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          {triggeredCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center animate-pulse">
              {triggeredCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto scrollbar-terminal">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Ticker Alerts
          </SheetTitle>
        </SheetHeader>
        <div className="py-4">
          {step === 'idle' && renderTabBar()}
          {step === 'idle' && tab === 'alerts' && renderAlertsList()}
          {step === 'idle' && tab === 'history' && renderHistory()}
          {step === 'ticker' && renderTickerStep()}
          {step === 'metric' && renderMetricStep()}
          {step === 'threshold' && renderThresholdStep()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
