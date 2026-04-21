import type { GeoResult } from '@/lib/geoEngine';
import type { Tables } from '@/integrations/supabase/types';

interface StructuredDataProps {
  client: Tables<'clients'>;
  geo: GeoResult;
}

/**
 * Injects JSON-LD LocalBusiness structured data into the page <head>.
 * All values are driven by the client record and resolved geo — no hardcoded placeholders.
 */
export function StructuredData({ client, geo }: StructuredDataProps) {
  const cityResolved = geo.city && geo.city !== 'your area';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: client.business_name,
    telephone: geo.resolvedPhone || (client as any).contact_phone || undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: cityResolved ? geo.city : (client as any).city || undefined,
      addressRegion: geo.state || (client as any).state || undefined,
      addressCountry: geo.country || 'US',
    },
    areaServed: cityResolved
      ? {
          '@type': 'City',
          name: geo.city,
        }
      : undefined,
    url: (client as any).website_url || undefined,
    email: (client as any).contact_email || undefined,
    priceRange: (client as any).price_range || undefined,
  };

  // Remove undefined values so the JSON is clean
  const clean = JSON.parse(JSON.stringify(schema));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean, null, 2) }}
    />
  );
}

export default StructuredData;
