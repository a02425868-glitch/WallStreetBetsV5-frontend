'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { Toaster } from '@/shared/components/ui/toaster';
import { Toaster as Sonner } from '@/shared/components/ui/sonner';
import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';
import { PaymentProvider } from '@/features/payment/hooks/usePayment';

function AuthInitializer({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <PaymentProvider>
            <AuthInitializer>
              {children}
            </AuthInitializer>
          </PaymentProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
