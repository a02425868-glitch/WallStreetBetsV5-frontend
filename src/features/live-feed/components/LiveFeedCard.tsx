import { useState, useRef } from 'react';
import { FixedSizeList as List, ListOnItemsRenderedProps } from 'react-window';
import { Link } from 'react-router-dom';
import { useLiveFeed } from '@/features/live-feed/hooks/useLiveFeed';
import { LiveFeedRow } from '@/shared/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Activity, RefreshCw, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/shared/lib/utils';

interface LiveFeedCardProps {
  fullPage?: boolean;
}

export function LiveFeedCard({ fullPage = false }: LiveFeedCardProps) {
  const [tickerFilter, setTickerFilter] = useState('');
  const pageSize = fullPage ? 20 : 10;
  const { items, loading, loadMore, hasMore, loadingMore, refetch } = useLiveFeed(
    tickerFilter || undefined,
    pageSize
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <Card className="bg-card border-border h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const listHeight = fullPage ? 520 : 320;
  const itemSize = 96;

  const handleItemsRendered = ({ visibleStopIndex }: ListOnItemsRenderedProps) => {
    if (!fullPage) return;
    if (visibleStopIndex >= items.length - 3) {
      loadMore();
    }
  };

  return (
    <Card className={cn('bg-card border-border overflow-hidden', fullPage ? 'h-auto' : 'h-full')}>
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            <span>Live Activity Feed</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {fullPage && (
          <div className="flex gap-2 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by ticker..."
                value={tickerFilter}
                onChange={(e) => setTickerFilter(e.target.value.toUpperCase())}
                className="pl-8 bg-muted border-border text-sm"
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity yet. Data will appear once your Python pipeline processes Reddit posts.
          </div>
        ) : fullPage ? (
          <div className="px-4 pb-4" ref={scrollRef}>
            <List
              height={listHeight}
              itemCount={items.length}
              itemSize={itemSize}
              width="100%"
              onItemsRendered={handleItemsRendered}
            >
              {({ index, style }) => (
                <div style={style}>
                  <FeedItem item={items[index]} index={index} />
                </div>
              )}
            </List>
            <div className="pt-3 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={!hasMore || loadingMore}
              >
                {loadingMore ? 'Loading...' : hasMore ? 'Load more' : 'No more items'}
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="px-4 pb-4 h-80" ref={scrollRef}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <FeedItem key={item.id} item={item} index={index} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function FeedItem({ item, index }: { item: LiveFeedRow; index: number }) {
  const snippet = item.text?.slice(0, 150) || 'No content';

  return (
    <div 
      className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/40 hover:bg-muted/50 transition-all duration-300 animate-fade-in group cursor-pointer"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Link 
            to={`/ticker/${item.ticker}`}
            className="font-mono font-bold text-foreground hover:text-primary transition-colors group-hover:text-glow-green"
          >
            <span className="text-primary/50">$</span>{item.ticker}
          </Link>
          <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded uppercase">
            {item.post_type}
          </span>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap opacity-70">
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 group-hover:text-foreground/80 transition-colors">
        {snippet}
      </p>
      
      <div className="flex items-center mt-2 text-xs text-muted-foreground/70">
        <span className="text-terminal-orange">r/{item.subreddit}</span>
      </div>
    </div>
  );
}
