import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Layers } from 'lucide-react';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  tier: string;
  status: string;
  pages_limit: number | null;
  monthly_price: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

interface ClientInfo {
  id: string;
  business_name: string;
  subscription_tier: string | null;
}

interface PageCounts {
  total: number;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: 'bg-green-500/20',  text: 'text-green-400',  label: 'Active' },
  cancelled: { bg: 'bg-red-500/20',    text: 'text-red-400',    label: 'Cancelled' },
  past_due:  { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Past Due' },
};

const tierConfig: Record<string, { label: string; description: string; price: number; pagesLimit: number }> = {
  starter: { label: 'Starter',  description: 'Single market with up to 3 landing pages',       price: 297,  pagesLimit: 3  },
  growth:  { label: 'Growth',   description: 'Multi-city targeting with up to 10 landing pages', price: 597,  pagesLimit: 10 },
  pro:     { label: 'Pro',      description: 'Unlimited pages and premium support',              price: 997,  pagesLimit: 999 },
};

export default function Billing() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchBilling();
  }, [user]);

  const fetchBilling = async () => {
    setLoading(true);

    // Get client record
    const { data: clientData } = await supabase
      .from('clients')
      .select('id, business_name, subscription_tier')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!clientData) { setLoading(false); return; }
    setClient(clientData as ClientInfo);

    const [subR, countR] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('id, tier, status, pages_limit, monthly_price, current_period_start, current_period_end, created_at')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('landing_pages')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientData.id),
    ]);

    if (subR.data) setSubscription(subR.data as Subscription);
    setPageCount(countR.count ?? 0);
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

  const tier = subscription?.tier ?? client?.subscription_tier ?? 'starter';
  const status = subscription?.status ?? 'active';
  const statusStyle = statusStyles[status] ?? statusStyles.active;
  const cfg = tierConfig[tier] ?? tierConfig.starter;
  const price = subscription?.monthly_price ?? cfg.price;
  const pagesLimit = subscription?.pages_limit ?? cfg.pagesLimit;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Billing</h1>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Current Plan</CardTitle>
              {client?.business_name && (
                <CardDescription>{client.business_name}</CardDescription>
              )}
            </div>
            <Badge className={`${statusStyle.bg} ${statusStyle.text} gap-1`}>
              {status === 'active'
                ? <CheckCircle className="h-3 w-3" />
                : <AlertCircle className="h-3 w-3" />}
              {statusStyle.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-foreground capitalize">{cfg.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{cfg.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-foreground">${price.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">/ month</p>
            </div>
          </div>

          {/* Usage bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Landing pages used</span>
              <span>{pageCount} / {pagesLimit === 999 ? 'Unlimited' : pagesLimit}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: pagesLimit === 999 ? '0%' : `${Math.min(100, (pageCount / pagesLimit) * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing cycle details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current period</p>
                <p className="text-sm font-medium text-foreground">
                  {subscription?.current_period_start
                    ? format(new Date(subscription.current_period_start), 'MMM d')
                    : '—'}
                  {' – '}
                  {subscription?.current_period_end
                    ? format(new Date(subscription.current_period_end), 'MMM d, yyyy')
                    : '—'}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next billing date</p>
                <p className="text-sm font-medium text-foreground">
                  {subscription?.current_period_end
                    ? format(new Date(subscription.current_period_end), 'MMMM d, yyyy')
                    : 'Contact admin'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan tier</p>
                <p className="text-sm font-medium text-foreground capitalize">{cfg.label}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Page allowance</p>
                <p className="text-sm font-medium text-foreground">
                  {pagesLimit === 999 ? 'Unlimited' : `${pagesLimit} pages`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No subscription yet */}
      {!subscription && (
        <Card className="border-yellow-500/30">
          <CardContent className="p-5">
            <p className="text-sm text-yellow-400">
              No active subscription found. Your plan may be managed by your account manager.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Support note */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            For billing questions, plan upgrades, or payment issues, contact your account manager or submit an edit request. Stripe self-service billing is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
