"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  Gauge,
  TrendingUp,
  DollarSign,
  Scale,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

export interface TickerAlert {
  id: string;
  user_id: string;
  ticker: string;
  type: string;
  threshold: number | null;
  direction: 'above' | 'below';
  created_at: string | null;
  updated_at: string | null;
}

export type AlertMetric = 
  | 'total_mentions'
  | 'bullish_mentions'
  | 'bearish_mentions'
  | 'neutral_mentions'
  | 'bull_bear_ratio'
  | 'price'
  | 'ai_score';

export interface MetricOption {
  key: AlertMetric;
  label: string;
  description: string;
  icon: LucideIcon;
  unit: string;
  placeholder: string;
}

export const METRIC_OPTIONS: MetricOption[] = [
  { key: 'total_mentions', label: 'Total Mentions', description: 'Total mentions in current snapshot', icon: MessageSquare, unit: 'mentions', placeholder: '50' },
  { key: 'bullish_mentions', label: 'Bullish Mentions', description: 'Number of bullish mentions', icon: TrendingUp, unit: 'mentions', placeholder: '30' },
  { key: 'bearish_mentions', label: 'Bearish Mentions', description: 'Number of bearish mentions', icon: TrendingUp, unit: 'mentions', placeholder: '20' },
  { key: 'neutral_mentions', label: 'Neutral Mentions', description: 'Number of neutral mentions', icon: TrendingUp, unit: 'mentions', placeholder: '25' },
  { key: 'bull_bear_ratio', label: 'Bull/Bear Ratio', description: 'Ratio of bullish to bearish sentiment', icon: Scale, unit: 'ratio', placeholder: '1.5' },
  { key: 'price', label: 'Stock Price', description: 'Current stock price', icon: DollarSign, unit: 'USD', placeholder: '150.00' },
  { key: 'ai_score', label: 'AI Confidence', description: 'AI confidence score (0-100)', icon: Gauge, unit: 'score', placeholder: '80' },
];

export const METRIC_LABELS: Record<string, string> = Object.fromEntries(
  METRIC_OPTIONS.map((m) => [m.key, m.label])
);

export interface AlertHistoryEntry {
  id: string;
  user_id: string;
  ticker: string;
  type: string;
  triggered_at: string;
  threshold: number | null;
  direction: 'above' | 'below' | null;
  value: number | null;
}

interface AlertHistoryRow {
  id: string;
  user_id: string;
  ticker: string;
  type: string;
  triggered_at: string;
  threshold: number | null;
  direction: 'above' | 'below' | null;
  value: number | null;
}

export function useTickerAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['ticker-alerts', user?.id],
    queryFn: async () => {
      if (!user) return [] as TickerAlert[];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TickerAlert[];
    },
    enabled: Boolean(user),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['alert-history', user?.id],
    queryFn: async () => {
      if (!user) return [] as AlertHistoryEntry[];
      const { data, error } = await supabase
        .from('notifications_history')
        .select('id,user_id,ticker,type,triggered_at,threshold,direction,value')
        .eq('user_id', user.id)
        .order('triggered_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data || []) as AlertHistoryRow[]).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        ticker: row.ticker,
        type: row.type,
        triggered_at: row.triggered_at,
        threshold: row.threshold,
        direction: row.direction,
        value: row.value,
      }));
    },
    enabled: Boolean(user),
  });

  const createAlert = useMutation({
    mutationFn: async (alert: { ticker: string; type: string; threshold: number; direction: 'above' | 'below' }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          ticker: alert.ticker,
          type: alert.type,
          threshold: alert.threshold,
          direction: alert.direction,
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticker-alerts'] }),
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticker-alerts'] }),
  });

  const logTriggered = useMutation({
    mutationFn: async (entry: { ticker: string; type: string; threshold?: number; direction?: 'above' | 'below'; value?: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications_history')
        .insert({
          user_id: user.id,
          ticker: entry.ticker,
          type: entry.type,
          threshold: entry.threshold ?? null,
          direction: entry.direction ?? null,
          value: entry.value ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-history'] }),
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('notifications_history')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-history'] }),
  });

  return { alerts, isLoading, history, historyLoading, createAlert, deleteAlert, logTriggered, clearHistory };
}
