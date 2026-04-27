import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';

export type MetricKey =
  | 'total_mentions'
  | 'bullish_mentions'
  | 'bearish_mentions'
  | 'neutral_mentions'
  | 'bull_bear_ratio'
  | 'price'
  | 'ai_score';

export type MetricGroup = 'sentiment' | 'market' | 'ai';

export const METRIC_OPTIONS: { key: MetricKey; label: string; group: MetricGroup }[] = [
  // Sentiment Metrics
  { key: 'total_mentions', label: 'Total Mentions', group: 'sentiment' },
  { key: 'bullish_mentions', label: 'Bullish Mentions', group: 'sentiment' },
  { key: 'bearish_mentions', label: 'Bearish Mentions', group: 'sentiment' },
  { key: 'neutral_mentions', label: 'Neutral Mentions', group: 'sentiment' },
  { key: 'bull_bear_ratio', label: 'Bull/Bear Ratio', group: 'sentiment' },
  // Market & Activity Data
  { key: 'price', label: 'Stock Price', group: 'market' },
  // AI Analysis
  { key: 'ai_score', label: 'AI Confidence Score', group: 'ai' },
];

const GROUP_LABELS: Record<MetricGroup, { title: string; description: string }> = {
  sentiment: {
    title: 'Sentiment Metrics',
    description: 'Mentions and sentiment ratios',
  },
  market: {
    title: 'Market & Activity Data',
    description: 'Current pricing data',
  },
  ai: {
    title: 'AI Analysis',
    description: 'Machine learning scores and quality ratings',
  },
};

interface MetricCheckboxesProps {
  selected: MetricKey[];
  onChange: (metrics: MetricKey[]) => void;
}

export function MetricCheckboxes({ selected, onChange }: MetricCheckboxesProps) {
  const toggle = (key: MetricKey) => {
    if (selected.includes(key)) {
      onChange(selected.filter(k => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const groups: MetricGroup[] = ['sentiment', 'market', 'ai'];

  return (
    <div className="space-y-4">
      {groups.map(group => {
        const metrics = METRIC_OPTIONS.filter(m => m.group === group);
        const info = GROUP_LABELS[group];
        return (
          <div key={group}>
            <div className="mb-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">{info.title}</p>
              <p className="text-[11px] text-muted-foreground">{info.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {metrics.map(m => (
                <div key={m.key} className="flex items-center gap-1.5">
                  <Checkbox
                    id={m.key}
                    checked={selected.includes(m.key)}
                    onCheckedChange={() => toggle(m.key)}
                  />
                  <Label htmlFor={m.key} className="text-xs cursor-pointer">{m.label}</Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
