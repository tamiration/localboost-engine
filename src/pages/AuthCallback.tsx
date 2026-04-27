import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase puts the tokens in the URL hash — exchangeCodeForSession handles both
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setStatus('error');
        setMessage(error.message || 'Confirmation failed. The link may have expired.');
        return;
      }

      if (data.session) {
        // Look up role and redirect
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.session.user.id)
          .maybeSingle();

        setStatus('success');
        setMessage('Email confirmed! Redirecting you...');

        setTimeout(() => {
          const role = roleData?.role;
          if (role === 'admin') navigate('/admin');
          else if (role === 'client') navigate('/client');
          else navigate('/waiting');
        }, 1500);
      } else {
        // No session yet — try exchanging the code from the URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
          const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError || !exchanged.session) {
            setStatus('error');
            setMessage(exchangeError?.message || 'Confirmation link is invalid or expired.');
            return;
          }

          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', exchanged.session.user.id)
            .maybeSingle();

          setStatus('success');
          setMessage('Email confirmed! Redirecting you...');

          setTimeout(() => {
            const role = roleData?.role;
            if (role === 'admin') navigate('/admin');
            else if (role === 'client') navigate('/client');
            else navigate('/waiting');
          }, 1500);
        } else {
          setStatus('error');
          setMessage('No confirmation token found. Please try signing in.');
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 text-center space-y-6">
        <div className="flex justify-center">
          {status === 'loading' && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
          {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
          {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {status === 'loading' && 'Confirming your email'}
            {status === 'success' && 'Email confirmed'}
            {status === 'error' && 'Confirmation failed'}
          </h1>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>

        {status === 'error' && (
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Go to Homepage</Button>
          </div>
        )}
      </div>
    </div>
  );
}
