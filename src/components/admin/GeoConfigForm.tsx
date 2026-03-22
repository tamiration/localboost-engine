import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface GeoConfigFormProps {
  landingPageId: string;
  clientCountry: 'US' | 'AU';
  clientDefaults: {
    default_city: string | null;
    default_state: string | null;
    default_area_code: string | null;
  };
}

export function GeoConfigForm({ landingPageId, clientCountry, clientDefaults }: GeoConfigFormProps) {
  const [config, setConfig] = useState<Tables<'geo_configs'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [useAdgroup, setUseAdgroup] = useState(false);
  const [locInterest, setLocInterest] = useState('loc_interest_ms');
  const [locPhysical, setLocPhysical] = useState('loc_physical_ms');
  const [keywordParam, setKeywordParam] = useState('keyword');
  const [campaignParam, setCampaignParam] = useState('campaign');
  const [adgroupParam, setAdgroupParam] = useState('adgroup');

  const [testId, setTestId] = useState('');
  const [testPlatform, setTestPlatform] = useState<'google' | 'bing'>('google');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('geo_configs').select('*').eq('landing_page_id', landingPageId).limit(1).single();
      if (data) {
        setConfig(data);
        setUseAdgroup(data.use_adgroup_as_city ?? false);
        setLocInterest(data.loc_interest_param ?? 'loc_interest_ms');
        setLocPhysical(data.loc_physical_param ?? 'loc_physical_ms');
        setKeywordParam(data.keyword_param ?? 'keyword');
        setCampaignParam(data.campaign_param ?? 'campaign');
        setAdgroupParam(data.adgroup_param ?? 'adgroup');
      }
      setLoading(false);
    })();
  }, [landingPageId]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      landing_page_id: landingPageId,
      use_adgroup_as_city: useAdgroup,
      loc_interest_param: locInterest,
      loc_physical_param: locPhysical,
      keyword_param: keywordParam,
      campaign_param: campaignParam,
      adgroup_param: adgroupParam,
    };
    if (config) {
      await supabase.from('geo_configs').update(payload).eq('id', config.id);
    } else {
      await supabase.from('geo_configs').insert(payload);
    }
    toast({ title: '✅ Geo config saved' });
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testId.trim()) return;
    setTesting(true);
    setTestResult(null);
    const table = testPlatform === 'google' ? 'google_geo_lookup' : 'bing_geo_lookup';
    const col = testPlatform === 'google' ? 'criteria_id' : 'location_id';
    const { data } = await supabase.from(table).select('city, state, state_abbr, country, area_code').eq(col, testId.trim()).limit(1).single();
    if (data) {
      setTestResult(`✅ ${data.city}, ${data.state} (${data.state_abbr}), ${data.country} — Area Code: ${data.area_code}`);
    } else {
      setTestResult('❌ ID not found in lookup table');
    }
    setTesting(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Priority Configuration</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded bg-card border border-border">
            <Badge variant="outline">1️⃣</Badge>
            <span className="text-sm">Location Interest (loc_interest_ms)</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded bg-card border border-border">
            <Badge variant="outline">2️⃣</Badge>
            <span className="text-sm">Physical Location (loc_physical_ms)</span>
          </div>
          {useAdgroup && (
            <div className="flex items-center gap-3 p-3 rounded bg-card border border-border">
              <Badge variant="outline">3️⃣</Badge>
              <span className="text-sm">Ad Group Name Match</span>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 rounded bg-card border border-border">
            <Badge variant="outline">{useAdgroup ? '4️⃣' : '3️⃣'}</Badge>
            <span className="text-sm">Company Default</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded bg-secondary/30 border border-border">
          <Switch checked={useAdgroup} onCheckedChange={setUseAdgroup} />
          <div>
            <p className="text-sm font-medium">Use Ad Group Name as City</p>
            {useAdgroup && (
              <p className="text-xs text-muted-foreground mt-1">
                The engine will match the ad group name exactly to a city name.
                Example: Ad group named "Dallas" shows Dallas content.
                Only enable if campaigns have one ad group per city.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">URL Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Location Interest Param</Label><Input value={locInterest} onChange={e => setLocInterest(e.target.value)} /></div>
          <div><Label>Physical Location Param</Label><Input value={locPhysical} onChange={e => setLocPhysical(e.target.value)} /></div>
          <div><Label>Keyword Param</Label><Input value={keywordParam} onChange={e => setKeywordParam(e.target.value)} /></div>
          <div><Label>Campaign Param</Label><Input value={campaignParam} onChange={e => setCampaignParam(e.target.value)} /></div>
          <div><Label>Ad Group Param</Label><Input value={adgroupParam} onChange={e => setAdgroupParam(e.target.value)} /></div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Fallback Configuration</h3>
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Default City:</span> <span className="ml-1 font-medium">{clientDefaults.default_city ?? '-'}</span></div>
              <div><span className="text-muted-foreground">Default State:</span> <span className="ml-1 font-medium">{clientDefaults.default_state ?? '-'}</span></div>
              <div><span className="text-muted-foreground">Default Area Code:</span> <span className="ml-1 font-medium">{clientDefaults.default_area_code ?? '-'}</span></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Edit defaults in client settings →</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">Test Geo Resolution</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <Label>Geo ID</Label>
            <Input value={testId} onChange={e => setTestId(e.target.value)} placeholder="e.g. 1026339" className="w-40" />
          </div>
          <Select value={testPlatform} onValueChange={v => setTestPlatform(v as 'google' | 'bing')}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="bing">Bing</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !testId.trim()}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Test
          </Button>
        </div>
        {testResult && <p className="text-sm p-3 rounded bg-card border border-border">{testResult}</p>}
      </section>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Geo Config
      </Button>
    </div>
  );
}
