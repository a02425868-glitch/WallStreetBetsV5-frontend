"use client";

import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePayment } from '@/features/payment/hooks/usePayment';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { CheckCircle, Mail, Shield, Zap } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const { hasPaid } = usePayment();

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-foreground font-mono text-sm">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="text-foreground font-mono text-xs truncate">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border/50 bg-card/80 backdrop-blur-sm ${hasPaid ? 'border-primary/40' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPaid ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Lifetime Access</span>
                    <Badge variant="outline" className="border-primary/50 text-primary text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Full access to all features, forever.</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No active subscription.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
