// THROWAWAY mockup (?exploremock=1) — design swing for the "flat" nine-steps problem.
// Persistent "your model so far" rail that grows across steps + drivers that come alive with the
// arithmetic that builds each number, open by default (collapsible), every factor editable, result
// COMPUTED from the visible factors so the equation always foots. HCC holds multiple risk plans.
import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

const CORAL = "#EA2C00";
const INK = "#1A1A1A";
const MUTED = "#7C766F";
const HAIR = "#E7E3DD";
const BG = "#FDFBF8";
const CAP = "#EA2C00";
const WORK = "#F26A45";
const REV = "#F7A488";

type Factor = { val: number; show: string; unit: string; carried?: boolean };
// A risk plan's own economics: lives, the conditions those lives carry, the payment per HCC, the
// improvement in recapture rate (current -> target), and optionally net-new HCCs a fuller note surfaces.
type RiskPlan = { name: string; lives: number; hccPerPatient: number; perHcc: number; recCurrent: number; recTarget: number; netNew?: number };
const fmtK = (n: number) => `$${Math.round(n / 1000)}K`;
const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`;

// wRVU coding lift: FFS visits x wRVU gained/visit x $/wRVU x share kept
const WRVU: Factor[] = [
  { val: 132_000, show: "132,000", unit: "FFS visits", carried: true },
  { val: 0.1, show: "0.10", unit: "wRVU lift / visit" },
  { val: 33.4, show: "$33.40", unit: "per wRVU" },
  { val: 0.6, show: "60%", unit: "captured & kept" },
];
const wrvuVal = WRVU.reduce((a, f) => a * f.val, 1);

// recapture = lives x conditions/patient x (target - current recapture rate) x $/HCC; net-new adds
// lives x net-new conditions/patient x $/HCC. Each plan carries its own numbers.
const recaptureOf = (p: RiskPlan) => p.lives * p.hccPerPatient * (p.recTarget - p.recCurrent) * p.perHcc;
const netNewOf = (p: RiskPlan) => (p.netNew ? p.lives * p.netNew * p.perHcc : 0);
const planTotal = (p: RiskPlan) => recaptureOf(p) + netNewOf(p);
const PLANS: RiskPlan[] = [
  { name: "Medicare Advantage", lives: 4_000, hccPerPatient: 1.5, perHcc: 1_200, recCurrent: 0.55, recTarget: 0.61 },
  { name: "Medicaid managed care", lives: 2_500, hccPerPatient: 1.2, perHcc: 800, recCurrent: 0.52, recTarget: 0.58, netNew: 0.06 },
];
const hccVal = PLANS.reduce((a, p) => a + planTotal(p), 0);

export default function MockExplore() {
  const capacity = 512_000;
  const workforce = 214_000;
  const revenue = wrvuVal + hccVal;
  const total = capacity + workforce + revenue;
  const investment = 250_000;
  const roi = total / investment;
  const seg = (v: number) => `${(v / total) * 100}%`;

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "Manrope, system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: `1px solid ${HAIR}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${HAIR}`, display: "grid", placeItems: "center", color: MUTED }}>←</span>
          <span className="font-abridge" style={{ color: CORAL, fontSize: 22, letterSpacing: "0.02em" }}>ABRIDGE</span>
        </div>
        <span style={{ fontSize: 15, color: MUTED }}>Explore · <b style={{ color: INK }}>Revenue</b></span>
        <span style={{ fontSize: 12, fontWeight: 700, color: INK, border: `1px solid ${HAIR}`, borderRadius: 10, padding: "8px 14px" }}>Data request</span>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "44px 40px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.09em", color: MUTED, textTransform: "uppercase", marginBottom: 10 }}>Explore · Step 6 of 9</div>
        <h1 className="font-abridge" style={{ fontSize: 44, lineHeight: 1.05, color: INK, margin: 0, maxWidth: 760 }}>How does documentation turn into revenue?</h1>
        <p style={{ fontSize: 16.5, color: MUTED, marginTop: 14, maxWidth: 640 }}>The same complete note earns money differently depending on how you are paid. Turn on what fits, tune the math to your reality, and watch it land in the model on the right.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28, marginTop: 34, alignItems: "start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: INK, textTransform: "uppercase" }}>How are you paid?</span>
              <div style={{ display: "flex", background: "#F3EEE7", borderRadius: 12, padding: 3 }}>
                {["Fee-for-service", "Risk", "Both"].map((t, i) => (
                  <span key={t} style={{ fontSize: 13.5, fontWeight: 700, padding: "7px 16px", borderRadius: 10, color: i === 2 ? CORAL : MUTED, background: i === 2 ? "#fff" : "transparent" }}>{t}</span>
                ))}
              </div>
            </div>

            <DriverCard name="wRVU capture" tag="Fee-for-service" desc="A fuller note lets the E/M level match the visit. Capture, not upcoding." factors={WRVU} value={wrvuVal} pct={100 * wrvuVal / revenue} />
            <DriverCard name="HCC capture" tag="Risk-based" desc="Chronic conditions a fuller note surfaces during the visit, each plan on its own economics." plans={PLANS} value={hccVal} pct={100 * hccVal / revenue} />
            <DriverCard off name="Medical necessity denials" tag="FFS & risk" desc="Claims you earned but lose to documentation gaps. Fewer denied, less rework." />

            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 18, fontSize: 13, color: MUTED }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: "#C4BCB0" }} />
              Quality signals (E/M level, first-pass rate) are <b style={{ color: INK }}>tracked as proof</b>, not double-counted here.
            </div>
          </div>

          <div style={{ position: "sticky", top: 24 }}>
            <div style={{ border: `1px solid ${HAIR}`, borderRadius: 20, background: "#fff", padding: 28, boxShadow: "0 1px 3px rgba(40,30,20,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: MUTED, textTransform: "uppercase" }}>Your model so far</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: CORAL, background: "#FFEDE7", borderRadius: 999, padding: "4px 10px" }}>building</span>
              </div>
              <div className="font-abridge" style={{ fontSize: 52, lineHeight: 1, color: CORAL, letterSpacing: "-0.5px" }}>{fmtM(total)}<span style={{ fontSize: 16, color: MUTED, fontFamily: "Manrope" }}> / yr</span></div>
              <div style={{ fontSize: 13.5, color: MUTED, marginTop: 8 }}>modeled value, net of a <b style={{ color: INK }}>{fmtK(investment)}</b> investment ≈ <b style={{ color: CORAL }}>{roi.toFixed(1)}×</b></div>

              <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", marginTop: 22, background: "#F3EEE7" }}>
                <div style={{ width: seg(capacity), background: CAP }} />
                <div style={{ width: seg(workforce), background: WORK }} />
                <div style={{ width: seg(revenue), background: REV }} />
              </div>

              <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 2 }}>
                <DomainRow color={CAP} name="Capacity" step="from step 4" value={capacity} />
                <DomainRow color={WORK} name="Workforce" step="from step 5" value={workforce} />
                <DomainRow color={REV} name="Revenue" step="building now" value={revenue} active />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 2px", borderTop: `1px solid ${HAIR}`, marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: MUTED }}>Quality</span>
                  <span style={{ fontSize: 12.5, fontStyle: "italic", color: MUTED }}>tracked, not counted</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: MUTED, marginTop: 14, lineHeight: 1.5, textAlign: "center" }}>This rail stays with you across all nine steps. Every driver you turn on lands here, so the model is already built by the time you reach the end.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// one bottom-aligned cell in an equation: a caption line (reserved even when empty) over a value,
// so factors, operators, and the result all sit on the same baseline.
function EqCell({ cap, children, color, size = 21 }: { cap?: string; children: React.ReactNode; color: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 4, minHeight: 13, whiteSpace: "nowrap" }}>{cap ?? " "}</div>
      <span className="font-abridge" style={{ fontSize: size, lineHeight: 1, color }}>{children}</span>
    </div>
  );
}
const Op = ({ children }: { children: string }) => <EqCell color="#C4BCB0">{children}</EqCell>;
const Editable = ({ cap, show, carried }: { cap: string; show: string; carried?: boolean }) => (
  <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
    <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 4, minHeight: 13, whiteSpace: "nowrap" }}>{cap}</div>
    <span className="font-abridge" style={{ fontSize: 21, lineHeight: 1, color: carried ? "#A79E92" : INK, borderBottom: carried ? "2px solid transparent" : `2px solid ${CORAL}`, paddingBottom: 3 }}>{show}</span>
  </div>
);

function MathHeader({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: open ? 12 : 0 }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <ChevronDown size={15} color={MUTED} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: MUTED }}>The math</span>
      </button>
      {open && <span style={{ fontSize: 11.5, color: CORAL, fontWeight: 700 }}>edit any figure</span>}
    </div>
  );
}

function DriverCard({ off, name, tag, desc, factors, plans, value, pct }: { off?: boolean; name: string; tag: string; desc: string; factors?: Factor[]; plans?: RiskPlan[]; value?: number; pct?: number }) {
  const on = !off;
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: `1px solid ${on ? "#F1C9BC" : HAIR}`, borderRadius: 16, background: on ? "#FFFBF9" : "#fff", padding: "18px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="font-abridge" style={{ fontSize: 21, color: INK }}>{name}</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: MUTED, background: "#F3EEE7", borderRadius: 999, padding: "3px 9px" }}>{tag}</span>
          </div>
          <div style={{ fontSize: 13.5, color: MUTED, marginTop: 6, maxWidth: 440 }}>{desc}</div>
        </div>
        <div style={{ width: 46, height: 27, borderRadius: 999, background: on ? CORAL : "#DCD5CB", position: "relative", flexShrink: 0, marginTop: 2 }}>
          <span style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: 999, background: "#fff" }} />
        </div>
      </div>

      {on && value != null && (
        <div style={{ marginTop: 16, paddingTop: 15, borderTop: `1px solid #F1E4DC` }}>
          <MathHeader open={open} setOpen={setOpen} />
          {open && (
            <>
              {/* factor-chain driver (wRVU) */}
              {factors && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px 12px", flexWrap: "wrap" }}>
                  {factors.map((f, i) => (
                    <div key={f.unit} style={{ display: "flex", alignItems: "flex-end", gap: "6px 12px" }}>
                      {i > 0 && <Op>×</Op>}
                      <Editable cap={f.unit} show={f.show} carried={f.carried} />
                    </div>
                  ))}
                  <Op>=</Op>
                  <EqCell color={CORAL} size={24}>+{fmtK(value)}<span style={{ fontSize: 12, color: MUTED, fontFamily: "Manrope" }}> / yr</span></EqCell>
                </div>
              )}

              {/* multi-plan driver (HCC): each risk plan carries its own economics */}
              {plans && (
                <div>
                  {plans.map((p) => <PlanCard key={p.name} p={p} />)}
                  <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "12px 0 4px", color: CORAL, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                    <Plus size={14} /> Add a risk plan
                  </button>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 10, paddingTop: 12, borderTop: `1px solid ${HAIR}` }}>
                    <span style={{ fontSize: 13, color: MUTED }}>Across {plans.length} plans</span>
                    <span className="font-abridge" style={{ fontSize: 24, color: CORAL }}>+{fmtK(value)}<span style={{ fontSize: 12, color: MUTED, fontFamily: "Manrope" }}> / yr</span></span>
                  </div>
                </div>
              )}

              {/* the driver's share of this step's value */}
              <div style={{ height: 7, borderRadius: 6, background: "#F3EEE7", overflow: "hidden", marginTop: 16 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: REV }} />
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 11, fontStyle: "italic" }}>Grey figures carry from your earlier steps. Change any coral figure and this reprices live, then updates the model on the right.</div>
            </>
          )}
          {!open && (
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 12 }}>
              <span style={{ fontSize: 12.5, color: MUTED }}>tap to open the math</span>
              <span className="font-abridge" style={{ fontSize: 22, color: CORAL }}>+{fmtK(value)}<span style={{ fontSize: 12, color: MUTED, fontFamily: "Manrope" }}> / yr</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// one risk plan's own economics: lives, conditions those lives carry, $/HCC, the recapture-rate
// improvement, and an optional net-new-HCC line. Result computed from the visible figures.
function MiniField({ cap, show, carried }: { cap: string; show: string; carried?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: MUTED, marginBottom: 3, whiteSpace: "nowrap" }}>{cap}</div>
      <span className="font-abridge" style={{ fontSize: 17, lineHeight: 1, color: carried ? "#A79E92" : INK, borderBottom: carried ? "2px solid transparent" : `2px solid ${CORAL}`, paddingBottom: 2 }}>{show}</span>
    </div>
  );
}
function PlanCard({ p }: { p: RiskPlan }) {
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 12, background: "#fff", padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span className="font-abridge" style={{ fontSize: 17, color: INK }}>{p.name}</span>
        <span className="font-abridge" style={{ fontSize: 19, color: CORAL }}>+{fmtK(planTotal(p))}<span style={{ fontSize: 11, color: MUTED, fontFamily: "Manrope" }}> / yr</span></span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px 22px" }}>
        <MiniField cap="Lives" show={p.lives.toLocaleString()} carried />
        <MiniField cap="HCCs / patient" show={p.hccPerPatient.toFixed(1)} />
        <MiniField cap="Realized / HCC" show={`$${p.perHcc.toLocaleString()}`} />
        <div>
          <div style={{ fontSize: 10, color: MUTED, marginBottom: 3, whiteSpace: "nowrap" }}>Recapture rate</div>
          <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 7 }}>
            <span className="font-abridge" style={{ fontSize: 17, lineHeight: 1, color: INK, borderBottom: `2px solid ${CORAL}`, paddingBottom: 2 }}>{Math.round(p.recCurrent * 100)}%</span>
            <span style={{ fontSize: 13, lineHeight: 1, color: "#C4BCB0", paddingBottom: 2 }}>→</span>
            <span className="font-abridge" style={{ fontSize: 17, lineHeight: 1, color: INK, borderBottom: `2px solid ${CORAL}`, paddingBottom: 2 }}>{Math.round(p.recTarget * 100)}%</span>
          </span>
        </div>
      </div>
      {/* net-new HCCs: an option, on for some plans. When on, the plan total is shown as the sum
          of recapture + net-new so the composition is explicit, never ambiguous. */}
      <div style={{ marginTop: 13, paddingTop: 12, borderTop: `1px solid #F4EEE7` }}>
        {p.netNew ? (
          <div>
            <MiniField cap="Net-new HCCs / patient · surfaced at the visit" show={p.netNew.toFixed(2)} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12, fontSize: 12.5, color: MUTED }}>
              recapture <b className="font-abridge" style={{ color: INK, fontSize: 15 }}>+{fmtK(recaptureOf(p))}</b>
              <span style={{ color: "#C4BCB0" }}>+</span>
              net-new <b className="font-abridge" style={{ color: INK, fontSize: 15 }}>+{fmtK(netNewOf(p))}</b>
              <span style={{ color: "#C4BCB0" }}>=</span>
              <b className="font-abridge" style={{ color: CORAL, fontSize: 16 }}>+{fmtK(planTotal(p))}</b>
            </div>
          </div>
        ) : (
          <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, color: CORAL, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            <Plus size={13} /> Include net-new HCCs a fuller note surfaces
          </button>
        )}
      </div>
    </div>
  );
}

function DomainRow({ color, name, step, value, active }: { color: string; name: string; step: string; value: number; active?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 11, height: 11, borderRadius: 3, background: color }} />
        <span style={{ fontSize: 14.5, color: INK, fontWeight: active ? 700 : 500 }}>{name}</span>
        <span style={{ fontSize: 11.5, color: active ? CORAL : MUTED, fontStyle: active ? "normal" : "italic" }}>{step}</span>
      </div>
      <span className="font-abridge" style={{ fontSize: 17, color: INK }}>{fmtK(value)}</span>
    </div>
  );
}
