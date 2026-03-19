import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Clock } from 'lucide-react';

export default function WaitingForAccess() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Waiting for Access</h1>
        <p className="text-muted-foreground">
          Your account <span className="text-foreground font-medium">{user?.email}</span> has been created successfully.
          An administrator needs to assign your role before you can access the platform.
        </p>
        <Button variant="outline" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
