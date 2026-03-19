import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type AppRole = 'admin' | 'client';

export function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole: AppRole }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/waiting" replace />;
  if (role !== allowedRole) return <Navigate to={role === 'admin' ? '/admin' : '/client'} replace />;

  return <>{children}</>;
}
