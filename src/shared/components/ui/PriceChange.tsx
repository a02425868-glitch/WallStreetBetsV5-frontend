import { cn } from '@/shared/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface PriceChangeProps {
  value: number | null;
  showSign?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function PriceChange({ value, showSign = true, showIcon = true, className }: PriceChangeProps) {
  if (value === null) {
    return <span className={cn('text-muted-foreground font-mono', className)}>â€“</span>;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  const getColor = () => {
    if (isPositive) return 'text-terminal-green';
    if (isNegative) return 'text-terminal-red';
    return 'text-muted-foreground';
  };

  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;

  return (
    <span className={cn(
      'font-mono inline-flex items-center gap-0.5 transition-all duration-200',
      getColor(),
      absValue >= 5 && (isPositive ? 'text-glow-green' : 'text-glow-red'),
      className
    )}>
      {showIcon && <Icon className="h-3 w-3" />}
      {showSign && isPositive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}
