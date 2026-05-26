import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Stethoscope, Zap, Building2, HeartPulse } from "lucide-react";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

type CareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

interface Props {
  onBack: () => void;
  onSelectSetting: (setting: CareSetting) => void;
}

// Domain colors match ProformaView CHART_COLORS for system-wide consistency
const DOMAINS = [
  {
    key: "capacity",
    name: "Capacity",
    color: "#EA2C00",
    lever: "time" as const,
    tagline: "More patients. Same physicians.",
    body: "When documentation burden lifts, encounter capacity expands without adding headcount. Physicians reclaim 60–90 minutes per shift that currently goes to note completion.",
    chain: ["Documentation time ↓ 60–90 min/shift", "Visit throughput ↑", "Patient access expands"],
  },
  {
    key: "workforce",
    name: "Workforce",
    color: "#7A1F04",
    lever: "time" as const,
    tagline: "Burnout reverses. Clinicians stay.",
    body: "Turnover costs $200K–$500K per physician. The primary driver is administrative burden. Ambient documentation attacks the root cause, not the symptom.",
    chain: ["After-hours documentation ↓", "Burnout pressure ↓", "Retention improves"],
  },
  {
    key: "revenue",
    name: "Revenue",
    color: "#1E3A5F",
    lever: "quality" as const,
    tagline: "The documentation you have is the revenue you keep.",
    body: "Notes written from full attention capture clinical specificity that memory-based notes miss. That specificity flows directly into coding accuracy, DRG weight, and denial rates.",
    chain: ["Clinical specificity ↑", "Coding accuracy ↑", "Denials and downgrades ↓"],
  },
  {
    key: "quality",
    name: "Quality",
    color: "#555555",
    lever: "quality" as const,
    tagline: "What gets captured gets acted on.",
    body: "Documentation quality and physician presence during the visit both improve. The note reflects reality — and reality improves because the physician's attention was fully present.",
    chain: ["Clinical complexity captured in full", "Care gaps identified in-visit", "Closure rates rise"],
  },
];

const STAGES = [
  {
    n: "01",
    range: "Months 1–3",
    label: "Fragments",
    description: "Individual note quality improves. Clinicians recover time daily. The signal is there — the pattern is not yet.",
  },
  {
    n: "02",
    range: "Months 4–12",
    label: "Patterns",
    description: "Coding trends shift. Denial rates begin to move. Retention data starts to reflect the change in the room.",
  },
  {
    n: "03",
    range: "Year 1–2",
    label: "Proof",
    description: "Longitudinal outcomes emerge. The model's assumptions become your organization's own data.",
  },
  {
    n: "04",
    range: "Year 3+",
    label: "Institution",
    description: "Clinical knowledge architecture changes. The conversation layer becomes infrastructure — not a tool you use, but a layer you rely on.",
  },
];

const SETTINGS = [
  { id: "outpatient" as const, name: "Outpatient", subtitle: "Primary care & specialty", icon: Stethoscope },
  { id: "ed" as const, name: "Emergency", subtitle: "Emergency department", icon: Zap },
  { id: "inpatient" as const, name: "Inpatient", subtitle: "Hospital medicine", icon: Building2 },
  { id: "nursing" as const, name: "Nursing", subtitle: "Inpatient nursing", icon: HeartPulse },
];

// ─── Particle Canvas ──────────────────────────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function setSize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    setSize();

    type P = { bx: number; by: number; fx: number; fy: number; ax: number; ay: number; ph: number; r: number; a: number };

    let pts: P[] = [];

    function initParticles() {
      const w = canvas!.width, h = canvas!.height;
      const n = Math.min(88, Math.floor((w * h) / 7200));
      pts = Array.from({ length: n }, () => ({
        bx: Math.random() * w,
        by: Math.random() * h,
        fx: 0.18 + Math.random() * 0.5,
        fy: 0.12 + Math.random() * 0.36,
        ax: 16 + Math.random() * 46,
        ay: 7 + Math.random() * 24,
        ph: Math.random() * Math.PI * 2,
        r: 0.6 + Math.random() * 1.9,
        a: 0.06 + Math.random() * 0.23,
      }));
    }
    initParticles();

    let t = 0;
    let raf: number;

    function frame() {
      t += 0.007;
      const w = canvas!.width, h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      const pos = pts.map(p => ({
        x: p.bx + Math.sin(t * p.fx + p.ph) * p.ax,
        y: p.by + Math.cos(t * p.fy + p.ph * 1.42) * p.ay,
        r: p.r,
        a: p.a,
      }));

      // Faint connection lines between nearby particles
      ctx!.lineWidth = 0.5;
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[j].x - pos[i].x;
          const dy = pos[j].y - pos[i].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 7225) { // 85px threshold
            const alpha = (1 - Math.sqrt(d2) / 85) * 0.055;
            ctx!.beginPath();
            ctx!.moveTo(pos[i].x, pos[i].y);
            ctx!.lineTo(pos[j].x, pos[j].y);
            ctx!.strokeStyle = `rgba(255, 241, 226, ${alpha})`;
            ctx!.stroke();
          }
        }
      }

      // Particles
      for (const p of pos) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 241, 226, ${p.a})`;
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }
    frame();

    const onResize = () => { setSize(); initParticles(); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ─── Domain Card ──────────────────────────────────────────────────────────────

function DomainCard({ d, i }: { d: typeof DOMAINS[0]; i: number }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.09, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative bg-white border border-[#E8E3DC] rounded-2xl overflow-hidden select-none"
      style={{
        boxShadow: hovered
          ? `0 16px 48px -10px ${d.color}28, 0 2px 8px rgba(0,0,0,0.06)`
          : "0 1px 4px rgba(0,0,0,0.04)",
        borderColor: hovered ? `${d.color}50` : undefined,
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        cursor: "default",
      }}
    >
      {/* Color cap */}
      <div className="h-[3px]" style={{ backgroundColor: d.color }} />

      <div className="p-7">
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className="mt-[3px] w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: d.color }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[10.5px] font-bold uppercase tracking-[2.5px] mb-2"
              style={{ color: d.color }}
            >
              {d.name}
            </p>
            <p className="text-[15px] font-semibold text-[#1A1A1A] leading-snug">
              {d.tagline}
            </p>
          </div>
        </div>

        <p className="text-[13px] text-[#787878] leading-relaxed pl-[22px]">
          {d.body}
        </p>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-5 pt-5 border-t border-[#F0EAE3] pl-[22px]">
                <p className="text-[9.5px] font-bold text-[#C0BAB3] uppercase tracking-[2.5px] mb-3">
                  Causal chain
                </p>
                <div className="flex flex-col gap-2.5">
                  {d.chain.map((node, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div
                        className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                        style={{ backgroundColor: d.color, opacity: 0.3 + idx * 0.25 }}
                      />
                      <span className="text-[12.5px] text-[#555555] leading-tight">{node}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function MethodologyFramework({ onBack, onSelectSetting }: Props) {
  const transRef = useRef<HTMLDivElement>(null);
  const leversRef = useRef<HTMLDivElement>(null);
  const longRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const transInView = useInView(transRef, { once: true, margin: "-80px" });
  const leversInView = useInView(leversRef, { once: true, margin: "-60px" });
  const longInView = useInView(longRef, { once: true, margin: "-60px" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-60px" });

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: "rgba(12,10,9,0.92)", borderColor: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-[1040px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <button onClick={onBack} className="cursor-pointer bg-transparent border-none p-0" data-testid="link-home-logo">
            <img src={abridgeLogo} alt="Abridge" className="h-5 brightness-0 invert" />
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[10.5px] font-medium uppercase tracking-[2.5px]" style={{ color: "rgba(255,255,255,0.28)" }}>
              Value Methodology
            </span>
            <span className="hidden sm:inline" style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.38)" }}
              data-testid="button-back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col overflow-hidden" style={{ minHeight: "92vh", backgroundColor: "#0C0A09" }}>
        <ParticleCanvas />
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-10 py-24">
          <motion.div
            className="max-w-[660px] text-center"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="inline-flex items-center gap-2.5 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              <div className="h-px w-8 bg-[#EA2C00]" />
              <span className="text-[10.5px] font-bold uppercase tracking-[3.5px] text-[#EA2C00]">
                The Value Framework
              </span>
              <div className="h-px w-8 bg-[#EA2C00]" />
            </motion.div>

            <h1 className="font-bold text-white leading-[1.0] tracking-[-0.025em] mb-8" style={{ fontSize: "clamp(44px, 6vw, 70px)" }}>
              Healthcare runs<br />on conversation.
            </h1>

            <p className="leading-[1.8] max-w-[490px] mx-auto" style={{ fontSize: 17, color: "rgba(255,255,255,0.42)" }}>
              4.3 billion clinical encounters, every year in the US. Each produces a note — written from memory, after the fact, by a clinician with twelve more patients today.
            </p>

            <motion.div
              className="mt-16 flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
            >
              <span className="text-[10px] uppercase tracking-[2.5px]" style={{ color: "rgba(255,255,255,0.18)" }}>Scroll</span>
              <motion.div
                className="w-px h-10 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
                animate={{ scaleY: [0.35, 1, 0.35], opacity: [0.25, 0.65, 0.25] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Transcription Layer ────────────────────────────────────────────── */}
      <section
        ref={transRef}
        className="py-28 px-6 md:px-10"
        style={{ backgroundColor: "#0C0A09", borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="max-w-[660px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={transInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[2.5px] mb-8" style={{ color: "rgba(255,255,255,0.22)" }}>
              The Intervention
            </p>
            <h2 className="font-bold text-white leading-[1.06] tracking-[-0.02em] mb-7" style={{ fontSize: "clamp(36px, 5vw, 54px)" }}>
              Abridge sits at<br />the transcription layer.
            </h2>
            <p className="leading-[1.8]" style={{ fontSize: 17, color: "rgba(255,255,255,0.4)" }}>
              Not a documentation tool. The layer where conversation becomes clinical record — automatically, in the room, as care happens. When that layer exists, everything downstream changes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Two Levers ─────────────────────────────────────────────────────── */}
      <section
        ref={leversRef}
        className="py-24 px-6 md:px-10"
        style={{ background: "linear-gradient(to bottom, #0C0A09 0%, #1C1008 45%, #F5F0EB 100%)" }}
      >
        <div className="max-w-[960px] mx-auto">
          <motion.p
            className="text-center text-[10.5px] font-semibold uppercase tracking-[2.5px] mb-14"
            style={{ color: "rgba(255,255,255,0.25)" }}
            initial={{ opacity: 0 }}
            animate={leversInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
          >
            Two mechanisms. Four outcomes.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Time lever */}
            <motion.div
              className="rounded-2xl p-9 border"
              style={{ backgroundColor: "rgba(12,10,9,0.75)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
              initial={{ opacity: 0, x: -20 }}
              animate={leversInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[2.5px] mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                Lever 1
              </p>
              <h3 className="text-[28px] font-bold text-white leading-[1.1] tracking-tight mb-4">
                Time returned<br />to clinicians.
              </h3>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.38)" }}>
                Documentation takes 60–90 minutes per shift. When that time returns, two value pools open.
              </p>
              <div className="flex gap-2.5">
                {DOMAINS.filter(d => d.lever === "time").map(d => (
                  <div
                    key={d.key}
                    className="flex-1 rounded-xl px-3.5 py-3 border"
                    style={{ backgroundColor: `${d.color}1a`, borderColor: "rgba(255,255,255,0.09)" }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[2px] mb-1" style={{ color: d.color }}>
                      {d.name}
                    </p>
                    <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {d.tagline}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quality lever */}
            <motion.div
              className="rounded-2xl p-9 border"
              style={{ backgroundColor: "rgba(12,10,9,0.75)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
              initial={{ opacity: 0, x: 20 }}
              animate={leversInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.18, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[2.5px] mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
                Lever 2
              </p>
              <h3 className="text-[28px] font-bold text-white leading-[1.1] tracking-tight mb-4">
                Documentation<br />reflects reality.
              </h3>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.38)" }}>
                Notes written with full attention capture what memory misses. Accuracy flows downstream into revenue and outcomes.
              </p>
              <div className="flex gap-2.5">
                {DOMAINS.filter(d => d.lever === "quality").map(d => (
                  <div
                    key={d.key}
                    className="flex-1 rounded-xl px-3.5 py-3 border"
                    style={{ backgroundColor: `${d.color}22`, borderColor: "rgba(255,255,255,0.09)" }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[2px] mb-1" style={{ color: d.color === "#555555" ? "#AAAAAA" : d.color }}>
                      {d.name}
                    </p>
                    <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {d.tagline}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Four Domains ───────────────────────────────────────────────────── */}
      <section className="bg-[#F5F0EB] py-24 px-6 md:px-10">
        <div className="max-w-[960px] mx-auto">
          <div className="mb-11">
            <p className="text-[10.5px] font-bold text-[#EA2C00] uppercase tracking-[2.5px] mb-3">
              Four Domains
            </p>
            <h2 className="text-[36px] font-bold text-[#1A1A1A] leading-tight tracking-tight">
              Hover each domain to see the<br className="hidden md:inline" /> causal chain.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOMAINS.map((d, i) => <DomainCard key={d.key} d={d} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── Longitudinal Arc ───────────────────────────────────────────────── */}
      <section
        ref={longRef}
        className="bg-white py-24 px-6 md:px-10"
        style={{ borderTop: "1px solid #EDE8E2" }}
      >
        <div className="max-w-[960px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={longInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-14"
          >
            <p className="text-[10.5px] font-bold text-[#EA2C00] uppercase tracking-[2.5px] mb-3">
              The Arc
            </p>
            <h2 className="text-[36px] font-bold text-[#1A1A1A] leading-tight tracking-tight mb-4">
              Value deepens as conversations<br className="hidden md:inline" /> accumulate.
            </h2>
            <p className="text-[16px] text-[#888888] leading-relaxed max-w-[520px]">
              The transcription layer is an evidence engine. What you can measure — and claim — grows with every conversation captured.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
            {STAGES.map((stage, i) => (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, y: 18 }}
                animate={longInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.12 + i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex md:flex-col items-start gap-4 mb-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#F5F0EB] border border-[#E5DDD5] flex items-center justify-center">
                    <span className="text-[11px] font-bold text-[#AAAAAA]">{stage.n}</span>
                  </div>
                  <div className="md:mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#BBBBBB] mb-1">
                      {stage.range}
                    </p>
                    <p className="text-[19px] font-bold text-[#1A1A1A] leading-tight">
                      {stage.label}
                    </p>
                  </div>
                </div>
                <p className="text-[13px] text-[#888888] leading-relaxed pl-14 md:pl-0">
                  {stage.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Settings CTA ───────────────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        className="bg-[#FAF7F4] py-24 px-6 md:px-10"
        style={{ borderTop: "1px solid #EDE8E2" }}
      >
        <div className="max-w-[960px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <p className="text-[10.5px] font-bold text-[#EA2C00] uppercase tracking-[2.5px] mb-3">
              Explore the Methodology
            </p>
            <h2 className="text-[36px] font-bold text-[#1A1A1A] leading-tight tracking-tight mb-3">
              Pick your setting.
            </h2>
            <p className="text-[16px] text-[#888888] leading-relaxed">
              Each care setting has its own drivers, benchmarks, and causal chains.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SETTINGS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={ctaInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => onSelectSetting(s.id)}
                  className="group bg-white border border-[#E5E5E5] hover:border-[#EA2C00] rounded-xl p-6 text-left transition-all duration-200"
                  data-testid={`button-setting-${s.id}`}
                >
                  <div className="w-10 h-10 bg-[#F5F0EB] group-hover:bg-[#EA2C00]/10 rounded-lg flex items-center justify-center mb-4 transition-colors">
                    <Icon className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-0.5 text-[15px]">{s.name}</h3>
                  <p className="text-[13px] text-[#888888] mb-4">{s.subtitle}</p>
                  <div className="flex items-center gap-1 text-[#EA2C00] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[13px] font-medium">Explore</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
