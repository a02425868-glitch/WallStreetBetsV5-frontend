import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, Database, HardDrive, PlugZap, RefreshCw, Server, ShieldCheck, Zap } from 'lucide-react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isAdminUser } from '@/features/admin/lib/adminAccess';
import { useAdminStatus } from '@/features/admin/hooks/useAdminStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

const ICONS: Record<string, typeof Server> = {
  supabase: Database,
  runtime: Server,
  local_storage: HardDrive,
  providers: PlugZap,
  snapshots: Activity,
  retention: HardDrive,
  tracked_ticker_rule: ShieldCheck,
};

function statusClass(status: string) {
  if (status === 'ok') return 'border-terminal-green/40 bg-terminal-green/10 text-terminal-green';
  if (status === 'warn') return 'border-terminal-yellow/40 bg-terminal-yellow/10 text-terminal-yellow';
  if (status === 'error') return 'border-terminal-red/40 bg-terminal-red/10 text-terminal-red';
  return 'border-muted-foreground/30 bg-muted/40 text-muted-foreground';
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function summarizeDetails(details: Record<string, unknown>) {
  return Object.entries(details).slice(0, 8);
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const allowed = isAdminUser(user);
  const { sections, loading, error, refetch } = useAdminStatus(allowed);

  const frontendDetails = useMemo(() => {
    const script = Array.from(document.scripts)
      .map((item) => item.src)
      .find((src) => src.includes('/assets/index-'));
    return {
      mode: import.meta.env.MODE,
      production: import.meta.env.PROD,
      build_sha: import.meta.env.VITE_COMMIT_SHA ?? 'not configured',
      build_time: import.meta.env.VITE_BUILD_TIME ?? 'not configured',
      asset: script ? script.split('/').pop() : 'unknown',
    };
  }, []);

  if (authLoading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-80 w-full" />
      </DashboardLayout>
    );
  }

  if (!allowed) {
    return <Navigate to="/404" replace />;
  }

  const allSections = [
    { section: 'frontend', status: 'ok', details: frontendDetails },
    ...sections,
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <span className="inline-block w-1 h-8 bg-primary rounded-full" />
              Admin Status
            </h1>
            <p className="text-muted-foreground text-sm pl-4">
              Production health, data cleanliness, runtime freshness, and storage status.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="bg-card border-destructive/40">
            <CardContent className="py-6 text-sm text-destructive">
              Admin status failed: {error}
            </CardContent>
          </Card>
        )}

        {loading && !error ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-52" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allSections.map((item) => {
              const Icon = ICONS[item.section] ?? Zap;
              const details = item.details as Record<string, unknown>;
              return (
                <Card key={item.section} className="bg-card border-border overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {formatLabel(item.section)}
                      </CardTitle>
                      <Badge variant="outline" className={cn('uppercase', statusClass(item.status))}>
                        {item.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {summarizeDetails(details).map(([key, value]) => (
                        <div key={key} className="flex items-start justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">{formatLabel(key)}</span>
                          <span className="font-mono text-right text-foreground break-all">
                            {typeof value === 'object' && value !== null
                              ? JSON.stringify(value)
                              : String(value ?? 'N/A')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
