import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogOut } from 'lucide-react';

type SettingsMap = Record<string, string>;

export default function AdminSettings() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [dbInfo, setDbInfo] = useState<{ tables: number; records: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      const map: SettingsMap = {};
      (data ?? []).forEach(r => { map[r.key] = r.value; });
      setSettings({
        platform_name: 'LocalAds System',
        platform_domain: 'localadssystem.com',
        admin_email: '',
        support_email: '',
        default_ghl_webhook_url: '',
        notification_email: '',
        new_lead_subject: 'New Lead — {service} in {city}',
        enable_email_notifications: 'true',
        ...map,
      });

      // Get basic DB info
      const tableNames = ['clients', 'landing_pages', 'analytics', 'edit_requests', 'phone_numbers', 'templates', 'subscriptions'] as const;
      let totalRecords = 0;
      for (const t of tableNames) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        totalRecords += count ?? 0;
      }
      setDbInfo({ tables: tableNames.length, records: totalRecords });
      setLoading(false);
    })();
  }, []);

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('platform_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    toast({ title: '✅ Settings saved' });
    setSaving(false);
  };

  const testWebhook = async () => {
    const url = settings.default_ghl_webhook_url;
    if (!url) { toast({ title: 'No webhook URL configured', variant: 'destructive' }); return; }
    setTestingWebhook(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@localadssystem.com',
          phone: '+1234567890',
          source: 'LocalAds System — Test',
          tags: ['test'],
        }),
      });
      if (res.ok) toast({ title: '✅ Webhook test successful' });
      else toast({ title: '⚠️ Webhook returned error', description: `Status: ${res.status}`, variant: 'destructive' });
    } catch {
      toast({ title: '❌ Webhook test failed', variant: 'destructive' });
    }
    setTestingWebhook(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Save All Settings
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Platform Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Platform Name</Label><Input value={settings.platform_name} onChange={e => set('platform_name', e.target.value)} /></div>
            <div><Label>Platform Domain</Label><Input value={settings.platform_domain} onChange={e => set('platform_domain', e.target.value)} /></div>
            <div><Label>Admin Email</Label><Input type="email" value={settings.admin_email} onChange={e => set('admin_email', e.target.value)} /></div>
            <div><Label>Support Email</Label><Input type="email" value={settings.support_email} onChange={e => set('support_email', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>GoHighLevel Integration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Default GHL Webhook URL</Label>
            <Input value={settings.default_ghl_webhook_url} onChange={e => set('default_ghl_webhook_url', e.target.value)} placeholder="https://hooks.gohighlevel.com/..." />
            <p className="text-xs text-muted-foreground mt-1">This URL receives new contact data when clients are created</p>
          </div>
          <Button variant="outline" size="sm" onClick={testWebhook} disabled={testingWebhook}>
            {testingWebhook && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Test Webhook
          </Button>
          <p className="text-xs text-muted-foreground">Full GHL API integration with sub-accounts coming in Phase 2. For now, configure webhook URL per client in their settings.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Email Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Notification Email</Label><Input type="email" value={settings.notification_email} onChange={e => set('notification_email', e.target.value)} placeholder="Default email for form alerts" /></div>
            <div><Label>New Lead Subject Line</Label><Input value={settings.new_lead_subject} onChange={e => set('new_lead_subject', e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={settings.enable_email_notifications === 'true'} onCheckedChange={c => set('enable_email_notifications', c ? 'true' : 'false')} />
            <span className="text-sm">Enable email notifications</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Backend Info</CardTitle></CardHeader>
        <CardContent>
          {dbInfo ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Tables:</span> <span className="ml-2 font-medium">{dbInfo.tables}</span></div>
              <div><span className="text-muted-foreground">Total Records:</span> <span className="ml-2 font-medium">{dbInfo.records.toLocaleString()}</span></div>
            </div>
          ) : <Skeleton className="h-10" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Admin Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture} />
              <AvatarFallback>{(user?.email ?? 'A')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? 'Admin'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="destructive" onClick={signOut}><LogOut className="h-4 w-4 mr-1" /> Sign Out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
