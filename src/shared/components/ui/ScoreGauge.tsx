import { cn } from '@/shared/lib/utils';

interface ScoreGaugeProps {
  score: number | null;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ScoreGauge({ score, label, size = 'md', className }: ScoreGaugeProps) {
  const displayScore = score ?? 0;
  
  const getColor = (value: number) => {
    if (value >= 70) return { text: 'text-terminal-green', bg: 'bg-terminal-green', glow: 'shadow-[0_0_8px_hsl(var(--terminal-green)/0.4)]' };
    if (value >= 40) return { text: 'text-terminal-yellow', bg: 'bg-terminal-yellow', glow: '' };
    return { text: 'text-terminal-red', bg: 'bg-terminal-red', glow: '' };
  };

  const colors = getColor(displayScore);

  // Small inline version for tables
  if (size === 'sm') {
    return (
      <div className={cn('flex items-center gap-2 min-w-[80px]', className)}>
        <span className={cn('font-mono font-bold text-sm tabular-nums', colors.text)}>
          {score !== null ? displayScore : '-'}
        </span>
        <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', colors.bg, colors.glow)}
            style={{ width: `${displayScore}%` }}
          />
        </div>
      </div>
    );
  }

  // Medium/Large circular gauge for detail pages
  const strokeWidth = size === 'md' ? 4 : 5;
  const radius = size === 'md' ? 36 : 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  const sizeClasses = {
    md: 'w-20 h-20 text-xl',
    lg: 'w-28 h-28 text-3xl',
  };

  return (
    <div className={cn('flex flex-col items-center gap-1 group', className)}>
      <div className={cn('relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105', sizeClasses[size])}>
        <svg className="transform -rotate-90 w-full h-full drop-shadow-lg">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            className="opacity-50"
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            className={cn(colors.bg, 'drop-shadow-md')}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ 
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: displayScore >= 70 ? 'drop-shadow(0 0 6px hsl(var(--terminal-green) / 0.5))' : undefined
            }}
          />
        </svg>
        <span className={cn(
          'absolute font-mono font-bold transition-all duration-300',
          colors.text,
          displayScore >= 70 && 'text-glow-green'
        )}>
          {score !== null ? displayScore : '-'}
        </span>
      </div>
      {label && (
        <span className="text-xs text-muted-foreground text-center font-medium">{label}</span>
      )}
    </div>
  );
}
