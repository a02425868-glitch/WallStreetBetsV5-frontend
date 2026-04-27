import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { type LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  icon: LucideIcon;
  summary: string | null;
  updatedAt: string | null;
  loading: boolean;
  emptyMessage: string;
  iconColor?: string;
}

export function SummaryCard({
  title,
  icon: Icon,
  summary,
  updatedAt,
  loading,
  emptyMessage,
  iconColor = 'text-primary',
}: SummaryCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            {title}
          </span>
          {updatedAt && (
            <span className="text-[10px] text-muted-foreground font-normal">
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : summary ? (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {summary}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic text-center py-4">
            {emptyMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
