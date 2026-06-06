import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowLeft, ChevronRight, Stethoscope, Zap, Building2, HeartPulse } from "lucide-react";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

type CareSetting = "outpatient" | "ed" | "inpatient" | "nursing";
interface Props { onBack: () => void; onSelectSetting: (s: CareSetting) => void; }

const DOMAINS = [
  {
    key: "capacity", name: "Capacity", color: "#EA5028", lever: "time" as const,
    tagline: "Reclaimed time becomes patient access — or a better clinical encounter.",
    body: "Documentation can consume an hour or more per shift. When that time returns, encounter capacity can expand without adding headcount.",
    chain: ["Documentation burden per encounter reduced", "Recovered time available for clinical work", "Capacity or schedule density can expand"],
  },
  {
    key: "workforce", name: "Workforce", color: "#C35A37", lever: "time" as const,
    tagline: "Less documentation means more medicine — and more sustainable careers.",
    body: "The cost of replacing a physician is substantial. The primary driver is administrative burden — and ambient documentation addresses a root cause.",
    chain: ["After-hours charting burden measurably reduced", "Administrative-to-clinical time ratio improves", "Provider experience and retention supported"],
  },
  {
    key: "revenue", name: "Revenue", color: "#B87858", lever: "quality" as const,
    tagline: "Revenue reflects the work performed — not the recall.",
    body: "Notes documented in the room can capture clinical specificity that memory-based notes miss. That specificity supports coding accuracy and reduces claim vulnerability.",
    chain: ["Clinical detail captured in the moment of care", "Coding and CDI teams have more complete documentation", "Appropriate revenue recognition supported"],
  },
  {
    key: "quality", name: "Quality", color: "#908880", lever: "quality" as const,
    tagline: "Better notes are the foundation of better care — across every encounter.",
    body: "When the note reflects the visit rather than a reconstruction of it, documentation can support care decisions, surface gaps, and contribute to longitudinal clinical insight.",
    chain: ["Note reflects the actual clinical encounter", "Documentation supports care transitions and follow-up", "Longitudinal record completeness can improve"],
  },
];

const STAGES = [
  { n: "01", range: "Months 1–3", label: "Unmeasured", description: "Value is generating — documentation improves, time returns, signals appear. Nothing has been formally measured or attributed yet. This is where most deployments begin." },
  { n: "02", range: "Months 4–12", label: "Emerging", description: "Coding trends shift. Denial rates begin to move. Retention data starts to reflect what changed in the room. Direction is visible — a formal number isn't." },
  { n: "03", range: "Year 1–2", label: "Demonstrated", description: "Longitudinal outcomes emerge. A formal dollar figure is on the books — calculable, attributable, defensible to finance." },
  { n: "04", range: "Year 3+", label: "Strategic", description: "Documentation intelligence informs how the organization competes — care model design, payer strategy, workforce planning, clinical AI. Infrastructure, not a point solution." },
];

const SETTINGS = [
  { id: "outpatient" as const, name: "Outpatient", subtitle: "Primary care & specialty", icon: Stethoscope },
  { id: "ed" as const, name: "Emergency", subtitle: "Emergency department", icon: Zap },
  { id: "inpatient" as const, name: "Inpatient", subtitle: "Hospital medicine", icon: Building2 },
  { id: "nursing" as const, name: "Nursing", subtitle: "Inpatient nursing", icon: HeartPulse },
];

// Named constellations — tiny asterism clusters sitting quietly in the margins
// Nodes are silver (same as ambient) — only the thin connecting lines carry color
// Max spread per constellation: ~50-60px on a 1440px viewport
const NAMED_CONSTELLATIONS = [
  {
    name: "CAPACITY",
    rgb: [234, 80, 40] as [number, number, number],
    nodes: [
      { rx: 0.042, ry: 0.572 }, { rx: 0.062, ry: 0.557 },
      { rx: 0.073, ry: 0.585 }, { rx: 0.048, ry: 0.608 }, { rx: 0.060, ry: 0.598 },
    ],
    edges: [[0, 4], [1, 4], [2, 4], [4, 3]],  // star pattern, no closed loops
  },
  {
    name: "WORKFORCE",
    rgb: [195, 90, 55] as [number, number, number],
    nodes: [
      { rx: 0.037, ry: 0.783 }, { rx: 0.057, ry: 0.769 },
      { rx: 0.070, ry: 0.795 }, { rx: 0.044, ry: 0.818 }, { rx: 0.064, ry: 0.811 },
    ],
    edges: [[0, 1], [1, 2], [2, 4], [3, 4]],  // chain/arc
  },
  {
    name: "REVENUE",
    rgb: [184, 120, 88] as [number, number, number],
    nodes: [
      { rx: 0.927, ry: 0.572 }, { rx: 0.947, ry: 0.557 },
      { rx: 0.958, ry: 0.585 }, { rx: 0.932, ry: 0.608 }, { rx: 0.944, ry: 0.598 },
    ],
    edges: [[0, 4], [1, 4], [2, 4], [4, 3]],  // star pattern
  },
  {
    name: "QUALITY",
    rgb: [144, 136, 128] as [number, number, number],
    nodes: [
      { rx: 0.929, ry: 0.783 }, { rx: 0.949, ry: 0.769 },
      { rx: 0.961, ry: 0.795 }, { rx: 0.936, ry: 0.818 }, { rx: 0.956, ry: 0.811 },
    ],
    edges: [[0, 1], [1, 2], [2, 4], [3, 4]],  // chain/arc
  },
];
const TOTAL_CON_NODES = NAMED_CONSTELLATIONS.reduce((s, c) => s + c.nodes.length, 0);

// ─── Particle Canvas ─────────────────────────────────────────────────────────

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

    type P = {
      bx: number; by: number; fx: number; fy: number;
      ax: number; ay: number; ph: number; r: number; a: number;
      glow: boolean; conIdx: number | null; nodeIdx: number | null;
    };
    let pts: P[] = [];

    function initParticles() {
      const w = canvas!.width, h = canvas!.height;
      pts = [];

      // Named constellation particles — tight oscillation, always present
      for (let ci = 0; ci < NAMED_CONSTELLATIONS.length; ci++) {
        const con = NAMED_CONSTELLATIONS[ci];
        for (let ni = 0; ni < con.nodes.length; ni++) {
          const node = con.nodes[ni];
          pts.push({
            bx: node.rx * w + (Math.random() - 0.5) * 6,
            by: node.ry * h + (Math.random() - 0.5) * 4,
            fx: 0.08 + Math.random() * 0.14,
            fy: 0.06 + Math.random() * 0.11,
            ax: 5 + Math.random() * 8,   // tight oscillation — stays clustered
            ay: 3 + Math.random() * 5,
            ph: Math.random() * Math.PI * 2,
            r: 1.8 + Math.random() * 0.8,
            a: 0.38 + Math.random() * 0.18,
            glow: true,
            conIdx: ci, nodeIdx: ni,
          });
        }
      }

      // Ambient particles
      const ambient = Math.min(486, Math.max(0, Math.floor((w * h) / 3300) - TOTAL_CON_NODES));
      for (let i = 0; i < ambient; i++) {
        const a = 0.18 + Math.random() * 0.36;
        pts.push({
          bx: Math.random() * w, by: Math.random() * h,
          fx: 0.18 + Math.random() * 0.48, fy: 0.12 + Math.random() * 0.36,
          ax: 22 + Math.random() * 58, ay: 10 + Math.random() * 28,
          ph: Math.random() * Math.PI * 2,
          r: 1.4 + Math.random() * 3.2, a,
          glow: a > 0.6, conIdx: null, nodeIdx: null,
        });
      }
    }
    initParticles();

    let t = 0;
    let raf: number;

    function frame() {
      t += 0.007;
      const w = canvas!.width, h = canvas!.height;
      ctx!.clearRect(0, 0, w, h);

      type Pos = { x: number; y: number; r: number; a: number; glow: boolean; conIdx: number | null; nodeIdx: number | null };
      const pos: Pos[] = pts.map(p => ({
        x: p.bx + Math.sin(t * p.fx + p.ph) * p.ax,
        y: p.by + Math.cos(t * p.fy + p.ph * 1.42) * p.ay,
        r: p.r, a: p.a, glow: p.glow,
        conIdx: p.conIdx, nodeIdx: p.nodeIdx,
      }));

      // Group constellation node positions for edge + label drawing
      const conNodePos: { x: number; y: number }[][] = NAMED_CONSTELLATIONS.map(() => []);
      for (const p of pos) {
        if (p.conIdx !== null && p.nodeIdx !== null) {
          conNodePos[p.conIdx][p.nodeIdx] = { x: p.x, y: p.y };
        }
      }

      // Ambient connection lines
      ctx!.lineWidth = 0.6;
      for (let i = 0; i < pos.length; i++) {
        if (pos[i].conIdx !== null) continue;
        for (let j = i + 1; j < pos.length; j++) {
          if (pos[j].conIdx !== null) continue;
          const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 11025) {
            const alpha = (1 - Math.sqrt(d2) / 105) * 0.16;
            ctx!.beginPath();
            ctx!.moveTo(pos[i].x, pos[i].y);
            ctx!.lineTo(pos[j].x, pos[j].y);
            ctx!.strokeStyle = `rgba(195,205,225,${alpha})`;
            ctx!.stroke();
          }
        }
      }

      // Constellation edges + labels
      ctx!.lineWidth = 0.65;
      for (let ci = 0; ci < NAMED_CONSTELLATIONS.length; ci++) {
        const con = NAMED_CONSTELLATIONS[ci];
        const nodes = conNodePos[ci];
        if (!nodes || nodes.length < con.nodes.length) continue;
        const [r, g, b] = con.rgb;

        for (let ei = 0; ei < con.edges.length; ei++) {
          const ai = con.edges[ei][0], bi = con.edges[ei][1];
          ctx!.beginPath();
          ctx!.moveTo(nodes[ai].x, nodes[ai].y);
          ctx!.lineTo(nodes[bi].x, nodes[bi].y);
          ctx!.strokeStyle = `rgba(${r},${g},${b},0.22)`;
          ctx!.stroke();
        }

        // Tiny star-map label below cluster centroid
        let sumX = 0, maxY = -Infinity;
        for (let ni = 0; ni < nodes.length; ni++) {
          sumX += nodes[ni].x;
          if (nodes[ni].y > maxY) maxY = nodes[ni].y;
        }
        const labelX = sumX / nodes.length;
        const c2 = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
        ctx!.font = "bold 9px 'Manrope', system-ui, sans-serif";
        ctx!.textAlign = "center";
        ctx!.fillStyle = "rgba(255,255,255,0.42)";
        if (c2.letterSpacing !== undefined) c2.letterSpacing = "2px";
        ctx!.fillText(con.name, labelX, maxY + 14);
        if (c2.letterSpacing !== undefined) c2.letterSpacing = "0px";
      }

      // Glow particles (constellation nodes + bright ambient)
      ctx!.shadowBlur = 6;
      ctx!.shadowColor = "rgba(170,185,220,0.35)";
      for (const p of pos) {
        if (!p.glow || p.a < 0.01) continue;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // Constellation nodes are the same silver as ambient — only the lines carry color
        ctx!.fillStyle = `rgba(218,224,242,${p.a})`;
        ctx!.fill();
      }

      // Regular ambient particles
      ctx!.shadowBlur = 0;
      for (const p of pos) {
        if (p.glow || p.a < 0.01) continue;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(190,198,218,${p.a})`;
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

// ─── Waveform Canvas — continuously animated bars ────────────────────────────

function pillRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = Math.min(w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function WaveformCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BARS = 96;
    const BAR_W = 2.5;

    // Pre-compute per-bar parameters (bell-curve envelope + random oscillation)
    const bars = Array.from({ length: BARS }, (_, i) => {
      const norm = i / (BARS - 1);
      const d = (norm - 0.5) * 3.0;
      const env = Math.exp(-(d * d)); // Gaussian
      const baseH = 3 + env * 58;
      return {
        baseH,
        freq: 0.7 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        amp: 0.28 + Math.random() * 0.38,
      };
    });

    function setSize() {
      canvas!.width = canvas!.offsetWidth || 660;
      canvas!.height = 88;
    }
    setSize();

    let t = 0;
    let opacity = 0;
    let raf: number;

    function frame() {
      t += 0.022;
      const w = canvas!.width;
      const h = canvas!.height;

      opacity = activeRef.current
        ? Math.min(1, opacity + 0.03)
        : Math.max(0, opacity - 0.03);

      ctx!.clearRect(0, 0, w, h);

      const gap = (w - BARS * BAR_W) / (BARS - 1);

      for (let i = 0; i < BARS; i++) {
        const bar = bars[i];
        // Oscillate between baseH*(1-amp) and baseH
        const osc = Math.sin(t * bar.freq + bar.phase) * 0.5 + 0.5; // 0..1
        const barH = Math.max(2, bar.baseH * (1 - bar.amp + bar.amp * osc));
        const x = i * (BAR_W + gap);
        const y = (h - barH) / 2;

        const norm = i / (BARS - 1);
        const center = 1 - Math.abs(norm - 0.5) * 2;
        const alpha = (0.18 + center * 0.34) * opacity;

        ctx!.fillStyle = `rgba(255,255,255,${alpha})`;
        pillRect(ctx!, x, y, BAR_W, barH);
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }
    frame();

    const onResize = () => setSize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[660px]"
      style={{ height: 88, display: "block" }}
    />
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function MethodologyFramework({ onBack, onSelectSetting }: Props) {
  const leversRef = useRef<HTMLDivElement>(null);
  const continuumRef = useRef<HTMLDivElement>(null);

  const leversInView = useInView(leversRef, { once: true, margin: "-60px" });
  const continuumInView = useInView(continuumRef, { once: true, margin: "-80px" });

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
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "rgba(255,255,255,0.35)" }}
              data-testid="button-back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button onClick={onBack} className="cursor-pointer bg-transparent border-none p-0" data-testid="link-home-logo">
              <img src={abridgeLogo} alt="Abridge" className="h-[18px] brightness-0 invert" />
            </button>
          </div>
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-[2.5px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            Value Methodology
          </span>
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
                style={{ fontSize: "clamp(36px, 4.2vw, 52px)" }}
              >
                Healthcare runs<br />on conversations.
              </h1>

              <motion.p
                className="leading-[1.75] max-w-[520px] mx-auto"
                style={{ fontSize: 17, color: "rgba(255,255,255,0.62)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                The clinical note has long been a reconstruction — written from memory, after the fact, by a clinician already in the next room.
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
                style={{ fontSize: "clamp(36px, 4.2vw, 52px)" }}
              >
                Captured in the room.<br />Returned as the note.
              </h2>

              {/* Live waveform — animated canvas */}
              <div className="flex justify-center mb-10">
                <WaveformCanvas active={leversInView} />
              </div>

              <p className="leading-[1.75] max-w-[520px] mx-auto" style={{ fontSize: 17, color: "rgba(255,255,255,0.58)" }}>
                When the conversation is documented in the room, two things shift: clinicians reclaim time, and the record finally reflects what actually happened.
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
                sub: "Saved documentation time can expand patient access, improve the experience of practicing medicine — or both.",
                domains: DOMAINS.filter(d => d.lever === "time"),
              },
              {
                label: "Lever 2",
                headline: "Notes reflect.",
                sub: "Memory compresses. The room doesn't. A complete transcript changes what revenue can be recognized and what care can be built on.",
                domains: DOMAINS.filter(d => d.lever === "quality"),
              },
            ] as const).map((lever, li) => (
              <motion.div
                key={lever.label}
                initial={{ opacity: 0, y: 20 }}
                animate={leversInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + li * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[3px] mb-6" style={{ color: "#EA2C00" }}>
                  {lever.label}
                </p>
                <h3
                  className="font-bold text-white leading-[1.05] tracking-tight mb-6"
                  style={{ fontSize: "clamp(32px, 3.5vw, 46px)" }}
                >
                  {lever.headline}
                </h3>
                <p className="leading-relaxed mb-12" style={{ fontSize: 18, color: "rgba(255,255,255,0.52)" }}>
                  {lever.sub}
                </p>

                {/* Domain items — all white/silver, no competing colors on dark bg */}
                <div className="space-y-8">
                  {lever.domains.map(d => (
                    <div key={d.key} className="flex gap-5">
                      <div
                        className="w-[2px] rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: "rgba(255,255,255,0.16)", minHeight: 52 }}
                      />
                      <div>
                        <p
                          className="text-[10px] font-bold uppercase tracking-[2.5px] mb-2"
                          style={{ color: "rgba(255,255,255,0.38)" }}
                        >
                          {d.name}
                        </p>
                        <p style={{ fontSize: 17, lineHeight: 1.5, color: "rgba(255,255,255,0.60)" }}>
                          {d.tagline}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

        {/* ── Unified: Continuum + Domains + Arc + Entry ─────────────── */}
        <section ref={continuumRef} style={{ position: "relative", zIndex: 1 }}>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
          <div className="max-w-[1080px] mx-auto px-6 md:px-10 pt-24 pb-36">

            {/* Intro */}
            <motion.div
              className="mb-24"
              initial={{ opacity: 0, y: 20 }}
              animate={continuumInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[3px] mb-4" style={{ color: "#EA2C00" }}>
                The Continuum
              </p>
              <h2
                className="font-bold text-white leading-[1.08] tracking-[-0.02em] mb-5"
                style={{ fontSize: "clamp(30px, 3.6vw, 46px)" }}
              >
                Every care setting.<br />One accumulating record.
              </h2>
              <p style={{ fontSize: 17, color: "rgba(255,255,255,0.48)", lineHeight: 1.75, maxWidth: 560 }}>
                Healthcare is a continuum of care by nature. Each care setting is a different point of capture — and every captured conversation feeds the same four domains of value, simultaneously, across your whole system.
              </p>
            </motion.div>

            {/* Domains with vertical spine */}
            <div className="relative">
              {/* Spine */}
              <div
                className="absolute left-0 top-3 w-px hidden md:block"
                style={{
                  height: "calc(100% - 60px)",
                  background: "linear-gradient(to bottom, rgba(234,80,40,0.55) 0%, rgba(195,90,55,0.45) 28%, rgba(184,120,88,0.38) 62%, rgba(144,136,128,0.26) 100%)",
                }}
              />
              {DOMAINS.map((d, i) => (
                <motion.div
                  key={d.key}
                  className="relative md:pl-12 pb-16 md:pb-20"
                  initial={{ opacity: 0, y: 24 }}
                  animate={continuumInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.12 + i * 0.14, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Spine dot */}
                  <div
                    className="absolute left-[-4px] top-[10px] w-[9px] h-[9px] rounded-full hidden md:block"
                    style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}80` }}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-10 md:gap-16">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[2.5px] mb-4" style={{ color: d.color }}>
                        {d.name}
                      </p>
                      <h3 className="font-bold text-white mb-4" style={{ fontSize: "clamp(19px, 2.1vw, 26px)", lineHeight: 1.25 }}>
                        {d.tagline}
                      </h3>
                      <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.52)", lineHeight: 1.78 }}>
                        {d.body}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[2.5px] mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Value chain
                      </p>
                      <div className="flex flex-col">
                        {d.chain.map((step, si) => (
                          <div key={si}>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                                style={{ border: `1px solid ${d.color}90`, color: d.color }}
                              >
                                {si + 1}
                              </div>
                              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
                                {step}
                              </span>
                            </div>
                            {si < d.chain.length - 1 && (
                              <div className="ml-[9px] w-px h-4" style={{ backgroundColor: `${d.color}22` }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "8px 0 80px" }} />

            {/* The Arc */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={continuumInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[3px] mb-4" style={{ color: "#EA2C00" }}>
                The Arc
              </p>
              <h2
                className="font-bold text-white leading-[1.08] tracking-[-0.02em] mb-4"
                style={{ fontSize: "clamp(26px, 3.0vw, 38px)" }}
              >
                Value deepens as conversations<br className="hidden md:inline" /> accumulate.
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, maxWidth: 500, marginBottom: 56 }}>
                The transcription layer is an evidence engine. What you can measure — and claim — grows with every conversation captured.
              </p>
              <div className="relative">
                <div
                  className="absolute top-[15px] left-[15px] right-[15px] h-px hidden md:block"
                  style={{ background: "linear-gradient(to right, rgba(234,44,0,0.28), rgba(255,255,255,0.07))" }}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
                  {STAGES.map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 14 }}
                      animate={continuumInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.8 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div
                        className="w-[30px] h-[30px] rounded-full flex items-center justify-center mb-5"
                        style={{
                          backgroundColor: `rgba(255,255,255,${0.06 + i * 0.02})`,
                          border: `1px solid rgba(255,255,255,${0.18 + i * 0.04})`,
                        }}
                      >
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: `rgba(255,255,255,${0.6 + i * 0.1})` }}>
                          {s.n}
                        </span>
                      </div>
                      <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "2px", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                        {s.range}
                      </p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: `rgba(255,255,255,${0.75 + i * 0.07})`, lineHeight: 1.2, marginBottom: 8 }}>
                        {s.label}
                      </p>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.65 }}>
                        {s.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "80px 0" }} />

            {/* Entry CTA */}
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 18 }}
              animate={continuumInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[3px] mb-4" style={{ color: "#EA2C00" }}>
                Explore the Methodology
              </p>
              <h2
                className="font-bold text-white leading-[1.08] tracking-[-0.02em] mb-4"
                style={{ fontSize: "clamp(26px, 3.0vw, 38px)" }}
              >
                Where in the continuum<br />are you starting?
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, maxWidth: 500 }}>
                Each care setting is a different point of capture — its own clinical conversations, documentation patterns, and value drivers.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SETTINGS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={continuumInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 1.2 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => onSelectSetting(s.id)}
                    className="group text-left rounded-xl p-6 transition-all duration-200 hover:border-white/20"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                    data-testid={`button-setting-${s.id}`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                      <Icon className="w-5 h-5" style={{ color: "rgba(255,255,255,0.50)" }} />
                    </div>
                    <h3 style={{ fontWeight: 600, color: "rgba(255,255,255,0.88)", fontSize: 15, marginBottom: 3 }}>
                      {s.name}
                    </h3>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 20 }}>
                      {s.subtitle}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#EA2C00" }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Enter</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </motion.button>
                );
              })}
            </div>

          </div>
        </section>

      </div>{/* end dark canvas */}

    </div>
  );
}
