import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePayment } from '@/features/payment/hooks/usePayment';
import Paywall from '@/features/payment/pages/Paywall';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { hasPaid, loading: paymentLoading } = usePayment();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !paymentLoading && !user) {
      navigate('/auth');
    }
  }, [loading, paymentLoading, user, navigate]);

  if (loading || paymentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!hasPaid) {
    return <Paywall />;
  }

  return <>{children}</>;
}
