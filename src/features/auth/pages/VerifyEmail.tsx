import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Mail, CheckCircle, AlertCircle, ArrowRight, Zap, MailOpen } from 'lucide-react';
import { supabase } from '@/shared/integrations/supabase/client';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [status, setStatus] = useState<'waiting' | 'verified'>('waiting');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [hasResent, setHasResent] = useState(false);
  const [error, setError] = useState('');

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Check if email is verified
  useEffect(() => {
    const checkEmailVerification = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email_confirmed_at) {
          setStatus('verified');
          // Auto-redirect to dashboard after 2 seconds
          const timer = setTimeout(() => navigate('/'), 2000);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error('Error checking email verification:', err);
      }
    };

    // Check immediately and then every 2 seconds
    checkEmailVerification();
    const interval = setInterval(checkEmailVerification, 2000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleResendEmail = async () => {
    if (resendCountdown > 0) return;

    setError('');
    setHasResent(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email || '',
      });
      
      if (error) {
        if (error.message.includes('rate limit')) {
          setError('Too many resend attempts. Please wait 5 minutes before trying again.');
        } else {
          setError('Failed to resend verification email. Please try again.');
        }
      } else {
        setHasResent(true);
        setResendCountdown(300); // 5 minutes (Supabase rate limit)
        // Clear success message after 3 seconds
        setTimeout(() => setHasResent(false), 3000);
      }
    } catch (err) {
      setError('Error sending email. Please try again later.');
    }
  };

  if (status === 'verified') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <Card className="w-full max-w-md bg-card border-border relative z-10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                <span className="text-primary">Ticker</span> Pulse
              </span>
            </div>
            <CardTitle className="text-xl text-green-600">Email Verified!</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <p className="text-foreground">
              Your email has been successfully verified. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md bg-card border-border relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">
              <span className="text-primary">Ticker</span> Pulse
            </span>
          </div>
          <CardTitle className="text-xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to your email
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main icon */}
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Mail className="h-12 w-12 text-primary" />
            </div>
          </div>

          {/* Email confirmation text */}
          <div className="space-y-3 text-center">
            <h3 className="text-foreground font-semibold">Check your email</h3>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          {/* Inbox instructions */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex gap-3">
              <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Check your inbox</p>
                <p className="text-xs text-muted-foreground">
                  Look for an email from "hello@tickerpulse.com" and click the verification link
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <MailOpen className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Check spam folder</p>
                <p className="text-xs text-muted-foreground">
                  Sometimes our emails can end up in spam. If you don't see it, check your spam/promotions folder
                </p>
              </div>
            </div>
          </div>

          {/* Success message */}
          {hasResent && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-700 text-sm flex gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Verification email sent! Check your inbox.</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 text-sm flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Resend button with countdown */}
          <div className="space-y-2">
            <Button
              onClick={handleResendEmail}
              disabled={resendCountdown > 0}
              className="w-full"
              variant={resendCountdown > 0 ? 'outline' : 'default'}
            >
              {resendCountdown > 0 ? (
                <>
                  Resend verification email in {Math.floor(resendCountdown / 60)}m {resendCountdown % 60}s
                </>
              ) : (
                <>
                  Resend Verification Email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {resendCountdown === 0
                ? "Didn't get an email? Try resending"
                : `You can resend again in ${Math.floor(resendCountdown / 60)}m ${resendCountdown % 60}s`}
            </p>
          </div>

          {/* Back button */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/auth')}
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
