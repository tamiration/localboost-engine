import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Globe,
  Eye,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';

interface PageSummary {
  id: string;
  page_name: string;
  subdomain: string | null;
  deployed: boolean | null;
  verified_at: string | null;
  page_views: number | null;
  template_type: string | null;
}

interface EditRequest {
  id: string;
  status: string;
  created_at: string;
}

const VERTICAL_LABELS: Record<string, string> = {
  garage_door: 'Garage Door',
  chimney: 'Chimney',
  locksmith: 'Locksmith',
  dryer_vent: 'Dryer Vent',
  hvac: 'HVAC',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  roofing: 'Roofing',
  pest_control: 'Pest Control',
};

function StatCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accent ?? 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 ${accent ? 'text-white' : 'text-primary'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground leading-snug">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientOverview() {
  const { user } = useAuth();
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);
      const [pagesR, reqR] = await Promise.all([
        supabase
          .from('landing_pages')
          .select('id, page_name, subdomain, deployed, verified_at, page_views, template_type')
          .order('created_at', { ascending: false }),
        supabase
          .from('edit_requests')
          .select('id, status, created_at')
          .order('created_at', { ascending: false }),
      ]);
      setPages((pagesR.data ?? []) as PageSummary[]);
      setRequests((reqR.data ?? []) as EditRequest[]);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const livePages = pages.filter(p => p.deployed && p.verified_at);
  const dnsPending = pages.filter(p => p.deployed && !p.verified_at);
  const totalViews = pages.reduce((s, p) => s + (p.page_views ?? 0), 0);
  const openRequests = requests.filter(r => r.status === 'pending' || r.status === 'in_progress');

  const pageUrl = (p: PageSummary) =>
    p.subdomain ? `https://localboost-engine.vercel.app/p/${p.subdomain}` : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s a summary of your account status and activity.
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Live Pages"
            value={livePages.length}
            sub={`${pages.length} total`}
            icon={Globe}
            accent="bg-green-500/15"
          />
          <StatCard
            label="Total Page Views"
            value={totalViews.toLocaleString()}
            sub="all time"
            icon={Eye}
          />
          <StatCard
            label="DNS Pending"
            value={dnsPending.length}
            sub={dnsPending.length > 0 ? 'Action needed' : 'All clear'}
            icon={AlertTriangle}
            accent={dnsPending.length > 0 ? 'bg-yellow-500/20' : 'bg-muted'}
          />
          <StatCard
            label="Open Requests"
            value={openRequests.length}
            sub={openRequests.length > 0 ? 'In progress' : 'Nothing pending'}
            icon={MessageSquare}
            accent={openRequests.length > 0 ? 'bg-primary/15' : 'bg-muted'}
          />
        </div>
      )}

      {/* Action alerts */}
      {!loading && dnsPending.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {dnsPending.length} page{dnsPending.length > 1 ? 's' : ''} waiting for DNS verification
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete the DNS setup to make your {dnsPending.length > 1 ? 'pages' : 'page'} live.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10">
              <Link to="/client/dns">Fix Now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pages list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Your Landing Pages</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
            <Link to="/client/pages">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 pb-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Globe className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No landing pages yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Your admin will set these up for you.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pages.slice(0, 5).map(page => {
                const isLive = page.deployed && page.verified_at;
                const isDnsPending = page.deployed && !page.verified_at;
                const url = pageUrl(page);
                return (
                  <div key={page.id} className="flex items-center gap-4 px-6 py-4">
                    {/* Status dot */}
                    <div className="shrink-0">
                      {isLive ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : isDnsPending ? (
                        <Clock className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{page.page_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {page.template_type && (
                          <span className="text-xs text-muted-foreground">
                            {VERTICAL_LABELS[page.template_type] ?? page.template_type}
                          </span>
                        )}
                        {page.template_type && (
                          <span className="text-muted-foreground/40 text-xs">·</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {(page.page_views ?? 0).toLocaleString()} views
                        </span>
                      </div>
                    </div>

                    {/* Badge */}
                    <Badge
                      variant="outline"
                      className={
                        isLive
                          ? 'border-green-500/30 text-green-400 bg-green-500/10 text-xs'
                          : isDnsPending
                          ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10 text-xs'
                          : 'text-xs'
                      }
                    >
                      {isLive ? 'Live' : isDnsPending ? 'DNS Pending' : 'Draft'}
                    </Badge>

                    {/* Link */}
                    {url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Analytics',
            desc: 'View traffic and performance data',
            href: '/client/analytics',
            icon: TrendingUp,
          },
          {
            label: 'Edit Requests',
            desc: 'Request changes to your pages',
            href: '/client/edit-requests',
            icon: MessageSquare,
          },
          {
            label: 'DNS Setup',
            desc: 'Connect your custom domain',
            href: '/client/dns',
            icon: Globe,
          },
        ].map(item => (
          <Link key={item.href} to={item.href}>
            <Card className="hover:border-primary/40 hover:bg-card/80 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 ml-auto shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
