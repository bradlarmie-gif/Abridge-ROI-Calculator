import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Stethoscope, Zap, Building2, HeartPulse } from "lucide-react";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

type CareSetting = "outpatient" | "ed" | "inpatient" | "nursing";
interface Props { onBack: () => void; onSelectSetting: (s: CareSetting) => void; }

const DOMAINS = [
  {
    key: "capacity", name: "Capacity", color: "#EA2C00", lever: "time" as const,
    tagline: "More patients. Same physicians.",
    body: "Documentation takes 60–90 minutes per shift. When that time returns, encounter capacity expands — without adding headcount.",
    chain: ["Documentation time ↓ 60–90 min/shift", "Visit throughput increases", "Patient access expands"],
  },
  {
    key: "workforce", name: "Workforce", color: "#9B2B0A", lever: "time" as const,
    tagline: "Burnout reverses. Clinicians stay.",
    body: "Turnover costs $200K–$500K per physician. The primary driver is administrative burden. Ambient documentation attacks the root cause.",
    chain: ["After-hours documentation eliminated", "Burnout pressure decreases", "Retention improves"],
  },
  {
    key: "revenue", name: "Revenue", color: "#1E3A5F", lever: "quality" as const,
    tagline: "The documentation you have is the revenue you keep.",
    body: "Notes written from full attention capture clinical specificity that memory-based notes miss. That specificity flows directly into coding accuracy and claim defense.",
    chain: ["Clinical specificity captured in full", "Coding accuracy improves", "Denials and downgrades fall"],
  },
  {
    key: "quality", name: "Quality", color: "#333333", lever: "quality" as const,
    tagline: "What gets captured gets acted on.",
    body: "Documentation quality and physician presence during the visit both improve — the note reflects reality, and reality improves because attention was present.",
    chain: ["Clinical complexity documented", "Care gaps identified during the visit", "Closure rates rise"],
  },
];

const STAGES = [
  { n: "01", range: "Months 1–3", label: "Fragments", description: "Individual note quality improves. Clinicians recover time daily. The signal is present — the pattern is not yet." },
  { n: "02", range: "Months 4–12", label: "Patterns", description: "Coding trends shift. Denial rates begin to move. Retention data starts to reflect what changed in the room." },
  { n: "03", range: "Year 1–2", label: "Proof", description: "Longitudinal outcomes emerge. The model's assumptions become your organization's own data." },
  { n: "04", range: "Year 3+", label: "Institution", description: "Clinical knowledge architecture transforms. The conversation layer becomes infrastructure — not a tool, a layer." },
];

const SETTINGS = [
  { id: "outpatient" as const, name: "Outpatient", subtitle: "Primary care & specialty", icon: Stethoscope },
  { id: "ed" as const, name: "Emergency", subtitle: "Emergency department", icon: Zap },
  { id: "inpatient" as const, name: "Inpatient", subtitle: "Hospital medicine", icon: Building2 },
  { id: "nursing" as const, name: "Nursing", subtitle: "Inpatient nursing", icon: HeartPulse },
];

// ─── Particle Canvas ─────────────────────────────────────────────────────────
// Warm glowing conversation particles — the visual core of this page

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

    type P = { bx: number; by: number; fx: number; fy: number; ax: number; ay: number; ph: number; r: number; a: number; glow: boolean };

    let pts: P[] = [];

    function initParticles() {
      const w = canvas!.width, h = canvas!.height;
      const n = Math.min(380, Math.floor((w * h) / 4500));
      pts = Array.from({ length: n }, () => {
        const a = 0.28 + Math.random() * 0.58;
        return {
          bx: Math.random() * w,
          by: Math.random() * h,
          fx: 0.18 + Math.random() * 0.48,
          fy: 0.12 + Math.random() * 0.36,
          ax: 22 + Math.random() * 58,
          ay: 10 + Math.random() * 28,
          ph: Math.random() * Math.PI * 2,
          r: 1.4 + Math.random() * 3.2,
          a,
          glow: a > 0.6,
        };
      });
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
        r: p.r, a: p.a, glow: p.glow,
      }));

      // Connection lines
      ctx!.lineWidth = 0.6;
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[j].x - pos[i].x;
          const dy = pos[j].y - pos[i].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 11025) { // 105px
            const alpha = (1 - Math.sqrt(d2) / 105) * 0.16;
            ctx!.beginPath();
            ctx!.moveTo(pos[i].x, pos[i].y);
            ctx!.lineTo(pos[j].x, pos[j].y);
            ctx!.strokeStyle = `rgba(195, 205, 225, ${alpha})`;
            ctx!.stroke();
          }
        }
      }

      // Glow particles (brighter subset — rendered with shadow)
      ctx!.shadowBlur = 10;
      ctx!.shadowColor = "rgba(170, 185, 220, 0.65)";
      for (const p of pos.filter(p => p.glow)) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(215, 222, 238, ${p.a})`;
        ctx!.fill();
      }

      // Regular particles (no shadow — cheaper)
      ctx!.shadowBlur = 0;
      for (const p of pos.filter(p => !p.glow)) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(190, 198, 218, ${p.a})`;
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }
    frame();

    const onResize = () => { setSize(); initParticles(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ─── Animated Causal Chain ────────────────────────────────────────────────────

function CausalChain({ chain, color, active }: { chain: string[]; color: string; active: boolean }) {
  return (
    <div className="flex flex-col">
      {chain.map((node, i) => (
        <div key={i}>
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ delay: i * 0.14, duration: 0.28, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            <div
              className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
              style={{ borderColor: color, color, backgroundColor: `${color}12` }}
            >
              {i + 1}
            </div>
            <span className="text-[12.5px] text-[#4A4A4A] leading-tight">{node}</span>
          </motion.div>
          {i < chain.length - 1 && (
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={active ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
              transition={{ delay: i * 0.14 + 0.1, duration: 0.18 }}
              className="ml-[9px] w-px h-4 origin-top"
              style={{ backgroundColor: `${color}35` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Domain Card ──────────────────────────────────────────────────────────────

function DomainCard({ d, i }: { d: typeof DOMAINS[0]; i: number }) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative bg-white rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${active ? d.color + "55" : "#E8E3DC"}`,
        boxShadow: active
          ? `0 20px 56px -12px ${d.color}30, 0 4px 12px rgba(0,0,0,0.07)`
          : "0 2px 6px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.35s ease, border-color 0.25s ease",
      }}
    >
      {/* Color band */}
      <motion.div
        className="h-[3px] w-full"
        style={{ backgroundColor: d.color }}
        animate={{ opacity: active ? 1 : 0.55 }}
      />

      {/* Subtle color wash on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${d.color}06 0%, transparent 60%)` }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative p-7">
        {/* Label */}
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: d.color }}
            animate={{ scale: active ? 1.3 : 1 }}
            transition={{ duration: 0.2 }}
          />
          <p className="text-[10.5px] font-bold uppercase tracking-[2.5px]" style={{ color: d.color }}>
            {d.name}
          </p>
        </div>

        <p className="text-[16px] font-bold text-[#1A1A1A] leading-snug mb-3">
          {d.tagline}
        </p>

        <p className="text-[13px] text-[#787878] leading-relaxed">
          {d.body}
        </p>

        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-5 pt-5 border-t border-[#F0EAE2]">
                <p className="text-[9.5px] font-bold text-[#C5BEB5] uppercase tracking-[2.5px] mb-4">
                  Causal chain
                </p>
                <CausalChain chain={d.chain} color={d.color} active={active} />
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
  const leversRef = useRef<HTMLDivElement>(null);
  const domainsRef = useRef<HTMLDivElement>(null);
  const longRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const leversInView = useInView(leversRef, { once: true, margin: "-60px" });
  const longInView = useInView(longRef, { once: true, margin: "-60px" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-60px" });

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: "rgba(10, 8, 7, 0.9)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <button onClick={onBack} className="cursor-pointer bg-transparent border-none p-0" data-testid="link-home-logo">
            <img src={abridgeLogo} alt="Abridge" className="h-[18px] brightness-0 invert" />
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[2.5px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              Value Methodology
            </span>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "rgba(255,255,255,0.35)" }}
              data-testid="button-back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>
        </div>
      </header>

      {/* ── Single dark canvas wrapper — particles flow across hero + levers ── */}
      <div style={{ position: "relative", backgroundColor: "#0A0807", overflow: "hidden" }}>
        <ParticleCanvas />

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section style={{ minHeight: "94vh", position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}>
          {/* Radial depth vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 55% at 50% 48%, rgba(18,20,32,0.5) 0%, rgba(10,8,7,0.0) 65%)" }}
          />

          <div className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-10 py-24">
            <motion.div
              className="max-w-[700px] text-center"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="inline-flex items-center gap-2.5 mb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.7 }}
              >
                <div className="h-px w-10 bg-[#EA2C00]" />
                <span className="text-[10px] font-bold uppercase tracking-[3.5px] text-[#EA2C00]">
                  The Value Framework
                </span>
                <div className="h-px w-10 bg-[#EA2C00]" />
              </motion.div>

              <h1
                className="font-bold text-white leading-[1.0] tracking-[-0.025em] mb-8"
                style={{ fontSize: "clamp(48px, 6.5vw, 76px)" }}
              >
                Healthcare runs<br />on conversations.
              </h1>

              <motion.p
                className="leading-[1.85] max-w-[500px] mx-auto"
                style={{ fontSize: 17, color: "rgba(255,255,255,0.46)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                4.3 billion clinical encounters every year in the US. Each produces a note — written from memory, after the fact, by a clinician with twelve more patients today.
              </motion.p>

              <motion.div
                className="mt-16 flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <span className="text-[9.5px] uppercase tracking-[3px]" style={{ color: "rgba(255,255,255,0.18)" }}>Scroll</span>
                <motion.div
                  className="w-px h-10 rounded-full"
                  style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.25), rgba(255,255,255,0.04))" }}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Transcription + Two Levers ────────────────────────────────── */}
        <section ref={leversRef} style={{ position: "relative", zIndex: 1, paddingTop: 96, paddingBottom: 120 }}>
          <div className="max-w-[1080px] mx-auto px-6 md:px-10">

            {/* Transcription beat */}
            <motion.div
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              animate={leversInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2
                className="font-bold text-white leading-[1.08] tracking-[-0.02em] mb-10"
                style={{ fontSize: "clamp(34px, 4.5vw, 52px)" }}
              >
                Captured in the room.<br />Returned as the note.
              </h2>

              {/* Waveform — represents the capture moment */}
              <div className="flex items-center justify-center gap-[3px] mb-10">
                {[4,7,11,16,22,18,26,38,34,28,44,48,42,36,44,52,46,38,44,34,26,40,30,22,18,28,20,14,9,5].map((h, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full"
                    style={{ width: 2, height: h, backgroundColor: "rgba(255,255,255,0.28)" }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={leversInView ? { scaleY: 1, opacity: 1 } : {}}
                    transition={{ delay: 0.1 + i * 0.025, duration: 0.35, ease: "easeOut" }}
                  />
                ))}
              </div>

              <p className="text-[15px] leading-relaxed max-w-[420px] mx-auto" style={{ color: "rgba(255,255,255,0.36)" }}>
                Every word spoken in every clinical encounter — automatically structured into complete documentation.
              </p>
            </motion.div>

          {/* Two lever columns — pure editorial, no cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 56 }}
          >
            {([
              {
                label: "Lever 1",
                headline: "Time returns.",
                sub: "Documentation takes 60–90 minutes per shift. When that time returns, two value pools open.",
                domains: DOMAINS.filter(d => d.lever === "time"),
              },
              {
                label: "Lever 2",
                headline: "The note matches the room.",
                sub: "Notes written with full attention capture what memory misses. That accuracy flows downstream into revenue and outcomes.",
                domains: DOMAINS.filter(d => d.lever === "quality"),
              },
            ] as const).map((lever, li) => (
              <motion.div
                key={lever.label}
                initial={{ opacity: 0, y: 20 }}
                animate={leversInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + li * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[3px] mb-5" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {lever.label}
                </p>
                <h3
                  className="font-bold text-white leading-[1.05] tracking-tight mb-5"
                  style={{ fontSize: "clamp(30px, 3.2vw, 42px)" }}
                >
                  {lever.headline}
                </h3>
                <p className="text-[15px] leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.36)" }}>
                  {lever.sub}
                </p>

                {/* Domain list — accent bar + name + tagline, no chip boxes */}
                <div className="space-y-6">
                  {lever.domains.map(d => {
                    const accentColor = d.color === "#333333" ? "rgba(255,255,255,0.28)" : d.color;
                    const nameColor = d.color === "#333333" ? "rgba(255,255,255,0.45)" : d.color;
                    return (
                      <div key={d.key} className="flex gap-4">
                        <div
                          className="w-[2px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: accentColor, minHeight: 44 }}
                        />
                        <div>
                          <p
                            className="text-[10.5px] font-bold uppercase tracking-[2.5px] mb-1.5"
                            style={{ color: nameColor }}
                          >
                            {d.name}
                          </p>
                          <p className="text-[14px] leading-snug" style={{ color: "rgba(255,255,255,0.44)" }}>
                            {d.tagline}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      </div>{/* end shared dark canvas wrapper */}

      {/* ── Four Domains ───────────────────────────────────────────────── */}
      <section ref={domainsRef} className="bg-[#F5F0EB] py-24 px-6 md:px-10">
        <div className="max-w-[1080px] mx-auto">
          <div className="mb-12">
            <p className="text-[10px] font-bold text-[#EA2C00] uppercase tracking-[2.5px] mb-3">Four Domains</p>
            <h2 className="text-[38px] font-bold text-[#1A1A1A] leading-tight tracking-tight">
              The four outcomes.
            </h2>
            <p className="text-[16px] text-[#888888] leading-relaxed mt-3 max-w-[480px]">
              Two levers, four distinct value pools. Each has a direct causal path from the transcription layer.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DOMAINS.map((d, i) => <DomainCard key={d.key} d={d} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── Longitudinal Arc ───────────────────────────────────────────── */}
      <section ref={longRef} className="bg-white py-24 px-6 md:px-10" style={{ borderTop: "1px solid #EDE8E2" }}>
        <div className="max-w-[1080px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={longInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-14"
          >
            <p className="text-[10px] font-bold text-[#EA2C00] uppercase tracking-[2.5px] mb-3">The Arc</p>
            <h2 className="text-[38px] font-bold text-[#1A1A1A] leading-tight tracking-tight mb-4">
              Value deepens as conversations<br className="hidden md:inline" /> accumulate.
            </h2>
            <p className="text-[16px] text-[#888888] leading-relaxed max-w-[520px]">
              The transcription layer is an evidence engine. What you can measure — and claim — grows with every conversation captured.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-5">
            {STAGES.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 18 }}
                animate={longInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex md:flex-col items-start gap-4 mb-3">
                  <div
                    className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#F5F0EB", border: "1.5px solid #DDD6CC" }}
                  >
                    <span className="text-[10.5px] font-bold text-[#AAAAAA]">{s.n}</span>
                  </div>
                  <div className="md:mt-4">
                    <p className="text-[9.5px] font-semibold uppercase tracking-[2px] text-[#BBBBBB] mb-1">{s.range}</p>
                    <p className="text-[20px] font-bold text-[#1A1A1A] leading-tight">{s.label}</p>
                  </div>
                </div>
                <p className="text-[13px] text-[#888888] leading-relaxed pl-[52px] md:pl-0">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Settings CTA ───────────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        className="bg-[#FAF7F4] py-24 px-6 md:px-10"
        style={{ borderTop: "1px solid #EDE8E2" }}
      >
        <div className="max-w-[1080px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <p className="text-[10px] font-bold text-[#EA2C00] uppercase tracking-[2.5px] mb-3">Explore the Methodology</p>
            <h2 className="text-[38px] font-bold text-[#1A1A1A] leading-tight tracking-tight mb-3">
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
                  initial={{ opacity: 0, y: 14 }}
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
