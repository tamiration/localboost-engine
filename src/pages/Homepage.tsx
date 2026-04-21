import { useState, useEffect, useRef } from "react";

// ─── SCROLL REVEAL HOOK ───────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function Counter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal(0.5);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = end / (1800 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, end]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── REVEAL WRAPPER ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, direction = "up" }: { children: React.ReactNode; delay?: number; direction?: string }) {
  const [ref, visible] = useReveal();
  const transforms: Record<string, string> = { up: "translateY(28px)", down: "translateY(-28px)", left: "translateX(-28px)", right: "translateX(28px)" };
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translate(0)" : transforms[direction],
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ─── USA WHITE-BG COLOR PALETTE (60-30-10) ────────────────────────────────────
const C = {
  bg:        "#FFFFFF",
  bgAlt:     "#F4F6FB",
  bgCard:    "#FFFFFF",
  bgHero:    "#F0F3FA",
  navy:      "#0A1F3D",
  navyMid:   "#2A3F6F",
  muted:     "#5A6A8A",
  dim:       "#8899BB",
  red:       "#BF0A30",
  redHover:  "#A00828",
  redLight:  "#FFF0F3",
  blue:      "#0A2868",
  blueLight: "#1B4FC0",
  blueBg:    "#EEF3FF",
  gold:      "#8A6000",
  goldBg:    "#FFF8E1",
  border:    "rgba(10,31,61,0.09)",
  shadow:    "0 2px 16px rgba(10,31,61,0.08)",
  shadowMd:  "0 8px 32px rgba(10,31,61,0.10)",
  shadowLg:  "0 20px 60px rgba(10,31,61,0.12)",
};

// ─── DEMO CITIES ──────────────────────────────────────────────────────────────
const DEMO_CITIES = [
  { city: "Boise",   state: "ID", phone: "(208) 555-0192" },
  { city: "Austin",  state: "TX", phone: "(512) 555-0134" },
  { city: "Phoenix", state: "AZ", phone: "(602) 555-0148" },
  { city: "Denver",  state: "CO", phone: "(720) 555-0173" },
  { city: "Atlanta", state: "GA", phone: "(404) 555-0161" },
];

function LiveGeoDemo() {
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const { city, state, phone } = DEMO_CITIES[idx];

  useEffect(() => {
    const t = setInterval(() => {
      setAnimating(true);
      setTimeout(() => { setIdx(i => (i + 1) % DEMO_CITIES.length); setAnimating(false); }, 300);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position: "relative", maxWidth: 580, margin: "0 auto" }}>
      <div style={{ position: "relative", backgroundColor: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", boxShadow: C.shadowLg }}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${C.red}, ${C.blue}, ${C.red})` }} />
        <div style={{ backgroundColor: C.bgAlt, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[C.red, "#F59E0B", "#22C55E"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />)}
          </div>
          <div style={{ flex: 1, background: "#E8EDF7", borderRadius: 6, padding: "5px 14px", fontSize: 11, color: C.muted, transition: "opacity 0.3s", opacity: animating ? 0.3 : 1 }}>
            yoursite.com/?city={city.toLowerCase()}&source=google
          </div>
        </div>
        <div style={{ padding: "26px 24px", transition: "opacity 0.3s", opacity: animating ? 0 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22C55E", boxShadow: "0 0 6px #22C55E" }} />
            <span style={{ fontSize: 12, color: C.muted }}>📍 Detected: {city}, {state}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: C.gold, backgroundColor: C.goldBg, border: `1px solid ${C.gold}30`, borderRadius: 100, padding: "2px 8px", fontWeight: 700 }}>⭐ AUTO</span>
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, lineHeight: 1.2, letterSpacing: "-0.02em", color: C.navy }}>
            Garage Door Repair In{" "}
            <span style={{ color: C.red }}>{city}</span>
          </h3>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
            Same-day service across {city} & surrounding areas. Licensed, insured, upfront pricing.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button style={{ flex: 1, background: `linear-gradient(135deg, ${C.red}, ${C.redHover})`, border: "none", borderRadius: 9, padding: "11px 0", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: `0 4px 14px ${C.red}35` }}>
              📞 {phone}
            </button>
            <button style={{ flex: 1, backgroundColor: C.blueBg, border: `1px solid ${C.blue}20`, borderRadius: 9, padding: "11px 0", fontSize: 13, color: C.blue, fontWeight: 600, cursor: "pointer" }}>
              Book Online →
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Spring Repair", "Opener", "Off Track", "Same Day"].map(tag => (
              <span key={tag} style={{ fontSize: 10, color: C.muted, backgroundColor: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 100, padding: "3px 9px" }}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 7, padding: "10px 0 14px", borderTop: `1px solid ${C.border}` }}>
          {DEMO_CITIES.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 100, border: "none", cursor: "pointer", backgroundColor: i === idx ? C.red : C.dim + "50", padding: 0, transition: "all 0.3s" }} />
          ))}
        </div>
      </div>
      <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.dim }}>↑ Same URL — content rewrites automatically per city</p>
    </div>
  );
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const STATS = [
  { value: 58772, suffix: "+",          label: "Cities In Geo Database" },
  { value: 5,     suffix: " Verticals", label: "Home Service Verticals" },
  { value: 15,    suffix: " Min",       label: "Average Time To Go Live" },
  { value: 3,     suffix: " Markets",   label: "US · AU · CA" },
];

const FEATURES = [
  { icon: "🔄", badge: "CORE",   color: C.blue,    bg: C.blueBg,   title: "One Page. Every City.", desc: "One URL rewrites itself for every city your ads target. Google and Bing see hyper-relevant local content. You manage just one page." },
  { icon: "📍", badge: "GEO",    color: C.red,     bg: C.redLight, title: "Hyper-Local Geo Targeting", desc: "Visitor from Dallas sees Dallas copy. From Houston? Houston copy. Location fires automatically from Google or Bing — zero manual work." },
  { icon: "🧠", badge: "AI",     color: C.gold,    bg: C.goldBg,   title: "AI Page Builder", desc: "Describe your business. AI builds your complete page — hero, services, CTAs, trust signals — trained on home services conversion patterns." },
  { icon: "🎯", badge: "ADS",    color: C.blue,    bg: C.blueBg,   title: "Google Ads + Bing Ads", desc: "Captures GCLID and MSCLKID from every click. Full UTM parameter tracking. Supports offline conversion upload for both platforms." },
  { icon: "🎨", badge: "DESIGN", color: C.navyMid, bg: C.bgAlt,    title: "Full Design Control", desc: "Choose colors, fonts, layout, and sections. Start from an AI-generated draft or build from scratch. No locked templates." },
  { icon: "🔍", badge: "INTEL",  color: C.gold,    bg: C.goldBg,   title: "Competitor Research", desc: "Research what top competitors in your market are running — their copy, structure, and keywords — then apply those insights to your page." },
];

const STEPS = [
  { n: "01", icon: "⚡", title: "Sign Up & Set Up Your Page", desc: "Choose your vertical, your markets, and your target cities. The AI builder researches your market and builds your first page in minutes." },
  { n: "02", icon: "🌎", title: "One Page. Every City. Live.", desc: "Your page is published. It automatically rewrites its content — headline, copy, and service area — for every city. Same URL. Infinite locations." },
  { n: "03", icon: "📈", title: "Run Google Ads & Bing Ads", desc: "Point your campaigns at your page URL. Full click tracking fires automatically on both platforms. No extra setup required." },
];

const VERTICALS = [
  { emoji: "🚪", name: "Garage Door", subs: "Repair · Springs · Openers · Panels" },
  { emoji: "❄️", name: "HVAC",        subs: "AC Repair · Furnace · Installation" },
  { emoji: "🔐", name: "Locksmith",   subs: "Lockout · Rekey · Lock Change" },
  { emoji: "🌀", name: "Dryer Vent",  subs: "Cleaning · Repair · Inspection" },
  { emoji: "🏠", name: "Chimney",     subs: "Sweep · Inspection · Repair" },
];

const PRICING = [
  { name: "Starter", price: "$199", period: "/mo", desc: "One business, one vertical, unlimited geo targeting.", highlight: false, cta: "Get Started",
    features: ["1 Smart Landing Page", "Unlimited City Variations", "Google Ads + Bing Ads Tracking", "AI Page Builder", "Email Support"] },
  { name: "Growth",  price: "$399", period: "/mo", desc: "Multiple verticals, competitor research, priority support.", highlight: true,  cta: "Start Free Trial",
    features: ["3 Smart Landing Pages", "Unlimited City Variations", "Google + Bing Ads Tracking", "AI Page Builder", "Competitor Research", "Full Design Control", "Priority Support"] },
  { name: "Agency",  price: "$799", period: "/mo", desc: "Unlimited clients, all markets, white-label option.", highlight: false, cta: "Contact Sales",
    features: ["Unlimited Pages", "Unlimited City Variations", "Google + Bing Ads Tracking", "AI Page Builder", "Competitor Research Per Client", "White-Label Option", "Dedicated Account Manager"] },
];

const TESTIMONIALS = [
  { name: "Mike R.", role: "Owner, Karma Garage Door", loc: "Boise, ID", stars: 5,
    quote: "We went from managing separate pages for every city to one page that handles everything automatically. Setup was done in under an hour." },
  { name: "Sarah T.", role: "Digital Marketing Manager", loc: "Houston, TX", stars: 5,
    quote: "The competitor research saved me hours of manual work. I could see exactly what the top companies in each market were doing and build something better." },
  { name: "David K.", role: "Owner, ProLock Services", loc: "Phoenix, AZ", stars: 5,
    quote: "Running Google Ads and Bing Ads to the same page with full tracking on both was a game changer. I never had that visibility before." },
];

const FAQS = [
  { q: "How Does One Page Work For Every City?", a: "The page reads location data from URL parameters passed by Google or Bing Ads. It rewrites the city name, local copy, and service area in real time. Every visitor sees a locally relevant page. You manage just one URL." },
  { q: "Does It Work With Bing Ads And Google Ads?", a: "Yes. The platform captures GCLID (Google) and MSCLKID (Bing) from every click. You can run the same page URL in both Google Ads and Bing Ads campaigns simultaneously with full tracking on both." },
  { q: "What Does The AI Builder Do?", a: "You describe your business — vertical, cities, services. The AI builds your complete landing page including the hero, service sections, trust signals, and CTAs. It also generates your Google Ads and Bing Ads campaign copy." },
  { q: "How Does The Competitor Research Work?", a: "You enter your vertical and target market. The platform researches what top competitors are running — their page structure, copy, and positioning — and surfaces those insights so you can apply them to your own page." },
  { q: "Do I Need A Developer?", a: "No. LocalBoost is fully self-service. From signup to a live page takes under 15 minutes. No code required." },
  { q: "Can I Customize The Design?", a: "Yes. You have full control over colors, fonts, layout, sections, and copy. You can start from an AI-generated draft or build from scratch." },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Homepage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [email, setEmail]     = useState("");
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const NAV: [string, string][] = [["Features","features"],["How It Works","how-it-works"],["Pricing","pricing"],["FAQ","faq"]];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: C.bg, color: C.navy, overflowX: "hidden" }}>

      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes float      { 0%,100%{transform:translateY(0)}      50%{transform:translateY(-12px)} }
        @keyframes float2     { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(2deg)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6}     100%{transform:scale(1.5);opacity:0} }
        @keyframes glow-soft  { 0%,100%{opacity:.35}                  50%{opacity:.65} }
        @keyframes spin-slow  { 0%{transform:rotate(0deg)}            100%{transform:rotate(360deg)} }
        @keyframes usa-shimmer{ 0%{background-position:200% 0}        100%{background-position:-200% 0} }

        .nav-link { background:none;border:none;color:${C.muted};font-size:14px;cursor:pointer;font-weight:500;padding:6px 0;position:relative;transition:color 0.2s;font-family:inherit; }
        .nav-link::after { content:'';position:absolute;bottom:-2px;left:0;width:0;height:2px;background:${C.red};transition:width 0.25s; }
        .nav-link:hover { color:${C.navy}; }
        .nav-link:hover::after { width:100%; }

        .btn-primary { display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,${C.red},${C.redHover});border:none;color:#fff;padding:15px 34px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;position:relative;overflow:hidden;font-family:inherit; }
        .btn-primary::before { content:'';position:absolute;inset:0;background:rgba(255,255,255,0.12);opacity:0;transition:opacity 0.2s; }
        .btn-primary:hover { transform:translateY(-2px);box-shadow:0 12px 36px ${C.red}45; }
        .btn-primary:hover::before { opacity:1; }
        .btn-primary:active { transform:translateY(0); }

        .btn-outline { background:#fff;border:2px solid ${C.navy};color:${C.navy};padding:15px 34px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s;font-family:inherit; }
        .btn-outline:hover { background:${C.navy};color:#fff;transform:translateY(-2px);box-shadow:${C.shadowMd}; }

        .card { background:#fff;border:1px solid ${C.border};border-radius:16px;padding:28px;transition:all 0.3s;box-shadow:${C.shadow}; }
        .card:hover { transform:translateY(-6px);box-shadow:${C.shadowLg}; }

        .feature-card { background:#fff;border:1px solid ${C.border};border-radius:16px;padding:28px;transition:all 0.3s;height:100%;box-shadow:${C.shadow}; }
        .feature-card:hover { transform:translateY(-6px);box-shadow:${C.shadowLg}; }

        .vertical-card { background:#fff;border:1px solid ${C.border};border-radius:14px;padding:24px;text-align:center;transition:all 0.3s;cursor:default;box-shadow:${C.shadow}; }
        .vertical-card:hover { transform:translateY(-8px) scale(1.03);box-shadow:0 20px 50px rgba(10,31,61,0.15),0 0 0 2px ${C.red}; }
        .vertical-card:hover .v-emoji { transform:scale(1.25) rotate(-5deg); }
        .v-emoji { font-size:36px;display:block;margin-bottom:10px;transition:transform 0.3s; }

        .stat-card { background:#fff;border:1px solid ${C.border};border-radius:16px;padding:28px;text-align:center;box-shadow:${C.shadow};transition:all 0.3s; }
        .stat-card:hover { border-color:${C.red}40;transform:translateY(-4px);box-shadow:0 16px 40px rgba(10,31,61,0.12); }

        .testimonial-card { background:#fff;border:1px solid ${C.border};border-radius:18px;padding:30px;transition:all 0.3s;box-shadow:${C.shadow}; }
        .testimonial-card:hover { transform:translateY(-5px);box-shadow:${C.shadowLg};border-color:${C.red}30; }

        .pricing-card { border-radius:18px;padding:32px;transition:all 0.3s; }
        .pricing-card:hover { transform:translateY(-6px); }

        .faq-item { background:#fff;border:1px solid ${C.border};border-radius:13px;overflow:hidden;transition:border-color 0.3s;box-shadow:${C.shadow}; }
        .faq-btn { width:100%;padding:20px 22px;background:none;border:none;color:${C.navy};text-align:left;font-size:15px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;font-family:inherit;transition:color 0.2s; }
        .faq-btn:hover { color:${C.red}; }

        .shimmer-usa { background:linear-gradient(90deg,${C.red},${C.blue},${C.red});background-size:200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:usa-shimmer 4s linear infinite; }

        .input-field { flex:1;min-width:200px;padding:15px 20px;border-radius:12px;border:2px solid ${C.border};background:#fff;color:${C.navy};font-size:15px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;font-family:inherit; }
        .input-field::placeholder { color:${C.dim}; }
        .input-field:focus { border-color:${C.red};box-shadow:0 0 0 3px ${C.red}15; }

        @media(max-width:768px) { .desktop-nav{display:none!important;} }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, boxShadow: "0 1px 12px rgba(10,31,61,0.07)" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${C.red}, ${C.blue}, ${C.red})` }} />
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${C.red}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", boxShadow: `0 4px 12px ${C.red}40` }}>L</div>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em", color: C.navy }}>LocalBoost <span style={{ color: C.red }}>Engine</span></span>
            <span style={{ fontSize: 14 }}>🇺🇸</span>
          </div>
          <div className="desktop-nav" style={{ display: "flex", gap: 32 }}>
            {NAV.map(([l, id]) => <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{l}</button>)}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ background: "none", border: `2px solid ${C.border}`, color: C.muted, padding: "8px 20px", borderRadius: 9, fontSize: 14, cursor: "pointer", fontWeight: 600, transition: "all 0.2s", fontFamily: "inherit" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.navy; (e.currentTarget as HTMLButtonElement).style.color = C.navy; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}
              onClick={() => window.location.href = "/login"}>
              Log In
            </button>
            <button className="btn-primary" style={{ padding: "9px 22px", fontSize: 14, borderRadius: 9 }} onClick={() => scrollTo("signup")}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", padding: "100px 24px 80px", textAlign: "center", backgroundColor: C.bgHero, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, left: "15%", width: 500, height: 500, background: `radial-gradient(circle, ${C.red}08 0%, transparent 70%)`, borderRadius: "50%", animation: "glow-soft 6s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 40, right: "10%", width: 400, height: 400, background: `radial-gradient(circle, ${C.blue}08 0%, transparent 70%)`, borderRadius: "50%", animation: "glow-soft 5s ease-in-out infinite 2s", pointerEvents: "none" }} />

        <div className="desktop-nav" style={{ display: "block", position: "absolute", top: 140, left: "5%", animation: "float 4s ease-in-out infinite" }}>
          <div style={{ backgroundColor: C.blueBg, border: `1px solid ${C.blue}25`, borderRadius: 12, padding: "8px 14px", fontSize: 12, color: C.blue, fontWeight: 600, boxShadow: C.shadow, whiteSpace: "nowrap" }}>
            📍 Phoenix, AZ — Page Updated
          </div>
        </div>
        <div className="desktop-nav" style={{ display: "block", position: "absolute", top: 220, right: "4%", animation: "float2 5s ease-in-out infinite 1s" }}>
          <div style={{ backgroundColor: "#F0FFF4", border: "1px solid #22C55E30", borderRadius: 12, padding: "8px 14px", fontSize: 12, color: "#16A34A", fontWeight: 600, boxShadow: C.shadow, whiteSpace: "nowrap" }}>
            ✅ Conversion Tracked
          </div>
        </div>
        <div className="desktop-nav" style={{ display: "block", position: "absolute", top: 320, left: "4%", animation: "float 6s ease-in-out infinite 2s" }}>
          <div style={{ backgroundColor: C.goldBg, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: "8px 14px", fontSize: 12, color: C.gold, fontWeight: 600, boxShadow: C.shadow, whiteSpace: "nowrap" }}>
            ⭐ Quality Score: 9/10
          </div>
        </div>

        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
              {([
                ["🇺🇸 United States", C.blueBg,   `${C.blue}25`,   C.blue],
                ["🇦🇺 Australia",     C.redLight,  `${C.red}25`,    C.red],
                ["🇨🇦 Canada",        C.goldBg,    `${C.gold}30`,   C.gold],
                ["Google + Bing Ads", C.blueBg,   `${C.blue}25`,   C.blueLight],
              ] as [string, string, string, string][]).map(([l, bg, br, c]) => (
                <span key={l} style={{ backgroundColor: bg, border: `1px solid ${br}`, borderRadius: 100, padding: "5px 16px", fontSize: 12, color: c, fontWeight: 700 }}>{l}</span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 style={{ fontSize: "clamp(40px, 7vw, 74px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 4, color: C.navy }}>
              One Page.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <h1 className="shimmer-usa" style={{ fontSize: "clamp(40px, 7vw, 74px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 4 }}>
              Every City.
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <h1 style={{ fontSize: "clamp(40px, 7vw, 74px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 28, color: C.dim }}>
              Automatically.
            </h1>
          </Reveal>

          <Reveal delay={320}>
            <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: C.muted, lineHeight: 1.75, maxWidth: 560, margin: "0 auto 36px" }}>
              Build <strong style={{ color: C.navy }}>one smart page</strong>. LocalBoost rewrites it per city — geo-specific content, AI-built copy, competitor-informed design. Tracks clicks from <strong style={{ color: C.navy }}>Google Ads and Bing Ads</strong> automatically.
            </p>
          </Reveal>

          <Reveal delay={400}>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 12, border: `2px solid ${C.red}50`, animation: "pulse-ring 2s ease-out infinite" }} />
                <button className="btn-primary" onClick={() => scrollTo("signup")} style={{ boxShadow: `0 8px 28px ${C.red}40` }}>
                  Start Free Trial →
                </button>
              </div>
              <button className="btn-outline" onClick={() => scrollTo("how-it-works")}>
                See How It Works
              </button>
            </div>
            <p style={{ fontSize: 12, color: C.dim }}>14-day free trial · No credit card · Live in 15 minutes</p>
          </Reveal>
        </div>

        <Reveal delay={500}>
          <div style={{ maxWidth: 600, margin: "60px auto 0" }}>
            <p style={{ fontSize: 12, color: C.dim, marginBottom: 14, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Live Demo — Watch It Auto-Update Per City</p>
            <LiveGeoDemo />
          </div>
        </Reveal>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: "60px 24px", backgroundColor: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 20 }}>
          {STATS.map((s, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="stat-card">
                <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 6, background: `linear-gradient(135deg, ${C.red}, ${C.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  <Counter end={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: "100px 24px", backgroundColor: C.bgAlt }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>HOW IT WORKS</p>
              <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, marginBottom: 14, letterSpacing: "-0.02em", color: C.navy }}>Live In One Afternoon</h2>
              <p style={{ color: C.muted, fontSize: 17, maxWidth: 420, margin: "0 auto" }}>Three steps. No developer. Google Ads and Bing Ads both ready.</p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 24 }}>
            {STEPS.map((s, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="card" style={{ height: "100%", position: "relative", overflow: "hidden" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${C.red}40`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(to bottom, ${C.red}, ${C.blue})`, borderRadius: "16px 0 0 16px" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingLeft: 12 }}>
                    <span style={{ fontSize: 28 }}>{s.icon}</span>
                    <span style={{ fontSize: 44, fontWeight: 900, color: C.red + "20", lineHeight: 1, letterSpacing: "-0.04em" }}>{s.n}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: C.navy, paddingLeft: 12 }}>{s.title}</h3>
                  <p style={{ color: C.muted, lineHeight: 1.75, fontSize: 14, paddingLeft: 12 }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "100px 24px", backgroundColor: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>FEATURES</p>
              <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, marginBottom: 14, letterSpacing: "-0.02em", color: C.navy }}>Built For Home Services</h2>
              <p style={{ color: C.muted, fontSize: 17, maxWidth: 420, margin: "0 auto" }}>Every feature is designed around how home service ads actually work.</p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="feature-card"
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = f.color + "40"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 50px rgba(10,31,61,0.12), 0 0 0 1px ${f.color}30`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.boxShadow = C.shadow; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: f.bg, border: `1px solid ${f.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "transform 0.3s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = "scale(1.15) rotate(-5deg)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = "scale(1) rotate(0)"}>
                      {f.icon}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: f.color, letterSpacing: "0.1em", backgroundColor: f.bg, border: `1px solid ${f.color}25`, borderRadius: 100, padding: "3px 9px" }}>{f.badge}</span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 9, color: C.navy }}>{f.title}</h3>
                  <p style={{ color: C.muted, lineHeight: 1.75, fontSize: 14 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ADS PLATFORM ── */}
      <section style={{ padding: "80px 24px", backgroundColor: C.bgAlt }}>
        <Reveal>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ position: "relative", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 24, padding: "52px 44px", textAlign: "center", overflow: "hidden", boxShadow: C.shadowMd }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: `linear-gradient(to bottom, ${C.red}, ${C.blue})` }} />
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, border: `1px solid ${C.red}12`, borderRadius: "50%", animation: "spin-slow 20s linear infinite", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -40, left: 20, width: 160, height: 160, border: `1px solid ${C.blue}10`, borderRadius: "50%", animation: "spin-slow 15s linear infinite reverse", pointerEvents: "none" }} />

              <p style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>🇺🇸 PLATFORM SUPPORT</p>
              <h2 style={{ fontSize: "clamp(22px,4vw,38px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em", color: C.navy }}>One Page. Two Platforms. Full Tracking.</h2>
              <p style={{ color: C.muted, fontSize: 16, marginBottom: 40, maxWidth: 500, margin: "0 auto 40px" }}>
                Most tools support Google only. LocalBoost captures GCLID and MSCLKID so your Bing Ads get the same conversion tracking as your Google campaigns.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 500, margin: "0 auto" }}>
                {[
                  { name: "Google Ads", color: "#4285F4", bg: "#EEF3FF", icon: "🔵", features: ["GCLID Capture","Full UTM Tracking","Offline Conversion Upload","Quality Score Boost"] },
                  { name: "Bing Ads",   color: C.blue,    bg: C.blueBg,  icon: "🔷", features: ["MSCLKID Capture","Full UTM Tracking","Offline Conversion Upload","Quality Score Boost"] },
                ].map(p => (
                  <div key={p.name} style={{ background: p.bg, border: `1px solid ${p.color}20`, borderRadius: 14, padding: 22, textAlign: "left", transition: "all 0.3s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${p.color}50`; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = C.shadowMd; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${p.color}20`; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>{p.icon} {p.name}</div>
                    {p.features.map(feat => (
                      <div key={feat} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, fontSize: 12, color: C.muted }}>
                        <span style={{ color: p.color, fontWeight: 700 }}>✓</span> {feat}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── VERTICALS ── */}
      <section style={{ padding: "80px 24px", backgroundColor: C.bg }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>VERTICALS</p>
              <h2 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 800, letterSpacing: "-0.02em", color: C.navy }}>Five Home Service Verticals. Ready To Launch.</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
            {VERTICALS.map((v, i) => (
              <Reveal key={i} delay={i * 70}>
                <div className="vertical-card">
                  <span className="v-emoji">{v.emoji}</span>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: C.navy }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{v.subs}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 24px", backgroundColor: C.bgAlt }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>PRICING</p>
              <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, marginBottom: 14, letterSpacing: "-0.02em", color: C.navy }}>Simple, Transparent Pricing</h2>
              <p style={{ color: C.muted, fontSize: 17, maxWidth: 360, margin: "0 auto" }}>14-day free trial. No credit card. Cancel anytime.</p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 22, alignItems: "start" }}>
            {PRICING.map((plan, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="pricing-card" style={{
                  background: plan.highlight ? C.navy : C.bg,
                  border: plan.highlight ? `2px solid ${C.navy}` : `1px solid ${C.border}`,
                  boxShadow: plan.highlight ? `0 20px 60px rgba(10,31,61,0.25)` : C.shadow,
                  position: "relative",
                }}>
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg, ${C.red}, ${C.redHover})`, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 18px", borderRadius: 100, letterSpacing: "0.06em", boxShadow: `0 4px 14px ${C.red}50`, whiteSpace: "nowrap" }}>
                      ⭐ MOST POPULAR
                    </div>
                  )}
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: plan.highlight ? "#fff" : C.navy }}>{plan.name}</h3>
                  <p style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.6)" : C.muted, marginBottom: 20 }}>{plan.desc}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 26 }}>
                    <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.04em", color: plan.highlight ? "#fff" : C.red }}>{plan.price}</span>
                    <span style={{ color: plan.highlight ? "rgba(255,255,255,0.5)" : C.muted, fontSize: 15 }}>{plan.period}</span>
                  </div>
                  <button style={{
                    width: "100%", padding: "13px 0", borderRadius: 11, fontFamily: "inherit", marginBottom: 26, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                    ...(plan.highlight
                      ? { background: `linear-gradient(135deg, ${C.red}, ${C.redHover})`, border: "none", color: "#fff", boxShadow: `0 6px 20px ${C.red}40` }
                      : { background: "#fff", border: `2px solid ${C.navy}`, color: C.navy }),
                  }}
                    onMouseEnter={e => { if (!plan.highlight) { (e.currentTarget as HTMLButtonElement).style.background = C.navy; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; } }}
                    onMouseLeave={e => { if (!plan.highlight) { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = C.navy; } }}>
                    {plan.cta}
                  </button>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
                    {plan.features.map((feat, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.75)" : C.muted }}>
                        <span style={{ color: plan.highlight ? "#fff" : C.red, flexShrink: 0, fontWeight: 700 }}>✓</span> {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "100px 24px", backgroundColor: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>RESULTS</p>
              <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, letterSpacing: "-0.02em", color: C.navy }}>What Our Customers Say</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 22 }}>
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="testimonial-card">
                  <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                    {[...Array(t.stars)].map((_, j) => <span key={j} style={{ color: "#F59E0B", fontSize: 16 }}>★</span>)}
                  </div>
                  <p style={{ color: C.muted, lineHeight: 1.8, fontSize: 14, marginBottom: 22, fontStyle: "italic" }}>"{t.quote}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${C.red}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{t.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{t.role} · {t.loc}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "100px 24px", backgroundColor: C.bgAlt }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>FAQ</p>
              <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, letterSpacing: "-0.02em", color: C.navy }}>Common Questions</h2>
            </div>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQS.map((faq, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="faq-item" style={{ borderColor: openFaq === i ? `${C.red}40` : C.border }}>
                  <button className="faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {faq.q}
                    <span style={{ color: openFaq === i ? C.red : C.dim, flexShrink: 0, fontSize: 22, fontWeight: 300, transform: openFaq === i ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.3s, color 0.2s" }}>+</span>
                  </button>
                  <div style={{ maxHeight: openFaq === i ? 300 : 0, overflow: "hidden", transition: "max-height 0.4s ease" }}>
                    <div style={{ padding: "0 22px 20px", paddingTop: 14, color: C.muted, fontSize: 14, lineHeight: 1.8, borderTop: `1px solid ${C.border}` }}>
                      {faq.a}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIGN UP ── */}
      <section id="signup" style={{ padding: "100px 24px", backgroundColor: C.navy, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-50%", right: "-10%", width: 500, height: 500, background: `radial-gradient(circle, ${C.red}20 0%, transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-30%", left: "-5%", width: 400, height: 400, background: `radial-gradient(circle, ${C.blueLight}20 0%, transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />

        <Reveal>
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", position: "relative" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: `${C.gold}20`, border: `1px solid ${C.gold}40`, borderRadius: 100, padding: "6px 18px", marginBottom: 24 }}>
              <span>⭐</span>
              <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>14-Day Free Trial — No Credit Card Required</span>
            </div>

            <h2 style={{ fontSize: "clamp(30px,5vw,56px)", fontWeight: 900, marginBottom: 16, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff" }}>
              One Page.<br />
              <span className="shimmer-usa">Every City.</span><br />
              Start Today. 🇺🇸
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 17, marginBottom: 36, lineHeight: 1.7 }}>
              Your page is live in under 15 minutes. Works with Google Ads and Bing Ads from day one.
            </p>

            <div style={{ display: "flex", gap: 10, maxWidth: 460, margin: "0 auto 14px", flexWrap: "wrap" }}>
              <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your work email"
                style={{ border: "2px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff" }} />
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", inset: -1, borderRadius: 13, background: `linear-gradient(135deg, ${C.red}, ${C.blueLight})`, opacity: 0.5, filter: "blur(8px)", animation: "glow-soft 2s ease-in-out infinite" }} />
                <button className="btn-primary" style={{ position: "relative", whiteSpace: "nowrap", borderRadius: 12 }}
                  onClick={() => window.location.href = `/login?email=${encodeURIComponent(email)}`}>
                  Get Started Free
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Join businesses across US, AU & CA · Cancel anytime</p>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: C.bgAlt, borderTop: `1px solid ${C.border}`, padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.red}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>L</div>
            <span style={{ fontWeight: 700, color: C.navyMid, fontSize: 14 }}>LocalBoost Engine 🇺🇸</span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {NAV.map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", transition: "color 0.2s", fontFamily: "inherit" }}
                onMouseEnter={e => (e.target as HTMLButtonElement).style.color = C.red}
                onMouseLeave={e => (e.target as HTMLButtonElement).style.color = C.muted}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, padding: "7px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => window.location.href = "/login"}>Log In</button>
            <button className="btn-primary" style={{ padding: "7px 18px", fontSize: 13, borderRadius: 8 }} onClick={() => scrollTo("signup")}>Get Started</button>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "20px auto 0", paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <p style={{ color: C.dim, fontSize: 12 }}>© 2026 LocalBoost Engine. All rights reserved. 🇺🇸 Made in the USA.</p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms of Service"].map(l => (
              <a key={l} href="#" style={{ color: C.dim, fontSize: 12, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.target as HTMLAnchorElement).style.color = C.red}
                onMouseLeave={e => (e.target as HTMLAnchorElement).style.color = C.dim}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}