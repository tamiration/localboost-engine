import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  resolveLocation,
  logVisit,
  type ClientConfig,
  type GeoResult,
} from '@/lib/geoEngine';
import type { PhoneNumber } from '@/lib/phoneResolver';
import type { Tables } from '@/integrations/supabase/types';
import GarageDoorTemplate from '@/components/templates/GarageDoorTemplate';
import ModernTemplate from '@/components/templates/ModernTemplate';

type LandingPageRow = Tables<'landing_pages'>;
type ClientRow = Tables<'clients'>;
type PhoneNumberRow = Tables<'phone_numbers'>;

function toPhoneNumber(row: PhoneNumberRow): PhoneNumber {
  return {
    id: row.id,
    phone_number: row.phone_number,
    area_code: row.area_code,
    is_toll_free: row.is_toll_free ?? false,
    is_primary: row.is_primary ?? false,
    label: row.label ?? '',
    active: row.active ?? true,
    call_tracking_enabled: row.call_tracking_enabled ?? false,
    call_tracking_provider: row.call_tracking_provider,
    call_tracking_number: row.call_tracking_number,
  };
}

export default function LandingPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [page, setPage] = useState<LandingPageRow | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [geo, setGeo] = useState<GeoResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!subdomain) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Find the landing page directly by subdomain (deployed or published)
        const { data: pageData } = await supabase
          .from('landing_pages')
          .select('*')
          .eq('subdomain', subdomain)
          .or('is_published.eq.true,deployed.eq.true')
          .maybeSingle();

        if (!pageData) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        // Then get the client for this page
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', pageData.client_id)
          .maybeSingle();

        if (!clientData) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        const [phoneRes, geoCfgRes] = await Promise.all([
          supabase.from('phone_numbers').select('*').eq('client_id', clientData.id),
          supabase
            .from('geo_configs')
            .select('use_adgroup_as_city')
            .eq('landing_page_id', pageData.id)
            .maybeSingle(),
        ]);

        const numbers: PhoneNumber[] = (phoneRes.data ?? []).map(toPhoneNumber);

        const config: ClientConfig = {
          default_city: clientData.default_city ?? '',
          default_state: clientData.default_state ?? '',
          default_area_code: clientData.default_area_code ?? '',
          use_adgroup_as_city: geoCfgRes.data?.use_adgroup_as_city ?? false,
          country: (clientData.country === 'AU' ? 'AU' : 'US'),
        };

        const geoResult = await resolveLocation(
          window.location.href,
          config,
          numbers,
          supabase
        );

        if (cancelled) return;

        setPage(pageData);
        setClient(clientData);
        setGeo(geoResult);
        setLoading(false);

        logVisit(pageData.id, geoResult, supabase).catch(() => {});
      } catch (err) {
        console.error('[LandingPage] load error:', err);
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (notFound || !page || !client || !geo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="text-xl text-muted-foreground">Page not found</p>
        </div>
      </div>
    );
  }

  // Use GarageDoorTemplate for garage_door type, otherwise use ModernTemplate as default
  if ((page as any).template_type === 'garage_door') {
    return <GarageDoorTemplate page={page} client={client} geo={geo} />;
  }

  // Default to ModernTemplate for all other cases (modern, classic, etc.)
  return <ModernTemplate page={page} client={client} geo={geo} />;
}
