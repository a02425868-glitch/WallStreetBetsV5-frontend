"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '@/shared/integrations/supabase/client';

interface RealtimeOptions<T> {
  channel: string;
  table: string;
  filter?: string;
  bufferMs?: number;
  onBatch: (rows: T[]) => void;
}

export function useRealtime<T>({
  channel,
  table,
  filter,
  bufferMs = 500,
  onBatch,
}: RealtimeOptions<T>) {
  const bufferRef = useRef<T[]>([]);
  const onBatchRef = useRef(onBatch);
  
  // Keep ref updated without triggering effects
  useEffect(() => {
    onBatchRef.current = onBatch;
  }, [onBatch]);

  useEffect(() => {
    const realtimeChannel = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => {
          if (payload.new) {
            bufferRef.current.push(payload.new as T);
          }
        }
      )
      .subscribe((status) => {
        // Subscription status updated
      });

    const interval = setInterval(() => {
      if (bufferRef.current.length === 0) return;
      const batch = bufferRef.current.splice(0, bufferRef.current.length);
      onBatchRef.current(batch);
    }, bufferMs);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(realtimeChannel);
    };
  }, [channel, table, filter, bufferMs]);
}
