import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Calendar, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  plan_tier: string | null;
  status: string | null;
  monthly_amount: number | null;
  setup_fee_amount: number | null;
  setup_fee_paid: boolean | null;
  billing_cycle: string | null;
  next_billing_date: string | null;
  cancelled_at: string | null;
  created_at: string;
  countries: string[];
}

interface ClientInfo {
  business_name: string;
  subscription_tier: string | null;
  country: string;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },
  cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' },
  past_due: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Past Due' },
  trialing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Trial' },
};

const tierDescriptions: Record<string, string> = {
  free: 'Basic features for getting started',
  basic: 'Single city targeting with 1 landing page',
  medium: 'Multi-city targeting with up to 5 landing pages',
  enterprise: 'Full state coverage with unlimited landing pages',
  nationwide: 'Nationwide coverage with premium support',
};

export default function Billing() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    setLoading(true);

    const { data: clientId } = await supabase.rpc('get_my_client_id');
    if (!clientId) {
      setLoading(false);
      return;
    }

    const [subR, clientR] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('clients').select('business_name, subscription_tier, country').eq('id', clientId).single(),
    ]);

    if (subR.data) setSubscription(subR.data as Subscription);
    if (clientR.data) setClient(clientR.data as ClientInfo);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
      </div>
    );
  }

  const tier = subscription?.plan_tier ?? client?.subscription_tier ?? 'free';
  const status = subscription?.status ?? 'active';
  const statusStyle = statusStyles[status] ?? statusStyles.active;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Billing</h1>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <CardDescription>{client?.business_name}</CardDescription>
            </div>
            <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
              {status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
              {statusStyle.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold capitalize text-foreground">{tier}</p>
              <p className="text-sm text-muted-foreground">{tierDescriptions[tier] ?? 'Custom plan'}</p>
            </div>
            {subscription?.monthly_amount ? (
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">${Number(subscription.monthly_amount).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">/ {subscription.billing_cycle ?? 'month'}</p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">$0</p>
                <p className="text-sm text-muted-foreground">Free tier</p>
              </div>
            )}
          </div>

          {subscription?.countries && subscription.countries.length > 0 && (
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Countries:</span>
              {subscription.countries.map(c => (
                <Badge key={c} variant="outline" className="text-xs">
                  {c === 'US' ? '🇺🇸 USA' : c === 'AU' ? '🇦🇺 Australia' : c}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Billing Date</p>
                <p className="font-medium text-foreground">
                  {subscription?.next_billing_date
                    ? format(new Date(subscription.next_billing_date), 'MMMM d, yyyy')
                    : 'N/A'}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing Cycle</p>
                <p className="font-medium text-foreground capitalize">{subscription?.billing_cycle ?? 'Monthly'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Setup Fee</p>
                <p className="font-medium text-foreground">
                  {subscription?.setup_fee_amount
                    ? `$${Number(subscription.setup_fee_amount).toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                {subscription?.setup_fee_paid
                  ? <CheckCircle className="h-5 w-5 text-green-400" />
                  : <AlertCircle className="h-5 w-5 text-yellow-400" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Setup Fee Status</p>
                <p className={`font-medium ${subscription?.setup_fee_paid ? 'text-green-400' : 'text-yellow-400'}`}>
                  {subscription?.setup_fee_paid ? 'Paid' : 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Note */}
      <Card className="border-primary/30">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            💬 For billing questions, plan changes, or payment issues, please contact your account manager or submit an edit request.
            Stripe-powered self-service billing is coming in Phase 2.
          </p>
        </CardContent>
      </Card>

      {subscription?.cancelled_at && (
        <Card className="border-destructive/30">
          <CardContent className="p-6">
            <p className="text-sm text-destructive">
              ⚠️ Your subscription was cancelled on {format(new Date(subscription.cancelled_at), 'MMMM d, yyyy')}.
              Contact your admin to reactivate.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
