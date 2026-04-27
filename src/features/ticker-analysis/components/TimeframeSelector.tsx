import { Button } from '@/shared/components/ui/button';

export type TimeframeRange = '1h' | '6h' | '1d' | '3d' | '7d' | '14d' | '30d';

const TIMEFRAME_OPTIONS: { value: TimeframeRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '1d', label: '1d' },
  { value: '3d', label: '3d' },
  { value: '7d', label: '7d' },
  { value: '14d', label: '14d' },
  { value: '30d', label: '30d' },
];

interface TimeframeSelectorProps {
  value: TimeframeRange;
  onChange: (tf: TimeframeRange) => void;
}

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1">
      {TIMEFRAME_OPTIONS.map(opt => (
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
