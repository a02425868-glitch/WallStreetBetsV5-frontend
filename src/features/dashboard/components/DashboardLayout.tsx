import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/ui/button';
import { 
  LayoutDashboard, 
  Activity, 
  TrendingUp, 
  LogOut,
  Zap
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { AlertsDropdown } from '@/features/alerts/components/AlertsDropdown';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Leaderboard', icon: LayoutDashboard },
  { path: '/feed', label: 'Live Feed', icon: Activity },
  { path: '/trends', label: 'Trends', icon: TrendingUp },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative">
              <Zap className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold text-foreground">
              <span className="text-primary">Reddit</span> Sentinel
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/15 text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className={cn('h-4 w-4 transition-transform duration-200', isActive && 'scale-110')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="flex items-center gap-2 sm:gap-4">
            <AlertsDropdown />
            <Link
              to="/profile"
              className="text-sm text-muted-foreground hidden sm:block truncate max-w-[150px] hover:text-primary transition-colors"
            >
              {user?.email}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto scrollbar-terminal">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 relative z-10">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary pulse-live shadow-sm shadow-primary/50" />
            <span className="font-medium">Live data feed active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
