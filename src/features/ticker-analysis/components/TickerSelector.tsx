import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Input } from '@/shared/components/ui/input';
import { X, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

const COLORS = [
  '#00ff9a',
  '#22d3ee',
  '#c084fc',
  '#fbbf24',
  '#fb923c',
  '#f472b6',
  '#4ade80',
  '#60a5fa',
];

export { COLORS };

interface TickerSelectorProps {
  availableTickers: string[];
  selectedTicker: string | null;
  onSelectTicker: (ticker: string | null) => void;
  loading: boolean;
}

export function TickerSelector({
  availableTickers,
  selectedTicker,
  onSelectTicker,
  loading,
}: TickerSelectorProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return availableTickers;
    return availableTickers.filter(t =>
      t.toLowerCase().includes(search.toLowerCase())
    );
  }, [availableTickers, search]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Select Ticker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-16" />
            ))}
          </div>
        ) : availableTickers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tickers available. Data will appear once your pipeline pushes data.
          </p>
        ) : (
          <>
            {/* Selected ticker display */}
            {selectedTicker && (
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onSelectTicker(null)}
                  className="gap-1 text-background font-mono"
                  style={{ backgroundColor: COLORS[0] }}
                >
                  ${selectedTicker}
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Ticker list */}
            {!selectedTicker && (
              <>
                <p className="text-xs text-muted-foreground">Pick a ticker to analyze:</p>
                <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto scrollbar-terminal">
                  {filtered.map(ticker => (
                    <Button
                      key={ticker}
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectTicker(ticker)}
                      className="font-mono text-xs"
                    >
                      ${ticker}
                    </Button>
                  ))}
                </div>
              </>
            )}

          </>
        )}
      </CardContent>
    </Card>
  );
}
