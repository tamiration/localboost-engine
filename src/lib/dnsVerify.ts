import { supabase } from '@/integrations/supabase/client';

export async function verifyDNS(
  subdomain: string,
  _expectedTarget: string
): Promise<boolean> {
  try {
    const url = subdomain.startsWith('http') ? subdomain : `https://${subdomain}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      await fetch(url, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeout);
      return true;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  } catch {
    return false;
  }
}

export async function updateDNSStatus(
  landingPageId: string,
  verified: boolean
): Promise<void> {
  if (verified) {
    await supabase
      .from('landing_pages')
      .update({ deployed: true, verified_at: new Date().toISOString() })
      .eq('id', landingPageId);
  }
}
