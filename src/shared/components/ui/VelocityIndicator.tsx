import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface VelocityIndicatorProps {
  velocity: number;
  showPercentage?: boolean;
  showHotBadge?: boolean;
  className?: string;
}

export function VelocityIndicator({ 
  velocity, 
  showPercentage = true, 
  showHotBadge = false,
  className 
}: VelocityIndicatorProps) {
  const isPositive = velocity > 0;
  const isNegative = velocity < 0;
  const absVelocity = Math.abs(velocity);
  const isHot = absVelocity >= 100;

  const getColor = () => {
    if (isPositive) return 'text-terminal-green';
    if (isNegative) return 'text-terminal-red';
    return 'text-muted-foreground';
  };

  const getGlow = () => {
    if (absVelocity >= 200) {
      return isPositive ? 'text-glow-green' : 'text-glow-red';
    }
    return '';
  };

  // Use flame icon only when showing hot badge, otherwise use trending arrows
  const Icon = showHotBadge && isHot && isPositive 
    ? Flame 
    : isPositive 
      ? TrendingUp 
      : isNegative 
        ? TrendingDown 
        : Minus;

  // Only show enhanced styling when showHotBadge is true
  const showEnhancedStyle = showHotBadge && isHot;

  return (
    <div className={cn(
      'flex items-center gap-1 font-mono transition-all duration-300',
      showEnhancedStyle && 'px-2 py-1 rounded-md bg-gradient-to-r from-terminal-orange/20 to-terminal-red/10 border border-terminal-orange/30',
      getColor(), 
      getGlow(), 
      className
    )}>
      <Icon className={cn(
        'h-4 w-4',
        showEnhancedStyle && 'animate-pulse'
      )} />
      {showPercentage && (
        <span className="text-sm font-bold">
          {isPositive ? '+' : ''}{velocity.toFixed(0)}%
        </span>
      )}
      {showEnhancedStyle && (
        <span className="text-[10px] uppercase tracking-wider text-terminal-orange font-semibold">
          HOT
        </span>
      )}
    </div>
  );
}
