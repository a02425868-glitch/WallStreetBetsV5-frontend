"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/shared/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from '@/shared/hooks/use-toast';

interface PaymentContextType {
  hasPaid: boolean | null;
  loading: boolean;
  checkPayment: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  startCheckout: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [hasPaid, setHasPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkPayment = useCallback(async () => {
    if (!session || !user) {
      setHasPaid(null);
      setLoading(false);
      return;
    }

    try {
      // Fast path: check the local profile first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('has_paid')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.has_paid) {
        setHasPaid(true);
        setLoading(false);
        return;
      }

      // If backend schema doesn't exist yet, skip payment check
      if (profileError?.code === 'PGRST116' || profileError?.code === '404') {
        console.warn('Payment backend not yet deployed. Defaulting to free tier.');
        setHasPaid(false);
        setLoading(false);
        return;
      }

      // Slow path: verify with Stripe via edge function
      const { data, error } = await supabase.functions.invoke('check-payment', {
        body: {},
      });

      if (error) {
        console.warn('Payment service unavailable. Defaulting to free tier.', error);
        setHasPaid(false);
        setLoading(false);
        return;
      }

      setHasPaid(data?.has_paid ?? false);
    } catch (err) {
      console.warn('Error checking payment (backend may not be deployed):', err);
      setHasPaid(false);
    } finally {
      setLoading(false);
    }
  }, [session, user]);

  useEffect(() => {
    checkPayment();
  }, [checkPayment]);

  // Re-check after returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const timer = setTimeout(() => checkPayment(), 2000);
      return () => clearTimeout(timer);
    }
  }, [checkPayment]);

  const applyPromoCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Not logged in' };
      }

      const upperCode = code.trim().toUpperCase();
      
      const { data, error } = await supabase.rpc('redeem_promocode', {
        p_code: upperCode,
        p_user_id: user.id,
        p_email: user.email ?? '',
      });

      // Backend not deployed yet
      if (error?.code === 'PGRST116' || error?.code === '42883') {
        return { success: false, error: 'Promo codes not yet available (backend pending deployment)' };
      }

      if (error) {
        console.warn('Redeem promo code error:', error);
        return { success: false, error: 'Failed to apply promo code' };
      }

      if (!data) {
        return { success: false, error: 'Invalid or expired promo code' };
      }

      setHasPaid(true);
      return { success: true };
    } catch (err) {
      console.warn('Promo code error:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to apply promo code';
      return { success: false, error: errMsg };
    }
  };

  const startCheckout = async () => {
    try {
      // Redirect to Stripe payment link
      window.location.href = "https://buy.stripe.com/test_28E7sL2Cf4ne4Hc7Aa4wM00";
    } catch (err) {
      console.error('Error starting checkout:', err);
      toast({
        title: 'Checkout failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <PaymentContext.Provider value={{ hasPaid, loading, checkPayment, applyPromoCode, startCheckout }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}
