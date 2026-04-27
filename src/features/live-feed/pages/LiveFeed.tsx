"use client";

import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { LiveFeedCard } from '@/features/live-feed/components/LiveFeedCard';

export default function LiveFeed() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <span className="inline-block w-1 h-8 bg-primary rounded-full" />
            Live Activity Feed
          </h1>
          <p className="text-muted-foreground pl-4">
            Real-time stream of Reddit mentions as they're processed
          </p>
        </div>

        <LiveFeedCard fullPage />
      </div>
    </DashboardLayout>
  );
}
