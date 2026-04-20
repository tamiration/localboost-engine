import { injectDynamicContent, type GeoResult } from '@/lib/geoEngine';
import type { Tables } from '@/integrations/supabase/types';

interface GarageDoorTemplateProps {
  page: Tables<'landing_pages'>;
  client: Tables<'clients'>;
  geo: GeoResult;
}

export function GarageDoorTemplate({ page, client, geo }: GarageDoorTemplateProps) {
  const extras = {
    business_name: client.business_name ?? '',
    phone: geo.resolvedPhone,
    service: 'Garage Door Repair',
  };

  const headline = injectDynamicContent(page.headline_template ?? '', geo, extras);
  const subheadline = injectDynamicContent(page.subheadline_template ?? '', geo, extras);
  const cta = injectDynamicContent(page.cta_text ?? 'Call Now — Free Estimate', geo, extras);
  const about = injectDynamicContent(page.about_text ?? '', geo, extras);
  const serviceArea = injectDynamicContent(page.service_area_description ?? '', geo, extras);

  const primary = page.primary_color || '#2563eb';
  const phoneDigits = (geo.resolvedPhone || '').replace(/\D/g, '');
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : undefined;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b-2" style={{ borderColor: primary }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          {page.logo_url ? (
            <img src={page.logo_url} alt={client.business_name} className="h-10" />
          ) : (
            <span className="text-xl font-bold">{client.business_name}</span>
          )}
          {geo.resolvedPhone && phoneHref && (
            <a href={phoneHref} className="text-lg font-semibold" style={{ color: primary }}>
              {geo.resolvedPhone}
            </a>
          )}
        </div>
      </header>

      <section
        className="relative bg-cover bg-center py-20 text-white"
        style={{
          backgroundImage: page.hero_image_url
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${page.hero_image_url})`
            : `linear-gradient(135deg, ${primary}, #1e293b)`,
        }}
      >
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-extrabold md:text-5xl">{headline}</h1>
          {subheadline && <p className="mb-8 text-lg md:text-xl">{subheadline}</p>}
          {phoneHref && (
            <a
              href={phoneHref}
              className="inline-block rounded-lg px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              {cta}
            </a>
          )}
        </div>
      </section>

      {(page.before_image_url || page.after_image_url) && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-8 text-center text-3xl font-bold">Our Work</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {page.before_image_url && (
              <figure>
                <img src={page.before_image_url} alt="Before" className="w-full rounded-lg" />
                <figcaption className="mt-2 text-center font-semibold">Before</figcaption>
              </figure>
            )}
            {page.after_image_url && (
              <figure>
                <img src={page.after_image_url} alt="After" className="w-full rounded-lg" />
                <figcaption className="mt-2 text-center font-semibold">After</figcaption>
              </figure>
            )}
          </div>
        </section>
      )}

      {about && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-6 text-center text-3xl font-bold">
              About {client.business_name}
            </h2>
            <p className="whitespace-pre-line text-center text-gray-700">{about}</p>
          </div>
        </section>
      )}

      {serviceArea && (
        <section className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-6 text-center text-3xl font-bold">Service Area</h2>
          <p className="whitespace-pre-line text-center text-gray-700">{serviceArea}</p>
          {page.maps_embed_url && (
            <div className="mt-6 aspect-video overflow-hidden rounded-lg">
              <iframe
                src={page.maps_embed_url}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Service area map"
              />
            </div>
          )}
        </section>
      )}

      <section className="py-16 text-center text-white" style={{ backgroundColor: primary }}>
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-4 text-3xl font-bold">Ready to get started?</h2>
          {geo.resolvedPhone && phoneHref && (
            <a
              href={phoneHref}
              className="inline-block rounded-lg bg-white px-8 py-4 text-lg font-bold shadow-lg transition hover:opacity-90"
              style={{ color: primary }}
            >
              Call {geo.resolvedPhone}
            </a>
          )}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} {client.business_name}. All rights reserved.
      </footer>
    </div>
  );
}

export default GarageDoorTemplate;
