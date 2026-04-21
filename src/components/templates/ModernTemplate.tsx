import { injectDynamicContent, type GeoResult } from '@/lib/geoEngine';
import type { Tables } from '@/integrations/supabase/types';
import { StructuredData } from '@/components/StructuredData';

interface ModernTemplateProps {
  page: Tables<'landing_pages'>;
  client: Tables<'clients'>;
  geo: GeoResult;
}

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  text: string;
  rating: number;
}

export function ModernTemplate({ page, client, geo }: ModernTemplateProps) {
  // service_name: prefer page-level service field, fall back to client category or business name
  const serviceName =
    (page as any).service_name ||
    (page as any).service ||
    (client as any).category ||
    client.business_name ||
    'Our Service';

  const extras = {
    business_name: client.business_name ?? '',
    phone: geo.resolvedPhone,
    city: geo.city,
    state: geo.state,
    service: serviceName,
  };

  // Headline logic per spec:
  // - city resolved → "{service_name} in {city}"
  // - no city → "5-Star Rated {service_name} – Local & Dependable"
  const cityResolved = geo.city && geo.city !== 'your area';
  const headline = cityResolved
    ? `${serviceName} in ${geo.city}`
    : `5-Star Rated ${serviceName} – Local & Dependable`;

  const rawSubheadline = (page as any).subheadline || (page as any).subheadline_template || '';
  const rawAbout = (page as any).about_content || (page as any).about_text || '';

  const subheadline = injectDynamicContent(rawSubheadline, geo, extras);
  const aboutContent = injectDynamicContent(rawAbout, geo, extras);
  const aboutTitle = injectDynamicContent((page as any).about_title || `About ${client.business_name}`, geo, extras);
  const cta = (page as any).cta_text || 'Get Started';

  const primary = (page as any).primary_color || '#1E3A5F';
  const secondary = (page as any).secondary_color || '#0F2744';
  const accent = (page as any).accent_color || '#D4AF37';

  const phoneDigits = (geo.resolvedPhone || '').replace(/\D/g, '');
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : undefined;

  // Parse features and testimonials from JSON, inject geo tokens into text fields
  const rawFeatures: Feature[] = Array.isArray((page as any).features) ? (page as any).features : [];
  const rawTestimonials: Testimonial[] = Array.isArray((page as any).testimonials) ? (page as any).testimonials : [];

  const features: Feature[] = rawFeatures.map((f) => ({
    ...f,
    title: injectDynamicContent(f.title ?? '', geo, extras),
    description: injectDynamicContent(f.description ?? '', geo, extras),
  }));

  const testimonials: Testimonial[] = rawTestimonials.map((t) => ({
    ...t,
    text: injectDynamicContent(t.text ?? '', geo, extras),
    name: injectDynamicContent(t.name ?? '', geo, extras),
  }));

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <StructuredData client={client} geo={geo} />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          {(page as any).logo_url ? (
            <img src={(page as any).logo_url} alt={client.business_name} className="h-10" />
          ) : (
            <span className="text-xl font-bold" style={{ color: primary }}>{client.business_name}</span>
          )}
          {geo.resolvedPhone && phoneHref && (
            <a 
              href={phoneHref} 
              className="rounded-lg px-4 py-2 font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              {geo.resolvedPhone}
            </a>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative py-24 text-white"
        style={{
          background: (page as any).hero_image_url
            ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${(page as any).hero_image_url}) center/cover`
            : `linear-gradient(135deg, ${primary}, ${secondary})`,
        }}
      >
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            {headline}
          </h1>
          {subheadline && (
            <p className="mb-8 text-lg opacity-90 md:text-xl">{subheadline}</p>
          )}
          {phoneHref && (
            <a
              href={phoneHref}
              className="inline-block rounded-lg px-8 py-4 text-lg font-bold shadow-lg transition hover:scale-105"
              style={{ backgroundColor: accent, color: primary }}
            >
              {cta}
            </a>
          )}
        </div>
      </section>

      {/* Features Section */}
      {features.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold" style={{ color: primary }}>
              Why Choose Us
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature, idx) => (
                <div 
                  key={idx} 
                  className="rounded-xl border p-6 text-center shadow-sm transition hover:shadow-md"
                >
                  <div 
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${primary}15` }}
                  >
                    <FeatureIcon name={feature.icon} color={primary} />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {aboutContent && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-6 text-center text-3xl font-bold" style={{ color: primary }}>
              {aboutTitle}
            </h2>
            <p className="whitespace-pre-line text-center text-lg text-gray-700 leading-relaxed">
              {aboutContent}
            </p>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-12 text-center text-3xl font-bold" style={{ color: primary }}>
              What Our Clients Say
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {testimonials.map((testimonial, idx) => (
                <div key={idx} className="rounded-xl border p-6 shadow-sm">
                  <div className="mb-3 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <svg key={i} className="h-5 w-5" style={{ color: accent }} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mb-4 text-gray-700 italic">&quot;{testimonial.text}&quot;</p>
                  <p className="font-semibold" style={{ color: primary }}>— {testimonial.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 text-center text-white" style={{ backgroundColor: primary }}>
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mb-8 text-lg opacity-90">
            Contact us today and experience the difference.
          </p>
          {geo.resolvedPhone && phoneHref && (
            <a
              href={phoneHref}
              className="inline-block rounded-lg bg-white px-8 py-4 text-lg font-bold shadow-lg transition hover:scale-105"
              style={{ color: primary }}
            >
              Call {geo.resolvedPhone}
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} {client.business_name}. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, JSX.Element> = {
    scissors: (
      <svg className="h-7 w-7" fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    ),
    clock: (
      <svg className="h-7 w-7" fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    star: (
      <svg className="h-7 w-7" fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  };
  return icons[name] || icons.star;
}

export default ModernTemplate;
