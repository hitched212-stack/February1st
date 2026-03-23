import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface BillingSettingsProps {
  embedded?: boolean;
}

interface BillingInvoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_paid: number | null;
  amount_due: number | null;
  currency: string | null;
  created: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export default function BillingSettings({ embedded = false }: BillingSettingsProps) {
  const navigate = useNavigate();
  const { subscription, loading, isActive, renewalDate, planName, monthlyPrice } = useSubscription();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const contentClassName = embedded ? "space-y-6" : "px-4 md:px-6 lg:px-8 space-y-6";

  useEffect(() => {
    let isMounted = true;

    const fetchInvoices = async () => {
      if (!subscription) {
        if (isMounted) {
          setInvoices([]);
          setInvoicesLoading(false);
        }
        return;
      }

      setInvoicesLoading(true);
      setInvoicesError(null);
      try {
        const { data, error } = await supabase.functions.invoke('list-invoices');
        if (error) throw error;
        if (isMounted) {
          setInvoices((data?.invoices as BillingInvoice[]) || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setInvoicesError(err?.message || 'Failed to load billing history');
          setInvoices([]);
        }
      } finally {
        if (isMounted) setInvoicesLoading(false);
      }
    };

    fetchInvoices();

    return () => {
      isMounted = false;
    };
  }, [subscription]);

  const formatInvoiceAmount = (amount: number | null, currency: string | null) => {
    if (amount === null || currency === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  const formatInvoiceDate = (timestamp: number | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCancelSubscription = () => {
    toast.success('Subscription cancelled. You will have access until the end of your billing period.');
  };

  const handleOpenPortal = async () => {
    if (!subscription?.user_id) return;
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { userId: subscription.user_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (loading) {
    return (
      <div className={embedded ? "" : "min-h-screen pb-24"}>
        {!embedded && (
          <header className="px-4 pt-6 pb-6 md:px-6 lg:px-8">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </header>
        )}
        <div className={contentClassName}>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // No subscription found
  if (!subscription) {
    return (
      <div className={embedded ? "" : "min-h-screen pb-24"}>
        {!embedded && (
          <header className="px-4 pt-6 pb-6 md:px-6 lg:px-8">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-foreground/70" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Billing & Subscription</h1>
                <p className="text-xs text-muted-foreground mt-1">Manage your subscription and payment</p>
              </div>
            </div>
          </header>
        )}

        <div className={embedded ? "" : "px-4 md:px-6 lg:px-8"}>
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No Active Subscription</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have an active subscription. Subscribe to unlock all Pro features.
            </p>
            <Button onClick={() => navigate('/paywall')}>
              View Plans
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500';
  const statusText = subscription.cancel_at_period_end ? 'Cancelling' : 
                     isActive ? 'Active' : 
                     subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);

  return (
    <div className={embedded ? "" : "min-h-screen pb-24"}>
      {!embedded && (
        <header className="px-4 pt-6 pb-6 md:px-6 lg:px-8">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-foreground/70" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Billing & Subscription</h1>
              <p className="text-xs text-muted-foreground mt-1">Manage your subscription and payment</p>
            </div>
          </div>
        </header>
      )}

      <div className={contentClassName}>
        {/* Overview */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{planName}</h3>
                    <Badge className={`text-xs ${statusColor}`}>{statusText}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} {renewalDate}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Plan</p>
                <p className="text-sm font-medium text-foreground mt-1">{planName}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Billing Amount</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {monthlyPrice || (subscription.plan_type === 'annual' ? '$79/year' : '$9.99/month')}
                </p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {subscription.cancel_at_period_end ? 'Access Until' : 'Next Billing Date'}
                </p>
                <p className="text-sm font-medium text-foreground mt-1">{renewalDate}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="p-5 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">Payment Method</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Update your payment method and manage invoices in Stripe.
              </p>
            </div>
            <div className="p-5">
              <Button
                onClick={handleOpenPortal}
                disabled={isOpeningPortal}
                className="w-full"
              >
                {isOpeningPortal ? 'Opening...' : 'Manage Billing in Stripe'}
              </Button>
            </div>
          </div>
        </div>


        {/* Cancel Subscription - only show if not already cancelling */}
        {isActive && !subscription.cancel_at_period_end && (
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-4 sm:p-5">

            <div className="relative">
              <h3 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">Cancel your subscription</h3>
              <p className="mt-1 text-sm font-display text-muted-foreground max-w-3xl">
                You can cancel anytime. Access remains active until the end of your current billing cycle, and all trading data stays safely stored.
              </p>
            </div>

            <div className="relative mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-background/30 p-3.5 sm:p-4">
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">What happens next</p>
                <ul className="mt-2.5 space-y-2 text-sm font-display text-foreground/90">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive/80" />
                    Pro features stay unlocked until your period ends.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive/80" />
                    Billing stops automatically afterward.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive/80" />
                    Your data and history remain preserved.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-3.5 sm:p-4">
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Access timeline</p>
                <p className="mt-2 text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">{renewalDate}</p>
                <p className="mt-1.5 text-sm font-display text-muted-foreground">
                  Your subscription will stop on this date.
                </p>
              </div>
            </div>

            <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-destructive/80 flex-shrink-0" strokeWidth={1.8} />
                This action can be reversed by resubscribing anytime.
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 sm:min-w-[240px] rounded-xl border-destructive/45 text-destructive text-sm sm:text-base font-semibold font-display hover:bg-destructive/10 hover:border-destructive/60"
                  >
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will retain access to Pro features until {renewalDate}.
                      After that, your subscription will stop. Your data will be preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Show message if subscription is set to cancel */}
        {subscription.cancel_at_period_end && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Subscription Ending</p>
                <p className="text-sm text-muted-foreground">
                  Your subscription will end on {renewalDate}. You'll continue to have access until then.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}