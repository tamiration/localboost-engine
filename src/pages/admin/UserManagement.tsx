import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Search, Plus, ShieldCheck, User, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type AppRole = 'admin' | 'client';

interface UserRow {
  user_id: string;
  role: AppRole;
  created_at: string;
  email: string | null;
  business_name: string | null;
}

interface NewClientForm {
  email: string;
  password: string;
  businessName: string;
  ownerName: string;
  phone: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [saving, setSaving] = useState<string | null>(null);

  // Assign role dialog
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<AppRole>('client');
  const [addLoading, setAddLoading] = useState(false);

  // New client dialog
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientLoading, setNewClientLoading] = useState(false);
  const [newClient, setNewClient] = useState<NewClientForm>({
    email: '', password: '', businessName: '', ownerName: '', phone: '',
  });
  const setNC = (field: keyof NewClientForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setNewClient(prev => ({ ...prev, [field]: e.target.value }));

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    // Fetch all user_roles, then enrich with client email if available
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading users', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Enrich with client email/business_name by matching user_id
    const { data: clients } = await supabase
      .from('clients')
      .select('user_id, email, business_name');

    const clientMap = new Map(
      (clients ?? []).filter(c => c.user_id).map(c => [c.user_id!, c])
    );

    const enriched: UserRow[] = (roles ?? []).map(r => {
      const client = clientMap.get(r.user_id);
      return {
        user_id: r.user_id,
        role: r.role as AppRole,
        created_at: r.created_at,
        email: client?.email ?? null,
        business_name: client?.business_name ?? null,
      };
    });

    setUsers(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const changeRole = async (userId: string, newRole: AppRole) => {
    setSaving(userId);
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Role updated to ${newRole}` });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    }
    setSaving(null);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Remove this user\'s access? They will be sent to the waiting screen on next login.')) return;
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (error) {
      toast({ title: 'Failed to remove user', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User access removed' });
      setUsers(prev => prev.filter(u => u.user_id !== userId));
    }
  };

  const handleAddUser = async () => {
    if (!addEmail.trim()) return;
    setAddLoading(true);

    // Look up user_id from clients table by email
    const { data: clientMatch } = await supabase
      .from('clients')
      .select('user_id, email, business_name')
      .eq('email', addEmail.trim().toLowerCase())
      .single();

    if (!clientMatch?.user_id) {
      toast({
        title: 'User not found',
        description: 'No account with that email exists. They must sign up via /onboarding first.',
        variant: 'destructive',
      });
      setAddLoading(false);
      return;
    }

    // Check if role already exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', clientMatch.user_id)
      .single();

    if (existingRole) {
      // Update existing
      const { error } = await supabase
        .from('user_roles')
        .update({ role: addRole })
        .eq('user_id', clientMatch.user_id);
      if (error) {
        toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
        setAddLoading(false);
        return;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: clientMatch.user_id, role: addRole });
      if (error) {
        toast({ title: 'Failed to assign role', description: error.message, variant: 'destructive' });
        setAddLoading(false);
        return;
      }
    }

    toast({ title: `Role "${addRole}" assigned to ${addEmail}` });
    setShowAdd(false);
    setAddEmail('');
    setAddRole('client');
    fetchUsers();
    setAddLoading(false);
  };

  const handleCreateClient = async () => {
    const { email, password, businessName, ownerName, phone } = newClient;
    if (!email.trim() || !password.trim() || !businessName.trim()) {
      toast({ title: 'Email, password and business name are required.', variant: 'destructive' });
      return;
    }
    setNewClientLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: ownerName, business_name: businessName } },
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Failed to create auth user');

      // 2. Insert client row
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          business_name: businessName.trim(),
          contact_email: email.trim(),
          contact_phone: phone.trim(),
          status: 'active',
          user_id: userId,
        })
        .select('id')
        .single();
      if (clientError) throw clientError;

      // 3. Assign client role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });
      if (roleError) throw roleError;

      toast({ title: 'Client created', description: `${businessName} (${email}) added successfully.` });
      setShowNewClient(false);
      setNewClient({ email: '', password: '', businessName: '', ownerName: '', phone: '' });
      fetchUsers();
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      let description = msg || 'Please try again.';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already')) {
        description = 'An account with this email already exists.';
      }
      toast({ title: 'Failed to create client', description, variant: 'destructive' });
    } finally {
      setNewClientLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      !search ||
      (u.email?.toLowerCase().includes(search.toLowerCase())) ||
      (u.business_name?.toLowerCase().includes(search.toLowerCase())) ||
      u.user_id.includes(search);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Role
          </Button>
          <Button onClick={() => setShowNewClient(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or business..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'admin', 'client'] as const).map(r => (
            <Button
              key={r}
              variant={roleFilter === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter(r)}
              className="capitalize"
            >
              {r === 'admin' && <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
              {r === 'client' && <User className="h-3.5 w-3.5 mr-1" />}
              {r}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No users found. Use "Assign Role" to grant access to a registered user.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.user_id}>
                <TableCell>
                  <div className="text-sm font-medium">{u.email ?? <span className="text-muted-foreground italic">No email linked</span>}</div>
                  <div className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}…</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.business_name ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={u.role === 'admin'
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                      : 'border-green-500/40 bg-green-500/10 text-green-400'
                    }
                  >
                    {u.role === 'admin' ? <ShieldCheck className="h-3 w-3 mr-1 inline" /> : <User className="h-3 w-3 mr-1 inline" />}
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={u.role}
                      onValueChange={(val) => changeRole(u.user_id, val as AppRole)}
                      disabled={saving === u.user_id}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 px-2 text-xs"
                      onClick={() => deleteUser(u.user_id)}
                    >
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* New Client Dialog */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nc-business">Business Name <span className="text-destructive">*</span></Label>
              <Input id="nc-business" placeholder="Acme Garage Door LLC" value={newClient.businessName} onChange={setNC('businessName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-owner">Owner Name</Label>
              <Input id="nc-owner" placeholder="John Smith" value={newClient.ownerName} onChange={setNC('ownerName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-phone">Phone Number</Label>
              <Input id="nc-phone" type="tel" placeholder="(555) 000-0000" value={newClient.phone} onChange={setNC('phone')} />
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">Login credentials for the client</p>
            <div className="space-y-1.5">
              <Label htmlFor="nc-email">Email <span className="text-destructive">*</span></Label>
              <Input id="nc-email" type="email" placeholder="client@example.com" value={newClient.email} onChange={setNC('email')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-password">Password <span className="text-destructive">*</span></Label>
              <Input id="nc-password" type="password" placeholder="Min 8 characters" value={newClient.password} onChange={setNC('password')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClient(false)}>Cancel</Button>
            <Button
              onClick={handleCreateClient}
              disabled={newClientLoading || !newClient.email.trim() || !newClient.password.trim() || !newClient.businessName.trim()}
            >
              {newClientLoading ? 'Creating...' : 'Create Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-email">User Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The user must have signed up via /onboarding first.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={addRole} onValueChange={val => setAddRole(val as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-400" />
                      Admin — full dashboard access
                    </div>
                  </SelectItem>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-400" />
                      Client — client dashboard only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={addLoading || !addEmail.trim()}>
              {addLoading ? 'Assigning...' : 'Assign Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
