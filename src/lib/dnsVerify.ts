import { supabase } from '@/integrations/supabase/client';

const DNS_TARGET = 'localadssystem.com';

/**
 * Checks whether `subdomain` has a CNAME record pointing to DNS_TARGET
 * using the Google DNS-over-HTTPS API (no CORS issues, no server needed).
 */
export async function verifyDNS(
  subdomain: string,
  expectedTarget: string = DNS_TARGET
): Promise<boolean> {
  try {
    const domain = subdomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`,
      { headers: { Accept: 'application/dns-json' } }
    );
    if (!res.ok) return false;
    const json = await res.json();
    const answers: { data: string }[] = json.Answer ?? [];
    return answers.some(
      a => a.data.replace(/\.$/, '').toLowerCase() === expectedTarget.toLowerCase()
    );
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
      .update({ deployed: true, is_published: true, verified_at: new Date().toISOString() })
      .eq('id', landingPageId);
  }
}
