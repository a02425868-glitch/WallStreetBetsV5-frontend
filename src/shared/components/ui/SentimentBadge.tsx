import { cn } from '@/shared/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SentimentBadgeProps {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | null;
  className?: string;
  showIcon?: boolean;
}

export function SentimentBadge({ sentiment, className, showIcon = true }: SentimentBadgeProps) {
  const colors = {
    Bullish: 'bg-terminal-green/15 text-terminal-green border-terminal-green/30 shadow-terminal-green/10',
    Bearish: 'bg-terminal-red/15 text-terminal-red border-terminal-red/30 shadow-terminal-red/10',
    Neutral: 'bg-terminal-cyan/15 text-terminal-cyan border-terminal-cyan/30 shadow-terminal-cyan/10',
  };

  const icons = {
    Bullish: TrendingUp,
    Bearish: TrendingDown,
    Neutral: Minus,
  };

  const color = sentiment ? colors[sentiment] : 'bg-muted text-muted-foreground border-muted';
  const Icon = sentiment ? icons[sentiment] : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium border shadow-sm transition-all duration-200 hover:scale-105',
        color,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {sentiment || 'Unknown'}
    </span>
  );
}
