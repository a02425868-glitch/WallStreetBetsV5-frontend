import { Button } from '@/shared/components/ui/button';
import { IntervalWindow } from '@/features/ticker-analysis/hooks/useTickerMetrics';

const INTERVAL_OPTIONS: { value: IntervalWindow; label: string }[] = [
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '3h', label: '3h' },
  { value: '6h', label: '6h' },
  { value: '12h', label: '12h' },
];

interface TimeWindowSelectorProps {
  value: IntervalWindow;
  onChange: (tw: IntervalWindow) => void;
}

export function TimeWindowSelector({ value, onChange }: TimeWindowSelectorProps) {
  return (
    <div className="flex gap-1">
      {INTERVAL_OPTIONS.map(opt => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(opt.value)}
          className="text-xs px-3"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
