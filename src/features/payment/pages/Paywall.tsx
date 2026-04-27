"use client";

import { useState } from 'react';
import { usePayment } from '@/features/payment/hooks/usePayment';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Zap, CreditCard, Tag, LogOut, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export default function Paywall() {
  const { startCheckout, applyPromoCode } = usePayment();
  const { signOut, user } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handlePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    const result = await applyPromoCode(promoCode.trim());
    setPromoResult(result);
    setPromoLoading(false);
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    await startCheckout();
    setCheckoutLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none" />

      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md relative z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">
              <span className="text-primary">Reddit</span> Sentinel
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[150px]">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Unlock Reddit Sentinel</h1>
            <p className="text-muted-foreground">
              Get lifetime access to real-time stock sentiment analysis
            </p>
          </div>

          {/* Pricing card */}
          <Card className="border-primary/30 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Lifetime Access</CardTitle>
              <CardDescription>One-time payment, no recurring fees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-foreground">$9.99</span>
                <span className="text-muted-foreground ml-1">/ forever</span>
              </div>

              <ul className="space-y-2 text-sm">
                {[
                  'Real-time Reddit sentiment tracking',
                  'Ticker leaderboard & velocity alerts',
                  'Historical trend analysis & charts',
                  'Custom alert notifications',
                  'AI confidence scoring',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full h-11"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {checkoutLoading ? 'Opening checkout...' : 'Pay $9.99'}
              </Button>
            </CardContent>
          </Card>

          {/* Promo code section */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>Have a promo code?</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value); setPromoResult(null); }}
                  className="font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && handlePromo()}
                />
                <Button
                  variant="secondary"
                  onClick={handlePromo}
                  disabled={promoLoading || !promoCode.trim()}
                >
                  {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {promoResult && (
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  promoResult.success ? 'text-primary' : 'text-destructive'
                )}>
                  {promoResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {promoResult.success ? 'Access granted!' : promoResult.error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
