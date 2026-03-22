import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { isTollFreeAreaCode } from '@/lib/areaCodes';
import type { Tables } from '@/integrations/supabase/types';

type PhoneNumber = Tables<'phone_numbers'>;

interface PhoneNumberManagerProps {
  clientId: string;
  country: 'US' | 'AU';
}

const TOLL_FREE_US = ['800', '888', '877', '866', '855', '844', '833'];
const TOLL_FREE_AU = ['1800', '1300'];

function extractAreaCode(phone: string, country: 'US' | 'AU'): string {
  const digits = phone.replace(/\D/g, '');
  if (country === 'US') {
    const num = digits.startsWith('1') ? digits.slice(1) : digits;
    return num.slice(0, 3);
  }
  if (digits.startsWith('61')) {
    const local = digits.slice(2);
    if (local.startsWith('1800')) return '1800';
    if (local.startsWith('1300')) return '1300';
    return '0' + local.charAt(0);
  }
  if (digits.startsWith('0')) {
    if (digits.startsWith('01800') || digits.startsWith('1800')) return '1800';
    if (digits.startsWith('01300') || digits.startsWith('1300')) return '1300';
    return digits.slice(0, 2);
  }
  return digits.slice(0, 2);
}

export function PhoneNumberManager({ clientId, country }: PhoneNumberManagerProps) {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newAreaCode, setNewAreaCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newIsTollFree, setNewIsTollFree] = useState(false);
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchNumbers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('client_id', clientId)
      .order('is_primary', { ascending: false });
    if (!error && data) setNumbers(data);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchNumbers(); }, [fetchNumbers]);

  const hasTollFree = numbers.some(n => n.is_toll_free && n.active);

  const handlePhoneChange = (val: string) => {
    setNewPhone(val);
    const ac = extractAreaCode(val, country);
    setNewAreaCode(ac);
    const tf = country === 'US' ? TOLL_FREE_US.includes(ac) : TOLL_FREE_AU.includes(ac);
    setNewIsTollFree(tf);
  };

  const handleAdd = async () => {
    if (!newPhone.trim()) return;
    setAdding(true);
    // If setting as primary, unset others
    if (newIsPrimary) {
      await supabase.from('phone_numbers').update({ is_primary: false }).eq('client_id', clientId);
    }
    const { error } = await supabase.from('phone_numbers').insert({
      client_id: clientId,
      phone_number: newPhone.trim(),
      area_code: newAreaCode,
      label: newLabel || null,
      is_toll_free: newIsTollFree,
      is_primary: newIsPrimary,
      active: true,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Phone number added' });
      setNewPhone(''); setNewAreaCode(''); setNewLabel(''); setNewIsTollFree(false); setNewIsPrimary(false); setShowAdd(false);
      fetchNumbers();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('phone_numbers').update({ active: !active }).eq('id', id);
    fetchNumbers();
  };

  const deleteNumber = async (id: string) => {
    await supabase.from('phone_numbers').delete().eq('id', id);
    toast({ title: 'Phone number deleted' });
    fetchNumbers();
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {!hasTollFree && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>⚠️ This client has no toll free number. Add one to ensure calls always work.</span>
        </div>
      )}

      {numbers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No phone numbers yet.</p>
      ) : (
        <div className="space-y-2">
          {numbers.map(n => (
            <div key={n.id} className="flex items-center gap-3 rounded-md border border-border p-3 bg-card">
              <span className="font-mono text-sm font-medium text-foreground flex-1">{n.phone_number}</span>
              <Badge variant="outline" className="text-xs">{n.area_code}</Badge>
              <span className="text-sm">{country === 'US' ? '🇺🇸' : '🇦🇺'}</span>
              {n.is_toll_free && <Badge className="bg-primary/20 text-primary text-xs">Toll Free</Badge>}
              {n.is_primary && <Badge className="bg-accent/20 text-accent-foreground text-xs">Primary</Badge>}
              {n.label && <span className="text-xs text-muted-foreground">{n.label}</span>}
              <Switch checked={n.active ?? true} onCheckedChange={() => toggleActive(n.id, n.active ?? true)} />
              <Button variant="ghost" size="icon" onClick={() => deleteNumber(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      {!showAdd ? (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Number</Button>
      ) : (
        <div className="rounded-md border border-border p-4 bg-secondary/30 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Phone Number *</Label>
              <Input value={newPhone} onChange={e => handlePhoneChange(e.target.value)} placeholder={country === 'US' ? '+1XXXXXXXXXX' : '+61XXXXXXXXX'} />
            </div>
            <div>
              <Label>Area Code</Label>
              <Input value={newAreaCode} onChange={e => setNewAreaCode(e.target.value)} />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Dallas Office" />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={newIsTollFree} onCheckedChange={c => setNewIsTollFree(c === true)} />
              <span className="text-sm">Toll Free</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={newIsPrimary} onCheckedChange={c => setNewIsPrimary(c === true)} />
              <span className="text-sm">Primary</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={adding || !newPhone.trim()}>Add Number</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
