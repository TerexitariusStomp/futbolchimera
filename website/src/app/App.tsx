import { useState, useEffect, useRef } from "react";
import { Github, ChevronRight, Zap, Wifi, Cpu, Smartphone, BookOpen, Terminal, ArrowUpRight, Copy, Check } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import logoSrc from "@/imports/image.png";

const HERO_IMG = "https://images.unsplash.com/photo-1760384702320-a7409c8b4f37?w=1800&h=1000&fit=crop&auto=format";

// Gold = primary accent, Blue = secondary accent
const GOLD = "#f5c800";
const BLUE = "#1a5aff";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-muted-foreground hover:text-primary transition-colors p-1"
      aria-label="Copy"
    >
      {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
    </button>
  );
}

const FEATURES = [
  {
    icon: Zap,
    num: "01",
    title: "AI Coach",
    body: "Tactical Q&A, substitution recommendations, and formation advice powered by localized soccer prompts running entirely on-device.",
    tag: "On-device LLM",
    color: GOLD,
  },
  {
    icon: BookOpen,
    num: "02",
    title: "Analytics Reference",
    body: "Full coverage of xG, passing networks, pitch control, and shot maps — surfaced contextually as you analyze matches.",
    tag: "xG · Pitch Control",
    color: GOLD,
  },
  {
    icon: Wifi,
    num: "03",
    title: "P2P Swarming",
    body: "Device-to-device sync of notes and tactics via Pear/Hyperswarm networking — no server required on the sideline.",
    tag: "Hyperswarm",
    color: BLUE,
  },
  {
    icon: Smartphone,
    num: "04",
    title: "Cross-platform",
    body: "Built with Expo SDK 52 and React Native 0.76 targeting iOS and Android, plus a legacy Capacitor app for older setups.",
    tag: "Expo · Capacitor",
    color: GOLD,
  },
  {
    icon: Cpu,
    num: "05",
    title: "On-device AI",
    body: "Local inference through QVAC/BareKit with seamless cloud API fallback when heavier models are needed.",
    tag: "QVAC · BareKit",
    color: GOLD,
  },
];

const SUBMODULES = [
  { name: "AI-SoccerCoach", desc: "Localized coaching prompts and tactical Q&A engine", tag: "Core", color: GOLD },
  { name: "analytics-handbook", desc: "xG, passing networks, pitch control, shot map theory", tag: "Reference", color: GOLD },
  { name: "football-analytics-tutorials", desc: "Step-by-step walkthroughs of advanced match analysis", tag: "Learning", color: BLUE },
];

const TEMPLATES = [
  {
    name: "Match Analysis",
    fields: ["Opposition shape", "Press triggers", "Set-piece patterns", "Transition phases"],
    color: GOLD,
  },
  {
    name: "Player Evaluation",
    fields: ["Positional heat maps", "Pass completion by zone", "Pressing intensity", "Duel win rate"],
    color: BLUE,
  },
  {
    name: "Tactical Plan",
    fields: ["Formation scaffold", "High-press triggers", "Build-up patterns", "Dead-ball routines"],
    color: "#22cc66",
  },
];

const BUILD_STEPS = [
  { cmd: "git clone --recurse-submodules https://github.com/localchimera/futbol", comment: "# clone with submodules" },
  { cmd: "cd futbol/mobile-expo && npm install", comment: "# install deps" },
  { cmd: "npx expo run:android", comment: "# launch on Android" },
  { cmd: "npx expo run:ios", comment: "# launch on iOS" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(6,26,14,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(245,200,0,0.12)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo lockup */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: `1.5px solid rgba(245,200,0,0.35)` }}>
            <ImageWithFallback
              src={logoSrc}
              alt="FutbolChimera crest — lion, goat and dragon with a soccer ball"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-['Barlow_Condensed'] font-bold text-xl tracking-wider text-foreground">
            FUTBOL<span style={{ color: GOLD }}>CHIMERA</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Apps", "Resources", "Templates", "Build"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide font-['DM_Sans']"
            >
              {item}
            </a>
          ))}
        </div>

        <a
          href="https://github.com/localchimera/futbol"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-foreground text-sm font-['DM_Sans'] tracking-wide transition-all duration-200"
          style={{ border: "1px solid rgba(245,200,0,0.25)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.color = GOLD; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,200,0,0.25)"; (e.currentTarget as HTMLElement).style.color = "#f0e8d0"; }}
        >
          <Github size={15} />
          GitHub
        </a>
      </div>
    </nav>
  );
}

function Hero() {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Pitch photo */}
      <div className="absolute inset-0 bg-[#061a0e]">
        <img
          src={HERO_IMG}
          alt="Aerial view of a floodlit soccer pitch at night"
          onLoad={() => setLoaded(true)}
          className="w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: loaded ? 0.14 : 0, filter: "hue-rotate(140deg) saturate(0.6)" }}
        />
        {/* Gold vignette from bottom */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 80%, rgba(245,200,0,0.05) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #061a0e 0%, transparent 18%, transparent 68%, #061a0e 100%)" }} />
      </div>

      {/* Pitch SVG lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.035 }} preserveAspectRatio="xMidYMid slice">
        <rect width="100%" height="100%" fill="none" stroke={GOLD} strokeWidth="1"/>
        <ellipse cx="50%" cy="50%" rx="120" ry="120" fill="none" stroke={GOLD} strokeWidth="1"/>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke={GOLD} strokeWidth="1"/>
        <rect x="5%" y="20%" width="15%" height="60%" fill="none" stroke={GOLD} strokeWidth="1"/>
        <rect x="80%" y="20%" width="15%" height="60%" fill="none" stroke={GOLD} strokeWidth="1"/>
        <rect x="5%" y="35%" width="6%" height="30%" fill="none" stroke={GOLD} strokeWidth="1"/>
        <rect x="89%" y="35%" width="6%" height="30%" fill="none" stroke={GOLD} strokeWidth="1"/>
      </svg>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-[1fr,340px] gap-12 items-center">
          {/* Left: text */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-6 h-px" style={{ background: GOLD }} />
              <span className="font-['JetBrains_Mono'] text-xs tracking-[0.2em] uppercase" style={{ color: GOLD }}>Soccer Intelligence Platform</span>
            </div>

            <h1
              className="font-['Barlow_Condensed'] font-black text-foreground leading-[0.88] mb-8"
              style={{ fontSize: "clamp(3.8rem, 9vw, 8.5rem)", letterSpacing: "-0.01em" }}
            >
              SOCCER<br />
              <span style={{ color: GOLD }} className="italic">INTELLIGENCE,</span><br />
              ON-DEVICE.
            </h1>

            <p className="font-['DM_Sans'] text-muted-foreground text-lg max-w-xl mb-10 leading-relaxed">
              AI coaching, match analytics, and peer-to-peer team sync — all running locally on iOS and Android.
            </p>

            <div className="flex flex-wrap gap-4 mb-20">
              <a
                href="#build"
                className="flex items-center gap-2 px-7 py-3.5 font-['DM_Sans'] font-semibold text-sm tracking-wide transition-opacity hover:opacity-90"
                style={{ background: GOLD, color: "#0a1205" }}
              >
                Get Started <ChevronRight size={16} />
              </a>
              <a
                href="#features"
                className="flex items-center gap-2 px-7 py-3.5 font-['DM_Sans'] font-semibold text-sm tracking-wide text-foreground transition-all hover:text-primary"
                style={{ border: "1px solid rgba(245,200,0,0.3)" }}
              >
                Explore Features
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "rgba(245,200,0,0.1)" }}>
              {[
                { label: "Submodules", value: 4, suffix: "" },
                { label: "CV Model FPS", value: 30, suffix: "fps" },
                { label: "Platforms", value: 2, suffix: "" },
                { label: "Templates", value: 3, suffix: "" },
              ].map(({ label, value, suffix }) => (
                <div key={label} className="bg-card p-5">
                  <div className="font-['Barlow_Condensed'] font-bold text-4xl leading-none mb-1" style={{ color: GOLD }}>
                    <Counter target={value} suffix={suffix} />
                  </div>
                  <div className="font-['JetBrains_Mono'] text-muted-foreground text-xs tracking-widest uppercase">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: large logo crest */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-72 h-72">
              {/* Glow ring behind logo */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 80px 20px rgba(245,200,0,0.12), 0 0 160px 40px rgba(245,200,0,0.06)` }}
              />
              <ImageWithFallback
                src={logoSrc}
                alt="FutbolChimera crest — lion, goat and dragon with a soccer ball"
                className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
                style={{ filter: "drop-shadow(0 0 24px rgba(245,200,0,0.3))" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const { ref, inView } = useInView();
  return (
    <section id="features" className="py-32 max-w-7xl mx-auto px-6" ref={ref}>
      <div className="flex items-end justify-between mb-16 pb-8" style={{ borderBottom: "1px solid rgba(245,200,0,0.14)" }}>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-px" style={{ background: GOLD }} />
            <span className="font-['JetBrains_Mono'] text-xs tracking-[0.2em] uppercase" style={{ color: GOLD }}>Core Capabilities</span>
          </div>
          <h2 className="font-['Barlow_Condensed'] font-black text-foreground leading-none" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
            BUILT FOR<br />THE PITCH
          </h2>
        </div>
        <p className="hidden md:block font-['DM_Sans'] text-muted-foreground text-sm max-w-xs text-right leading-relaxed">
          Six capabilities engineered to run at match pace, on the devices already in your kit bag.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-px" style={{ background: "rgba(245,200,0,0.08)" }}>
        {FEATURES.map(({ icon: Icon, num, title, body, tag, color }, i) => (
          <div
            key={num}
            className="bg-card p-8 group cursor-default transition-all duration-300"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(24px)",
              transition: `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s, background-color 0.2s`,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#0f2d1a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
          >
            <div className="flex items-start justify-between mb-6">
              <div
                className="w-10 h-10 flex items-center justify-center transition-colors"
                style={{ border: `1px solid rgba(245,200,0,0.15)` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <span className="font-['JetBrains_Mono'] text-muted-foreground/40 text-xs">{num}</span>
            </div>
            <h3 className="font-['Barlow_Condensed'] font-bold text-2xl text-foreground mb-3 tracking-wide uppercase">{title}</h3>
            <p className="font-['DM_Sans'] text-muted-foreground text-sm leading-relaxed mb-6">{body}</p>
            <span
              className="font-['JetBrains_Mono'] text-xs px-2 py-1 inline-block"
              style={{ color: `${color}99`, border: `1px solid ${color}22` }}
            >
              {tag}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Apps() {
  const { ref, inView } = useInView();
  return (
    <section id="apps" className="py-32" style={{ background: "rgba(15,45,26,0.4)" }} ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-px" style={{ background: GOLD }} />
          <span className="font-['JetBrains_Mono'] text-xs tracking-[0.2em] uppercase" style={{ color: GOLD }}>Codebases</span>
        </div>
        <h2 className="font-['Barlow_Condensed'] font-black text-foreground leading-none mb-16" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
          TWO CODEBASES,<br />ONE GOAL
        </h2>

        <div className="grid md:grid-cols-2 gap-px" style={{ background: "rgba(245,200,0,0.1)" }}>
          {/* Current */}
          <div
            className="bg-card p-10"
            style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateX(-20px)", transition: "all 0.6s ease" }}
          >
            <div className="flex items-center gap-3 mb-8">
              <span
                className="font-['JetBrains_Mono'] text-xs px-2 py-0.5"
                style={{ color: GOLD, background: "rgba(245,200,0,0.08)", border: `1px solid rgba(245,200,0,0.3)` }}
              >
                CURRENT
              </span>
              <span className="font-['JetBrains_Mono'] text-muted-foreground text-xs">io.chimera.mobile</span>
            </div>
            <h3 className="font-['Barlow_Condensed'] font-bold text-4xl text-foreground mb-2 uppercase tracking-wide">mobile-expo</h3>
            <p className="font-['DM_Sans'] text-muted-foreground text-sm mb-8 leading-relaxed">
              The primary codebase. Expo SDK 52 with React Native 0.76, targeting modern iOS and Android builds with full on-device AI support.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["SDK", "Expo 52"],
                ["Runtime", "RN 0.76"],
                ["AI", "QVAC / BareKit"],
                ["Sync", "Hyperswarm"],
              ].map(([k, v]) => (
                <div key={k} className="p-3" style={{ border: "1px solid rgba(245,200,0,0.12)" }}>
                  <div className="font-['JetBrains_Mono'] text-muted-foreground text-xs mb-1">{k}</div>
                  <div className="font-['DM_Sans'] text-foreground text-sm font-medium">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Legacy */}
          <div
            className="bg-card p-10"
            style={{ opacity: inView ? 0.5 : 0, transform: inView ? "none" : "translateX(20px)", transition: "all 0.6s ease 0.1s" }}
          >
            <div className="flex items-center gap-3 mb-8">
              <span
                className="font-['JetBrains_Mono'] text-xs px-2 py-0.5 text-muted-foreground"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                LEGACY
              </span>
            </div>
            <h3 className="font-['Barlow_Condensed'] font-bold text-4xl text-foreground mb-2 uppercase tracking-wide">mobile</h3>
            <p className="font-['DM_Sans'] text-muted-foreground text-sm mb-8 leading-relaxed">
              Original implementation using Capacitor with native iOS/Android bridges. Maintained for compatibility with existing deployments.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Framework", "Capacitor"],
                ["Targets", "iOS · Android"],
                ["Status", "Maintained"],
                ["Bundle", "—"],
              ].map(([k, v]) => (
                <div key={k} className="p-3" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="font-['JetBrains_Mono'] text-muted-foreground text-xs mb-1">{k}</div>
                  <div className="font-['DM_Sans'] text-foreground/50 text-sm font-medium">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Resources() {
  const { ref, inView } = useInView();
  return (
    <section id="resources" className="py-32 max-w-7xl mx-auto px-6" ref={ref}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-px" style={{ background: GOLD }} />
        <span className="font-['JetBrains_Mono'] text-xs tracking-[0.2em] uppercase" style={{ color: GOLD }}>Integrated Libraries</span>
      </div>
      <h2 className="font-['Barlow_Condensed'] font-black text-foreground leading-none mb-16" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
        SUBMODULES
      </h2>
      <div className="grid md:grid-cols-4 gap-px" style={{ background: "rgba(245,200,0,0.08)" }}>
        {SUBMODULES.map(({ name, desc, tag, color }, i) => (
          <div
            key={name}
            className="bg-card p-6 group cursor-default transition-colors duration-200"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "none" : "translateY(16px)",
              transition: `all 0.45s ease ${i * 0.08}s`,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#0f2d1a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
          >
            <div className="flex items-start justify-between mb-4">
              <span
                className="font-['JetBrains_Mono'] text-xs px-2 py-0.5"
                style={{ color: `${color}88`, border: `1px solid ${color}22` }}
              >
                {tag}
              </span>
              <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
            </div>
            <h3 className="font-['Barlow_Condensed'] font-bold text-xl text-foreground mb-2 uppercase tracking-wide">{name}</h3>
            <p className="font-['DM_Sans'] text-muted-foreground text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Templates() {
  const [active, setActive] = useState(0);
  const { ref, inView } = useInView();
  const t = TEMPLATES[active];
  return (
    <section id="templates" className="py-32" style={{ background: "rgba(15,45,26,0.4)" }} ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-px" style={{ background: GOLD }} />
          <span className="font-['JetBrains_Mono'] text-xs tracking-[0.2em] uppercase" style={{ color: GOLD }}>AI-filled Templates</span>
        </div>
        <h2 className="font-['Barlow_Condensed'] font-black text-foreground leading-none mb-16" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
          TEMPLATE<br />LIBRARY
        </h2>

        <div
          className="grid md:grid-cols-[280px,1fr] gap-px"
          style={{ background: "rgba(245,200,0,0.08)", opacity: inView ? 1 : 0, transition: "opacity 0.6s ease" }}
        >
          {/* Tabs */}
          <div className="bg-card flex flex-col">
            {TEMPLATES.map(({ name, color }, i) => (
              <button
                key={name}
                onClick={() => setActive(i)}
                className="flex items-center justify-between px-6 py-5 text-left transition-all duration-150"
                style={{
                  background: active === i ? `${color}08` : "transparent",
                  borderLeft: active === i ? `2px solid ${color}` : "2px solid transparent",
                  borderBottom: "1px solid rgba(245,200,0,0.08)",
                }}
              >
                <span
                  className="font-['Barlow_Condensed'] font-bold text-lg uppercase tracking-wide transition-colors"
                  style={{ color: active === i ? color : "#5e8a6e" }}
                >
                  {name}
                </span>
                <ChevronRight
                  size={14}
                  style={{ color, opacity: active === i ? 1 : 0.25, transform: active === i ? "translateX(2px)" : "none", transition: "all 0.2s" }}
                />
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="bg-card p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              <span className="font-['JetBrains_Mono'] text-xs text-muted-foreground tracking-widest uppercase">{t.name}.md</span>
            </div>
            <div className="space-y-1">
              <div className="font-['JetBrains_Mono'] text-muted-foreground text-xs mb-4">{"# " + t.name}</div>
              {t.fields.map((field) => (
                <div
                  key={field}
                  className="flex items-center gap-3 py-3"
                  style={{ borderBottom: "1px solid rgba(245,200,0,0.07)" }}
                >
                  <div className="w-1 h-1 rounded-full" style={{ background: t.color }} />
                  <span className="font-['DM_Sans'] text-foreground text-sm">{field}</span>
                  <span className="ml-auto font-['JetBrains_Mono'] text-muted-foreground/40 text-xs">AI-filled</span>
                </div>
              ))}
            </div>
            <p className="font-['DM_Sans'] text-muted-foreground text-sm mt-6 leading-relaxed">
              Auto-filled by the AI coach using match context. Export as markdown or share via P2P sync to the squad.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Build() {
  const { ref, inView } = useInView();
  return (
    <section id="build" className="py-32 max-w-7xl mx-auto px-6" ref={ref}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-px" style={{ background: GOLD }} />
        <span className="font-['JetBrains_Mono'] text-xs tracking-[0.2em] uppercase" style={{ color: GOLD }}>Quick Start</span>
      </div>
      <h2 className="font-['Barlow_Condensed'] font-black text-foreground leading-none mb-16" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
        BUILD &<br />RUN
      </h2>

      <div
        className="bg-card overflow-hidden"
        style={{
          border: "1px solid rgba(245,200,0,0.14)",
          opacity: inView ? 1 : 0,
          transform: inView ? "none" : "translateY(20px)",
          transition: "all 0.6s ease",
        }}
      >
        {/* Terminal titlebar */}
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderBottom: "1px solid rgba(245,200,0,0.1)", background: "rgba(245,200,0,0.03)" }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: `${GOLD}99` }} />
          <span className="font-['JetBrains_Mono'] text-muted-foreground text-xs ml-3">bash</span>
          <Terminal size={11} className="text-muted-foreground ml-1" />
        </div>

        {/* Commands */}
        <div className="p-8 space-y-4">
          {BUILD_STEPS.map(({ cmd, comment }, i) => (
            <div
              key={i}
              className="group flex items-start gap-4"
              style={{ opacity: inView ? 1 : 0, transition: `opacity 0.4s ease ${0.2 + i * 0.1}s` }}
            >
              <span className="font-['JetBrains_Mono'] text-sm select-none mt-px" style={{ color: `${GOLD}60` }}>$</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <code className="font-['JetBrains_Mono'] text-foreground text-sm">{cmd}</code>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={cmd} />
                  </div>
                </div>
                <div className="font-['JetBrains_Mono'] text-muted-foreground/40 text-xs mt-1">{comment}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(245,200,0,0.12)" }} className="py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: `1.5px solid rgba(245,200,0,0.3)` }}
          >
            <ImageWithFallback
              src={logoSrc}
              alt="FutbolChimera crest"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="font-['Barlow_Condensed'] font-bold text-base tracking-wider text-foreground">
              FUTBOL<span style={{ color: GOLD }}>CHIMERA</span>
            </div>
            <p className="font-['DM_Sans'] text-muted-foreground text-xs">Extracted from LocalChimera · © 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: "GitHub", href: "https://github.com/localchimera/futbol" },
            { label: "Chimera", href: "https://localchimera.com" },
            { label: "Contact", href: "mailto:hello@localchimera.com" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="font-['DM_Sans'] text-muted-foreground text-sm flex items-center gap-1 group transition-colors"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = ""; }}
            >
              {label}
              <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="bg-background text-foreground min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(245,200,0,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(245,200,0,0.4); }
      `}</style>
      <Nav />
      <Hero />
      <Features />
      <Apps />
      <Resources />
      <Templates />
      <Build />
      <Footer />
    </div>
  );
}
