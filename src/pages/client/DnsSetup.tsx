import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { verifyDNS, updateDNSStatus } from '@/lib/dnsVerify';
import { Copy, CheckCircle, Clock, XCircle, Globe, RefreshCw } from 'lucide-react';

interface LandingPage {
  id: string;
  page_name: string;
  subdomain: string | null;
  deployed: boolean | null;
  verified_at: string | null;
}

function getDnsStatus(page: LandingPage) {
  if (page.verified_at) return 'connected';
  if (page.deployed) return 'pending';
  return 'not_configured';
}

const statusConfig = {
  connected: { icon: CheckCircle, label: '🟢 Connected & Live', color: 'text-green-400', bg: 'bg-green-500/20' },
  pending: { icon: Clock, label: '🟡 Pending Verification', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  not_configured: { icon: XCircle, label: '🔴 Not Configured', color: 'text-red-400', bg: 'bg-red-500/20' },
};

export default function DnsSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchPages();
  }, [user]);

  const fetchPages = async () => {
    setLoading(true);
    // Get this client's record first
    const { data: clientData } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!clientData) { setLoading(false); return; }

    const { data } = await supabase
      .from('landing_pages')
      .select('id, page_name, subdomain, deployed, verified_at')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false });
    setPages((data ?? []) as LandingPage[]);
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Value copied to clipboard.' });
  };

  const handleVerify = async (page: LandingPage) => {
    if (!page.subdomain) return;
    setVerifying(page.id);

    const isVerified = await verifyDNS(page.subdomain, 'localadssystem.com');

    if (isVerified) {
      await updateDNSStatus(page.id, true);
      toast({ title: '✅ DNS Connected!', description: `${page.page_name} is now live.` });
      fetchPages();
    } else {
      toast({
        title: '❌ DNS Not Detected',
        description: 'DNS changes can take up to 48 hours to propagate. Please try again later.',
        variant: 'destructive',
      });
    }

    setVerifying(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">DNS Setup</h1>

      {/* Instructions Card */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg">How to Configure DNS</CardTitle>
          <CardDescription>Follow these steps for each landing page that needs a custom domain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
              <p className="text-sm">Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
              <p className="text-sm">Go to DNS Management for your domain.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
              <p className="text-sm">Add a new <strong>CNAME</strong> record with the values shown below for your page.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">4</span>
              <p className="text-sm">Wait for DNS propagation (up to 24–48 hours), then click <strong>Verify DNS</strong>.</p>
            </div>
          </div>

          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
            <p className="text-sm text-yellow-400">⚠️ DNS changes can take up to 24–48 hours to propagate worldwide.</p>
          </div>
        </CardContent>
      </Card>

      {/* Pages */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No landing pages configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        pages.map(page => {
          const status = getDnsStatus(page);
          const cfg = statusConfig[status];
          const StatusIcon = cfg.icon;

          return (
            <Card key={page.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{page.page_name}</CardTitle>
                  {page.subdomain && (
                    <p className="text-sm text-muted-foreground font-mono mt-1">{page.subdomain}</p>
                  )}
                </div>
                <Badge className={cfg.bg}>
                  <StatusIcon className={`h-3 w-3 mr-1 ${cfg.color}`} />
                  <span className={cfg.color}>{cfg.label}</span>
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {page.subdomain ? (
                  <>
                    {/* DNS Record */}
                    <div className="rounded-lg bg-secondary/50 p-4 font-mono text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">CNAME</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard('CNAME')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{page.subdomain.split('.')[0]}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(page.subdomain!.split('.')[0])}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Value:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">localadssystem.com</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard('localadssystem.com')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">TTL:</span>
                        <span className="text-foreground">3600</span>
                      </div>
                    </div>

                    {status !== 'connected' && (
                      <Button
                        onClick={() => handleVerify(page)}
                        disabled={verifying === page.id}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${verifying === page.id ? 'animate-spin' : ''}`} />
                        {verifying === page.id ? 'Verifying...' : 'Verify DNS'}
                      </Button>
                    )}

                    {status === 'connected' && (
                      <p className="text-sm text-green-400">✅ Your page is live and serving traffic.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No subdomain configured for this page yet. Contact your admin to set up a domain.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
