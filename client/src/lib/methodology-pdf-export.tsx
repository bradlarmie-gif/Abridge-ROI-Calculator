import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../assets/fonts/manrope-regular.ttf";
import manropeBold from "../assets/fonts/manrope-bold.ttf";

Font.registerHyphenationCallback((word) => [word]);
Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

export type MethodologyCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

// ─── Data Types ───────────────────────────────────────────────────────────────

interface TimelineStage {
  window: string;
  desc: string;
  metrics: string[];
  callout: string;
}

interface DomainEntry {
  domain: "CAPACITY" | "WORKFORCE" | "REVENUE" | "QUALITY";
  badge: string;
  northStar: string;
  direction: "↑" | "↓";
  sub: string;
  matterMostIf: string;
  alsoNote?: string;
  chain: string[];
  chainOutput: string;
  tag: "modeled" | "tracked";
  narrative: string;
  signal: TimelineStage;
  trend: TimelineStage;
  proof: TimelineStage;
}

interface SettingPDFData {
  label: string;
  coverSubtitle: string;
  contextHeadline: string;
  contextBody: string;
  adoptionCallout: string;
  domains: DomainEntry[];
}

// ─── Content Data ─────────────────────────────────────────────────────────────

export const settingData: Record<MethodologyCareSetting, SettingPDFData> = {
  ed: {
    label: "Emergency Department",
    coverSubtitle:
      "A transparent framework for understanding\nwhere Abridge creates value in the emergency department",
    contextHeadline:
      "Every minute a physician spends documenting is a minute not available for the next patient.",
    contextBody:
      "In the ED, documentation is a throughput constraint, a physician retention risk, and a revenue integrity gap — all simultaneously. Abridge addresses the documentation bottleneck at the source: the encounter itself, not the end of the shift.",
    adoptionCallout:
      "All outcomes in this framework require consistent Abridge adoption. Partial use produces partial results. The Signal / Trend / Proof timeline on each domain page shows what to track, and when — starting with the metrics most directly influenced by documentation behavior.",
    domains: [
      {
        domain: "CAPACITY",
        badge: "Throughput & Patient Flow",
        northStar: "LWBS Rate",
        direction: "↓",
        sub: "The bottleneck in ED throughput is physician availability — and physician availability is constrained by documentation time. When a note takes 12 minutes instead of 4, the physician can't give full attention to the next patient for 8 additional minutes. Across 30 encounters per shift, that's 4 hours of clinical capacity absorbed by documentation. Reducing LWBS requires two sequential steps: throughput must improve first, then recaptured capacity must be filled with volume — LWBS won't move until both conditions are met.",
        matterMostIf:
          "Your LWBS rate is above benchmark (1–2% is strong; 3–5%+ warrants active intervention), you're competing on patient access, or your CFO is asking why throughput hasn't improved despite staffing investments.",
        alsoNote:
          "Throughput improvement also supports physician wellbeing (Workforce) — providers who aren't carrying documentation backlog are more present for each patient interaction.",
        chain: ["Documentation Time ↓", "Physician Availability ↑", "Bed Cycle Time ↓"],
        chainOutput: "LWBS Rate ↓",
        tag: "modeled",
        narrative:
          "LWBS events represent visits the ED attempted to serve but lost to wait times. Documentation burden is one contributor to throughput delays. The model estimates revenue recovery from LWBS reduction, attributing only a defensible fraction to documentation-related delays — not total throughput, which has many drivers.",
        signal: {
          window: "Month 1–3",
          desc: "Documentation behavior shifts",
          metrics: ["Documentation Time Per Encounter", "After-Shift Charting Time"],
          callout:
            "Documentation time is the upstream gate. Until it reaches a consistent low, physician availability, bed cycle time, and LWBS all stay locked. Stabilizing this metric isn't the goal — it's the precondition for every outcome downstream.",
        },
        trend: {
          window: "Month 3–7",
          desc: "Throughput improves",
          metrics: ["Door-to-Provider Time", "Patients Per Provider Per Hour"],
          callout:
            "Aggregate throughput improvement takes 3–7 months because one physician going faster doesn't shift department-level wait dynamics. The change requires enough adopting physicians to create system-wide capacity. Watch door-to-provider time at the department level — not per provider. When it starts moving, adoption has reached a threshold where individual behavior is becoming collective throughput.",
        },
        proof: {
          window: "Month 7–12+",
          desc: "Access outcomes confirmed",
          metrics: ["LWBS Rate (%)", "Additional Patient Volume"],
          callout:
            "LWBS moves at 7–12 months for two reasons that compound: throughput improvement has to be consistent enough that patients who would have left are actually being seen before they leave — that requires department-wide adoption; and volume has to be present to fill the recaptured capacity. Both conditions have to hold simultaneously.",
        },
      },
      {
        domain: "WORKFORCE",
        badge: "Clinician Wellbeing & Retention",
        northStar: "Voluntary Turnover",
        direction: "↓",
        sub: "After a 10-hour ED shift, documentation often doesn't end when the shift does. Sixty to ninety minutes of charting follows physicians home. Ambient capture removes this backlog by capturing documentation during the encounter rather than after it — so the post-shift queue is empty when the shift ends. The mechanism matters: Abridge doesn't just speed up documentation, it moves it from a deferred task to a completed one. The physician who leaves knowing their notes are done experiences something categorically different from one who leaves 90 minutes faster but still behind.",
        matterMostIf:
          "Each physician departure costs an estimated $250K–$500K to replace — recruiting, credentialing, onboarding, lost productivity. Locum coverage during vacancy adds further cost at 2–3× employed rates. Even one additional retention per year covers a significant portion of program cost.",
        alsoNote:
          "Engaged, non-burned-out physicians document more thoroughly (Quality) and see patients more efficiently (Capacity). Workforce outcomes ripple across the full value story.",
        chain: ["After-Shift Charting ↓", "Cognitive Load ↓", "Provider Wellbeing ↑"],
        chainOutput: "Voluntary Turnover ↓",
        tag: "modeled",
        narrative:
          "Emergency medicine physicians frequently complete documentation after their shift ends. Industry sources estimate EM physician replacement costs at $350K–$600K per departure. The model attributes only a defensible fraction of departures to documentation burden — not all turnover stems from it, and the calculation makes that explicit.",
        signal: {
          window: "Month 1–3",
          desc: "EHR behavior changes",
          metrics: ["After-Shift Charting Time (Pajama Time)", "Documentation Time Per Encounter"],
          callout:
            "For consistent adopters, EHR audit data typically shows pajama time reduction within the first month, requires no coordination, and is the most visceral proof point for physicians. It's also your adoption infrastructure — physicians who experience reduced pajama time tell each other. The peer conversation that happens around this metric is what drives adoption in months 2–6.",
        },
        trend: {
          window: "Month 3–6",
          desc: "Wellbeing signals emerge",
          metrics: ["Provider Wellbeing Score", "Intent to Stay"],
          callout:
            "Wellbeing scores move at Month 3–6 because sustained relief from documentation burden takes months to change how a physician thinks about their situation. A physician who has been considering leaving doesn't reverse that after one good week — the reversal requires experiencing a structurally different workload over time. This is the window to build the financial bridge: wellbeing improvement is the most defensible leading indicator available before the 12-month turnover window.",
        },
        proof: {
          window: "Month 12–18",
          desc: "Retention confirmed",
          metrics: ["Voluntary Physician Turnover Rate", "Locum & Agency Utilization"],
          callout:
            "Voluntary turnover requires 12–18 months for two reasons: individual departure decisions accumulate and reverse slowly, and annual departure counts are small enough that statistical movement requires a full measurement year. A group of 30 physicians at 10% voluntary turnover produces 3 departures per year — preventing 1 additional departure is meaningful financially, but requires a full year to see.",
        },
      },
      {
        domain: "REVENUE",
        badge: "Coding Integrity & Denial Prevention",
        northStar: "Revenue Per Visit",
        direction: "↑",
        sub: "E/M level 4 and 5 codes require documentation of High Medical Decision Making — the differential reasoning, the data reviewed, the risk assessment. That clinical thinking happens in the conversation; under time pressure, it rarely makes it into the note. A provider works through a careful differential on a high-acuity chest pain, orders appropriately, and then writes 'chest pain workup, 12-lead ordered' because three more patients are waiting. Ambient capture preserves the MDM as it happens. The coding change isn't upcoding — it's the note finally reflecting what was actually managed.",
        matterMostIf:
          "Your E/M distribution is skewed toward mid-level codes despite high-acuity encounters, your medical necessity denial rate is above 3–5%, or your revenue cycle team is flagging documentation gaps as a root cause of write-offs.",
        alsoNote:
          "Denial reduction is frequently the larger financial impact of the two tracks — and it lives in your revenue cycle team, not just with the physician. Cross-departmental visibility is required to tell the full story.",
        chain: ["Documentation Completeness ↑", "E/M Level Support ↑", "Medical Necessity Evidence ↑"],
        chainOutput: "Revenue Per Visit ↑",
        tag: "modeled",
        narrative:
          "More complete notes support higher E/M levels and withstand payer scrutiny. The model applies separate components for coding lift (E/M distribution improvement × volume) and denial prevention (documentation denial rate reduction × encounter volume). At scale across thousands of ED encounters, denial reduction frequently exceeds the coding story in total dollar impact.",
        signal: {
          window: "Month 1–3",
          desc: "Documentation behavior shifts",
          metrics: ["Same-Day Note Closure Rate", "Charge Lag (Days to Bill)"],
          callout:
            "Same-day note closure is the upstream gate for the entire revenue chain. Notes that close the day of service have charges submitted faster, with more complete MDM documentation. Watch charge lag and E/M distribution together — distribution shift (fewer Level 3, more Level 4) is visible before revenue numbers move, because coding changes precede payment by 60–90 days.",
        },
        trend: {
          window: "Month 2–4",
          desc: "Coding patterns emerge",
          metrics: ["E/M Level Distribution (99281–99285 mix)", "CDI Query Rate on Admissions"],
          callout:
            "A single wRVU average can sit flat while the distribution shifts meaningfully — fewer mid-level codes, more high-acuity codes. Always show the full distribution alongside the mean. When providers who adopt consistently show more high-level codes in their distribution, documentation is improving — revenue follows the coding, and coding follows the note quality.",
        },
        proof: {
          window: "Month 4–9",
          desc: "Financial recovery confirmed",
          metrics: ["wRVU Per Encounter", "Medical Necessity Denial Rate"],
          callout:
            "Revenue impact at Month 4–9 is the full chain completing: better notes → correct coding → clean claims → payment received. Medical necessity denials have an additional lag — denial, appeal, adjudication. When documentation quality is genuinely better, both paths improve simultaneously. E/M improvement is recovery, not inflation — the work was done; the note now reflects it.",
        },
      },
      {
        domain: "QUALITY",
        badge: "Protocol Adherence & Clinical Evidence",
        northStar: "Quality Measure Compliance",
        direction: "↑",
        sub: "Quality measure compliance is partly a documentation attribution problem: if the clinical action wasn't documented with the right specificity, quality systems can't attribute it. Time-sensitive decisions — when to start antibiotics in sepsis, the reasoning behind a thrombolytics decision, the triage-to-treatment timeline — happen at high speed during the encounter. Notes reconstructed hours later compress or lose that clinical reasoning. Ambient capture records the why at the moment it was articulated, not when the provider finally gets to the chart.",
        matterMostIf:
          "Your quality program shows compliance gaps that don't match your clinical team's account of care delivered, you're facing CMS core measure pressure, or your quality director is spending bandwidth resolving documentation deficiencies rather than driving improvement initiatives.",
        alsoNote:
          "Documentation quality in the ED has downstream effects beyond quality scores — it reduces CDI query burden on ED-to-admit transitions and strengthens the clinical record for risk and compliance review.",
        chain: ["In-Encounter Documentation ↑", "Clinical Reasoning Captured ↑", "Quality Attribution ↑"],
        chainOutput: "Quality Measure Compliance ↑",
        tag: "tracked",
        narrative:
          "Quality program compliance requires documentation of clinical reasoning — not just actions taken. Real-time capture via Abridge preserves the 'why' as it was articulated during the encounter, enabling attribution to core measures, sepsis bundles, and protocol elements. The signal here is tracked rather than modeled because quality incentive structures are health system- and payer-specific.",
        signal: {
          window: "Month 1–3",
          desc: "Documentation behavior shifts",
          metrics: ["Note Completion Rate (Same Shift)", "CDI Query Rate on ED Admissions"],
          callout:
            "CDI query rate on ED admissions drops in the first 1–3 months because clinical documentation is capturing complexity during the encounter rather than requiring clarification after it. A declining rate is evidence that documentation quality is improving — observable months before any quality score moves.",
        },
        trend: {
          window: "Month 3–6",
          desc: "Measure attribution improves",
          metrics: ["Core Measure Documentation Rate", "Documentation Deficiency Rate"],
          callout:
            "Core measure documentation rates move at Month 3–6 because quality teams need time to review whether the documentation elements are present before reporting cycles reflect the change. Attribution logic has a lag of several weeks. Track whether the note contains the required clinical content — did the provider document the specific element the measure requires? — before expecting the compliance score to move.",
        },
        proof: {
          window: "Month 6–12",
          desc: "Quality scores confirmed",
          metrics: ["Quality Measure Compliance Score", "Deficiency Resolution Rate"],
          callout:
            "Quality scores at Month 6–12 represent documentation improvements from earlier periods processed through quality reporting systems. Every hour a quality team spends resolving deficiencies is an hour not spent on improvement initiatives. A declining deficiency rate means quality capacity is being freed — that operational return is often larger than the compliance score improvement itself.",
        },
      },
    ],
  },

  inpatient: {
    label: "Inpatient",
    coverSubtitle:
      "A transparent framework for understanding\nwhere Abridge creates value in inpatient medicine",
    contextHeadline:
      "In inpatient medicine, documentation is the clinical record that drives length of stay, DRG accuracy, and risk-adjusted quality scores.",
    contextBody:
      "Hospitalists manage 15–20 patients per shift, each requiring a complete progress note. The documentation obligation is mathematical: 15 patients × 8 minutes = 2 hours of daily charting before anything else. Abridge addresses this at the point of care — during rounding, not afterward.",
    adoptionCallout:
      "All outcomes in this framework require consistent Abridge adoption. Partial use produces partial results. The Signal / Trend / Proof timeline on each domain page shows what to track, and when — starting with the metrics directly visible in existing EHR and clinical data.",
    domains: [
      {
        domain: "CAPACITY",
        badge: "Discharge Planning Efficiency",
        northStar: "Documentation-Attributed Discharge Delays",
        direction: "↓",
        sub: "Hospital discharge is a multi-party coordination problem: the attending writes the progress note, case management acts on it, social work arranges placement, pharmacy reviews medications, the patient and family prepare. If the progress note arrives at 2pm instead of 8am, every downstream party starts 6 hours late. A discharge goal documented at 8am means placement can be confirmed by 10am. The same decision at 2pm means placement confirmed at 5pm — after SNF intake coordinators have gone home, extending the stay by a full day. Documentation timing is a direct upstream input to discharge timing.",
        matterMostIf:
          "Utilization management is flagging documentation gaps as a reason for delayed discharge orders, your avoidable day rate is above peer benchmark, or CDI query loops are slowing the discharge planning process. Payers track avoidable days and use them to challenge medical necessity on concurrent review.",
        alsoNote:
          "Progress notes that arrive before the care team disperses also support more thorough rounding — hospitalists present with the patient rather than mentally composing the next note.",
        chain: ["Progress Note Timeliness ↑", "Shared Clinical Picture ↑", "Discharge Planning Earlier"],
        chainOutput: "Documentation-Attributed Delays ↓",
        tag: "modeled",
        narrative:
          "When progress notes are complete before the care team disperses, case managers, social workers, and consultants can act on the clinical picture without waiting for a note that lands hours later. The model estimates savings from reducing documentation-related delays specifically — not total LOS improvement. The discharge delay is often the note, not the decision.",
        signal: {
          window: "Week 4–8",
          desc: "Note timeliness moves",
          metrics: ["Progress Note Completion Time", "Same-Encounter Note Completion Rate"],
          callout:
            "Progress note completion time shows up in EHR audit data within the first month. This is the first upstream signal: when notes complete before rounding ends, the clinical picture is available to the full care team earlier in the day. Without this changing, nothing downstream in the discharge chain can improve — case managers can't act on notes that don't exist yet.",
        },
        trend: {
          window: "Month 2–5",
          desc: "Planning and coordination follow",
          metrics: ["Time to Discharge Goal Documentation", "Case Manager Notification Lead Time"],
          callout:
            "Case management notification lead time moves at Month 2–5 because it requires the full care team to adapt their workflow, not just the physician to change documentation behavior. Case managers need to update their rounding patterns to check early notes; social workers need new expectations. Workflow coordination change has an inherent lag after individual behavior changes — the system has to catch up to the individual.",
        },
        proof: {
          window: "Month 4–12",
          desc: "Delay cause codes move",
          metrics: ["Documentation-Attributed Delay Rate", "Avoidable Day Rate"],
          callout:
            "Always filter to the documentation-specific cause code bucket — total avoidable day rate has too many concurrent drivers to attribute cleanly. The documentation-attributed subset is where Abridge has direct attribution. Avoidable day measurement requires administrative coding of delay causes, which is reviewed retrospectively — that's the source of the Month 4–12 lag.",
        },
      },
      {
        domain: "WORKFORCE",
        badge: "Clinician Wellbeing & Retention",
        northStar: "Voluntary Turnover",
        direction: "↓",
        sub: "The hospitalist documentation burden is mathematical: a 15-patient panel with 8-minute progress notes requires 2 hours of charting per shift before rounding even begins. That 2 hours either compresses patient interactions during the shift or converts to post-shift work that follows the physician home. Ambient capture changes the math: a 15-patient panel with 2-minute note reviews instead of 8-minute note creation returns 60–90 minutes per shift. The cognitive weight of knowing a documentation backlog is accumulating also dissipates — and that sustained relief is what drives the wellbeing change that leads retention.",
        matterMostIf:
          "Replacing a hospitalist costs an estimated $250K–$500K fully loaded — recruiting, credentialing, onboarding, productivity ramp. Locum coverage during vacancy adds further cost at 2–3× employed rates. At 10% turnover on 30 hospitalists, that's 3 replacements per year. Preventing one additional departure can offset a year of Abridge costs.",
        alsoNote:
          "Hospitalists who aren't burned out document more thoroughly (Revenue → DRG accuracy) and are more present in patient conversations (Quality → HCAHPS scores). Workforce outcomes ripple across the full value story.",
        chain: ["After-Shift Charting ↓", "Cognitive Load During Rounding ↓", "Provider Wellbeing ↑"],
        chainOutput: "Voluntary Turnover ↓",
        tag: "modeled",
        narrative:
          "Documentation extending beyond shift hours is a persistent burnout driver for hospitalists. Industry sources estimate hospitalist replacement costs at $350K–$500K per departure. The model attributes only a defensible fraction of departures to documentation burden — the same conservative approach applied to every workforce calculation across all care settings.",
        signal: {
          window: "Week 4–8",
          desc: "Charting behavior changes",
          metrics: ["After-Shift Charting Time (Pajama Time)", "Progress Note Completion Rate (Same Shift)"],
          callout:
            "Post-shift EHR time is the most objective, most visceral early signal. It's visible in audit logs, requires no surveys, and reflects what hospitalists feel most strongly. When post-shift charting time drops consistently, something categorically different is happening — the shift ending and the work actually being done are no longer separated. That experience is what drives peer-to-peer adoption.",
        },
        trend: {
          window: "Month 2–5",
          desc: "Wellbeing signals emerge",
          metrics: ["Provider Wellbeing Score", "Intent to Stay"],
          callout:
            "Wellbeing surveys at Month 2–5 connect documentation relief to the retention forecast. The important framing: wellbeing improvement is not a soft metric — it's the leading indicator for a financial outcome (turnover cost avoidance) with a longer measurement window. Build the financial bridge from wellbeing improvement to retention forecast explicitly, so the story is credible by Month 6 when you need it.",
        },
        proof: {
          window: "Month 12–18",
          desc: "Retention and cost impact",
          metrics: ["Voluntary Hospitalist Turnover Rate", "Locum & Agency Utilization"],
          callout:
            "Hospitalist retention data takes 12–18 months because voluntary departure decisions accumulate slowly and reverse slowly. A group of 30 hospitalists at 10% voluntary turnover produces 3 departures per year. The strategy: establish post-shift charting reduction as objective early evidence (Month 1), connect wellbeing improvement to the retention forecast (Month 6), and let turnover data confirm as the program matures.",
        },
      },
      {
        domain: "REVENUE",
        badge: "Case Mix & DRG Accuracy",
        northStar: "Case Mix Index",
        direction: "↑",
        sub: "DRG reimbursement is driven by clinical complexity — specifically whether complication and comorbidity codes are captured with sufficient specificity to affect the DRG weight. A patient hospitalized for acute systolic heart failure with iron deficiency anemia and stage 3 CKD carries three separate conditions that each affect DRG weight — but only if documented with that clinical specificity. 'Heart failure' and 'anemia' don't carry MCC designation. 'Acute systolic heart failure' and 'iron deficiency anemia' do. That clinical nuance existed in the encounter — ambient capture preserves it in the note.",
        matterMostIf:
          "Your CMI is below peer benchmark despite similar patient acuity, your CDI team is running high query volume, your coder query-back rate is above 15%, or your DRG downgrade rate on concurrent review is climbing. If your CMI is consistently below peers with similar complexity, documentation is likely the gap — not case mix.",
        alsoNote:
          "Better inpatient documentation also strengthens observation status defense and audit protection — when progress notes capture clinical reasoning for continued inpatient level of care, concurrent review is more defensible.",
        chain: ["Clinical Detail Captured ↑", "CC/MCC Documentation ↑", "DRG Accuracy ↑"],
        chainOutput: "Case Mix Index ↑",
        tag: "modeled",
        narrative:
          "Inpatient DRG reimbursement is driven by case complexity — specifically whether CC and MCC codes are captured in the discharge record. CDI queries are documentation failures made visible: each query represents a clinical condition that was known but not captured with sufficient specificity. More thorough documentation reduces CDI query burden and supports higher case mix capture.",
        signal: {
          window: "Month 1–3",
          desc: "CDI query volume drops",
          metrics: ["Coder Query-Back Rate", "CDI Query Rate per Provider"],
          callout:
            "CDI query rate is the most direct early signal of documentation quality improvement, and it's already tracked in most health systems. Each CDI query is a documentation failure made visible — a clinical condition the provider knew about that wasn't captured with sufficient specificity for DRG accuracy. When query rates drop, documentation is improving — observable months before claims data reflects the change.",
        },
        trend: {
          window: "Month 3–6",
          desc: "Coding accuracy shifts",
          metrics: ["CC/MCC Capture Rate", "DRG Downgrade Rate"],
          callout:
            "Track CC/MCC capture at the provider cohort level, not just in aggregate. Providers who adopt Abridge consistently often show clear improvement in their own CC/MCC rates before it shows in hospital-wide CMI data. Cohort-level analysis separates Abridge's effect from concurrent case mix shifts — that separation is what makes the story defensible to a skeptical CFO.",
        },
        proof: {
          window: "Month 6–12",
          desc: "CMI and denial trends confirm",
          metrics: ["Case Mix Index vs. Peer Benchmark", "Denial Rate (Documentation-Related)"],
          callout:
            "CMI movement at Month 6–12 is the aggregate result of provider-level capture improvements processed through a quarterly claims cycle. CMS IPPS public data allows a peer comparison — if your CMI is improving while peer hospitals with similar acuity are flat, documentation quality is the differentiator. That comparison is more compelling than a before/after that could be explained by patient mix shift.",
        },
      },
      {
        domain: "QUALITY",
        badge: "Severity Capture & Risk Adjustment",
        northStar: "Risk-Adjusted Quality Score Accuracy",
        direction: "↑",
        sub: "Risk-adjusted quality metrics — observed-to-expected mortality, readmission rates, PSI-90 — use documented complexity to calculate the expected outcome. If documentation understates how sick the patient was, the risk model assumes a lower-acuity case, sets a lower expected mortality, and any adverse outcome looks worse relative to peers. Documentation doesn't change what care was delivered — but it does determine whether quality systems credit the care appropriately. Complete severity documentation improves the denominator (expected outcomes), which improves the O/E ratio, even when actual care quality is unchanged.",
        matterMostIf:
          "Your observed-to-expected ratios on mortality or readmissions look worse than peer hospitals with similar patient populations, CDI query volume on complex admissions is high, or your CMO is concerned that quality scores don't reflect actual care quality. If your O/E ratios are higher than peers with similar complexity, documentation is likely the gap.",
        alsoNote:
          "CDI graduation signal: when CDI query volume drops consistently, it means documentation is capturing complexity at the point of care rather than requiring clarification after the fact. The quality and revenue stories converge here.",
        chain: ["Clinical Complexity Documented ↑", "Severity of Illness Captured ↑", "Risk Adjustment Accurate ↑"],
        chainOutput: "Quality Score Accuracy ↑",
        tag: "tracked",
        narrative:
          "Risk-adjusted quality metrics — observed-to-expected mortality, readmission rates, PSI-90 composite — depend on the severity adjustment applied to each case. Severity adjustment is only as accurate as the severity documentation. When comorbidities are underrepresented, risk models underestimate expected outcomes and performance appears worse than it actually is.",
        signal: {
          window: "Month 2–4",
          desc: "CDI query rates respond",
          metrics: ["CDI Query Rate per Provider", "CDI Query Agreement Rate"],
          callout:
            "When CDI query rate drops consistently and agreement rate on remaining queries also drops (CDI is increasingly sending queries on ambiguous cases rather than clear documentation gaps), the documentation quality baseline has improved. This is the graduation signal: documentation is capturing complexity at the point of care rather than requiring clarification after the fact. Start watching severity classification data.",
        },
        trend: {
          window: "Month 3–7",
          desc: "Severity capture improves",
          metrics: ["High-Severity Case Classification Rate (SOI 3/4)", "Chronic Condition Documentation Rate"],
          callout:
            "SOI level improvement shows up in CDI and coding data before it appears in publicly reported quality scores. Track it at the provider cohort level — SOI improvement on Abridge-adopting providers builds the attribution story before external reporting reflects it. Building this cohort-level evidence is how you get ahead of the annual quality reporting cycle.",
        },
        proof: {
          window: "Month 6–18",
          desc: "Quality scores reflect reality",
          metrics: ["Observed vs. Expected Mortality Rate", "Core Measure Compliance Rate"],
          callout:
            "CMS risk-adjusted quality scores reflect the prior measurement year — changes in documentation quality made today won't appear in public reporting for 12–18 months. The internal signal path is shorter: CDI query reduction at 3–4 months, SOI classification improvement at 4–7 months, O/E ratio improvement in internal quality reports at 6–9 months. Each stage builds the evidentiary chain before the public score confirms it.",
        },
      },
    ],
  },

  nursing: {
    label: "Nursing",
    coverSubtitle:
      "A transparent framework for understanding\nwhere value lives when there's no billing relationship",
    contextHeadline:
      "Nursing is the hardest setting to model ROI — and the most important to get right.",
    contextBody:
      "Research consistently places documentation burden at 25–35% of each nursing shift. Reclaiming that time shows up in overtime reduction, retention improvement, and more time at the bedside. The quality footprint is the largest in the building: falls, HAPIs, CAUTIs, CLABSIs, and sepsis bundle compliance all run through nursing documentation.",
    adoptionCallout:
      "All outcomes in this framework require consistent Abridge Nursing adoption. Partial use produces partial results. The Signal / Trend / Proof timeline on each domain page shows what to track, and when — starting with the metrics directly visible in existing EHR and payroll data.",
    domains: [
      {
        domain: "CAPACITY",
        badge: "Shift Efficiency & Direct Care Time",
        northStar: "Point-of-Care Documentation Rate",
        direction: "↑",
        sub: "A nursing shift has a fixed amount of time. When documentation is batched at the end — assessments recalled from memory, flowsheets completed after twelve hours of care — the shift ends with an open queue rather than a closed chart. That queue is what generates overtime, erodes bedside presence during the shift, and produces documentation lag that delays every downstream consumer of the nursing record. Point-of-care documentation rate is the upstream behavior that changes all of it: when nurses document at the moment of care, the queue never accumulates. The financial consequence — overtime reduction — is quantified in the Workforce domain, where it belongs as a labor cost. The capacity story is what causes it.",
        matterMostIf:
          "Nurses are consistently leaving after their scheduled shift end to finish charting, bedside time ratio is low relative to benchmark, or the charge nurse is managing a unit where documentation lag affects care coordination — oncoming shifts reading outdated charts, care plans that don't reflect current patient status.",
        alsoNote:
          "Point-of-care documentation also feeds the HCAHPS nurse communication story: a nurse documenting at the bedside is present and engaged rather than mentally composing the next batch entry. That attentional presence is what the nurse communication composite measures.",
        chain: ["Documentation at Point of Care ↑", "End-of-Shift Queue ↓", "Shift Completes On Time ↑"],
        chainOutput: "Bedside Time ↑  |  Overtime ↓ (see Workforce)",
        tag: "tracked",
        narrative:
          "Point-of-care documentation rate is measured from EHR audit logs — the share of documentation entries timestamped within 15 minutes of the associated care event. It is the behavioral leading indicator that predicts every downstream nursing outcome: bundle compliance, harm event reduction, and overtime elimination. Watch this metric first; everything else follows it.",
        signal: {
          window: "Week 2–6",
          desc: "Documentation timing shifts to point of care",
          metrics: ["Point-of-Care Documentation Rate", "Post-Shift EHR Session Time"],
          callout:
            "Point-of-care documentation rate and post-shift EHR session time are visible from EHR audit logs within the first two to six weeks of deployment. No new infrastructure required. These are the earliest behavioral signals that the documentation habit has shifted — and the data that drives peer adoption on the unit when nurses who leave on time tell each other.",
        },
        trend: {
          window: "Month 1–3",
          desc: "Documentation lag compresses, bedside time rises",
          metrics: ["Median Documentation Lag (Minutes)", "Bedside Time Ratio (Direct Care %)"],
          callout:
            "Documentation lag — median minutes from care event to chart entry — compresses at Month 1–3 as point-of-care documentation rate stabilizes. Bedside time ratio follows as the cognitive load of the accumulating queue lifts. These two metrics together confirm that the behavioral change is translating into a different shift experience, not just a different documentation timing.",
        },
        proof: {
          window: "Month 3–6",
          desc: "Shift efficiency confirmed; Workforce outcomes begin",
          metrics: ["On-Time Shift Completion Rate", "Documentation Queue Size at Shift End"],
          callout:
            "On-time shift completion rate — the share of shifts ending without a post-shift documentation queue — is the capacity proof metric. When it stabilizes above baseline, the downstream Workforce outcomes (overtime cost reduction, burnout score improvement) have the behavioral foundation they need to emerge. The capacity story closes here; the financial story continues in Workforce.",
        },
      },
      {
        domain: "WORKFORCE",
        badge: "Nurse Wellbeing & Staffing Economics",
        northStar: "Overtime Cost + Voluntary Turnover",
        direction: "↓",
        sub: "Nursing documentation burden creates two distinct financial exposures — one immediate, one deferred. The immediate exposure is overtime: nurses are hourly employees, and post-shift charting is a hard cost in the payroll register. Eight minutes saved per patient across a 6-patient panel is 48 minutes per shift, which sits inside a typical overtime threshold. The deferred exposure is turnover: a 12-hour shift with 60–90 minutes of post-shift documentation compresses recovery time structurally, and documentation burden appears consistently in exit surveys and ANA research as a top driver of departure intent. The mechanism is cumulative — no single shift drives a resignation, but the accumulated weight of hundreds eventually does. Both exposures respond to the same upstream change: documentation that happens during the shift rather than after it.",
        matterMostIf:
          "Overtime is a visible line item in your nursing budget, time-and-attendance data shows consistent post-shift EHR activity, or turnover on high-documentation units is above your system average. Replacing one bedside RN costs $50K–$100K fully loaded — recruiting, onboarding, orientation, productivity ramp. A unit with 20 nurses at 18% turnover replaces 3–4 nurses per year, and each vacancy drives agency and travel spend at 2–3× employed rates.",
        alsoNote:
          "Stable nursing workforce reduces the institutional knowledge loss that compounds when experienced nurses leave. Fewer open shifts means less per diem and agency exposure — and the nurses who stay are less likely to be covering for absent colleagues, which compounds burnout.",
        chain: ["Documentation Burden Per Shift ↓", "Post-Shift Queue Eliminated ↓", "Overtime Cost ↓  |  Nurse Wellbeing ↑"],
        chainOutput: "Overtime ↓  +  Voluntary Turnover ↓",
        tag: "modeled",
        narrative:
          "Two separate financial models run in this domain. Overtime is payroll-verifiable within 90 days — no attribution model needed, just a before-after comparison on the same units. Turnover requires a longer horizon: the model attributes a defensible fraction of departures to documentation burden rather than claiming all turnover stems from it, and the leading indicators (charting-after-shift time, burnout scores, likelihood-to-stay surveys) are what you watch while waiting for the turnover data to accumulate.",
        signal: {
          window: "Week 2–6",
          desc: "Post-shift charting drops; OT trajectory visible",
          metrics: ["Charting After Shift (Minutes)", "Post-Shift EHR Session Time"],
          callout:
            "Charting-after-shift time is the earliest financial signal in the nursing workforce story — it's the behavior that directly generates overtime, and it shows up in EHR audit logs within weeks of consistent adoption. When this metric drops, the payroll consequence follows at the next comparison period. This is also the data that drives peer adoption: nurses who leave on time tell each other.",
        },
        trend: {
          window: "Month 2–6",
          desc: "OT cost confirmed; wellbeing signal emerges",
          metrics: ["Overtime Hours Per Unit Per Pay Period", "Burnout Score (Survey)", "Likelihood to Stay"],
          callout:
            "Overtime data becomes confirmable at Month 2–4 when payroll has a full prior period for comparison — before versus after, same units, controlled for census. Present it simply: overtime hours these units, before deployment versus after. Meanwhile, wellbeing survey scores at Month 2–4 connect documentation relief to the retention forecast. A burnout score improving and likelihood-to-stay rising is evidence that the departure calculus is changing before the turnover data can confirm it.",
        },
        proof: {
          window: "Month 6–18",
          desc: "Retention cost and annual OT savings confirmed",
          metrics: ["Annual OT Spend Comparison (Pilot Units)", "Voluntary Nurse Turnover Rate", "Agency and Travel Nurse Spend"],
          callout:
            "The 12-month payroll comparison closes the overtime story without any model — OT spend on Abridge units this year versus last year, adjusted for census and unit mix. Turnover data requires 12–18 months; a unit with 20 nurses at 18% turnover produces only 3–4 departures per year, which is too small to show a statistically meaningful trend in a shorter window. The near-term financial proxy is agency and travel spend: open shifts that would have been filled at 2–3× employed rates are the first financial signal that retention is stabilizing.",
        },
      },
      {
        domain: "REVENUE",
        badge: "Clinical Record Integrity",
        northStar: "Compliance Deficiency Rate",
        direction: "↓",
        sub: "Nurses don't generate billing codes, but nursing documentation is directly audited by CMS, state surveyors, and commercial payers. Incomplete assessments, late-documented vital signs, and missing flowsheet elements aren't administrative gaps — for audit purposes, an assessment that wasn't documented wasn't done. A Braden scale assessment completed correctly but charted 6 hours later is a documentation deficiency. Payers conducting concurrent review look at nursing records for medical necessity support; gaps in nursing documentation give them grounds to reduce or deny level-of-care authorization. There are two distinct revenue mechanisms: deficiency reduction (preventing denials) and documentation completion at discharge (removing the billing hold that keeps clean claims in the DNFB bucket).",
        matterMostIf:
          "Your compliance team is flagging nursing documentation as a risk area, CMS surveys or Joint Commission reviews have cited nursing record deficiencies, concurrent review by payers is finding documentation gaps that support denial activity, or revenue cycle is reporting DNFB days attributable to incomplete nursing discharge documentation.",
        alsoNote:
          "Complete nursing documentation corroborates CDI evidence for CC/MCC capture. Nursing observations — wound measurements, functional status, intake/output trends, and pain trajectory — are the supporting data that makes a physician's severity specificity claim credible when CDI queries for condition specificity. When nursing charting is concurrent and complete, CDI reviewers find fewer gaps between what physicians documented and what the nursing record shows.",
        chain: ["Flowsheet Completeness ↑", "Discharge Documentation Complete at Discharge ↑", "Audit Vulnerability ↓  |  DNFB Days ↓"],
        chainOutput: "Compliance Deficiency Rate ↓  +  Billing Holds Released",
        tag: "modeled",
        narrative:
          "Two financial paths run through nursing documentation completeness. The deficiency reduction path: payer and regulatory auditors can't review care that wasn't documented — a fall risk assessment that wasn't charted is, for audit purposes, a fall risk assessment that wasn't done. The billing hold path: nursing discharge documentation is a prerequisite for claim submission; every day a claim sits in DNFB because nursing documentation is incomplete is cash flow deferred. Both paths are modeled by applying reduction rates to encounter volume, restricted to documentation-attributable fractions.",
        signal: {
          window: "Week 2–6",
          desc: "Completeness and timeliness rates respond",
          metrics: ["Flowsheet Completion Rate", "On-Time Assessment Completion Rate", "Documentation Completion Rate at Discharge"],
          callout:
            "Flowsheet completion rates and discharge documentation completion rates are visible in existing EHR dashboards within the first weeks of deployment. Compliance teams often track completion rates already. A rising completion rate is the first signal that documentation behavior has changed — and the most direct leading indicator for both audit vulnerability reduction and DNFB improvement.",
        },
        trend: {
          window: "Month 2–5",
          desc: "Internal audit findings improve; DNFB moves",
          metrics: ["Internal Compliance Audit Score", "Documentation Deficiency Finding Rate", "DNFB Days (Nursing-Attributable)"],
          callout:
            "Internal audit scores move at Month 2–5 as compliance review cycles process documentation from prior weeks. DNFB days attributable to nursing documentation holds are trackable in revenue cycle reporting and often show movement at the same horizon — discharge documentation completeness is close to the billing event, so the hold-release cycle responds faster than audit findings.",
        },
        proof: {
          window: "Month 6–18",
          desc: "Denial trends and audit exposure confirmed",
          metrics: ["Regulatory Survey Deficiency Rate", "Documentation-Related Denial Rate", "CDI Query Response Rate (Nursing-Supported)"],
          callout:
            "Regulatory survey deficiency rates are infrequent and multi-factorial. The continuous proof metric is documentation-related denial rates in concurrent payer review — attributable, already tracked by revenue cycle, and responsive to nursing documentation quality specifically. CDI query response rate — the share of physician queries where complete nursing documentation already provides the supporting evidence — is the metric that shows how nursing documentation quality is lifting the inpatient DRG accuracy story in parallel.",
        },
      },
      {
        domain: "QUALITY",
        badge: "Patient Safety & Bundle Compliance",
        northStar: "Nursing-Sensitive Harm Events",
        direction: "↓",
        sub: "A care bundle completed but not documented is, for compliance measurement, a bundle step not completed. CAUTI prevention protocols, CLABSI insertion checklists, fall prevention interventions, and HAPI repositioning logs all run through nursing documentation. The mechanism is specific to each harm type: HAPIs are prevented when Stage 1 skin changes are documented while still Stage 1, triggering repositioning before injury progresses. Falls are prevented when Morse Fall Scale scores are updated at point of care after medication changes and ambulation events — not recalled at shift end. CAUTIs are prevented when daily catheter necessity documentation creates the workflow trigger that prompts removal. CLABSIs are prevented when bundle elements are timestamped as performed, creating an auditable compliance record. SEP-1 compliance is protected when antibiotics are documented at administration rather than recalled later — a 45-minute documentation lag can flip a compliant case to non-compliant in the quality system.",
        matterMostIf:
          "Your CNO or VP of Patient Safety is tracking nursing-sensitive harm event rates as a safety program goal, your hospital participates in the CMS HAC Reduction Program, or your patient safety program has specific targets for fall rates, HAPI incidence, or bundle compliance that nursing documentation quality directly enables.",
        alsoNote:
          "Improvement in CMS Overall Hospital Quality Star Rating — nursing-sensitive harm event rates feed into multiple safety and quality domains that determine the publicly visible star rating patients and families use when choosing where to receive care. CMS does not reimburse for Stage 3+ HAPIs or certain CLABSIs that develop during a hospital stay, making the financial exposure both the treatment cost and the lost reimbursement.",
        chain: ["Real-Time Assessment Documentation ↑", "Protocol & Bundle Compliance ↑", "Harm Event Attribution Accurate ↑"],
        chainOutput: "Harm Event Rate ↓",
        tag: "tracked",
        narrative:
          "Bundle compliance cannot be measured if documentation is incomplete — and it cannot be improved if the compliance data is lagging by a shift. When assessment and intervention documentation happens at point of care, quality teams have same-day visibility into protocol adherence patterns rather than discovering gaps at weekly incident review. Bundle compliance is the process measure; harm events are the outcome. Watch the process first.",
        signal: {
          window: "Week 2–Month 2",
          desc: "Assessment timeliness and reassessment frequency respond",
          metrics: ["Fall Risk Reassessment Completion Rate (Post-Medication / Post-Ambulation)", "Skin & Pressure Injury Assessment Rate", "Catheter Utilization Ratio", "SEP-1 Documentation Timeliness"],
          callout:
            "Assessment completion and reassessment frequency are the fastest-moving quality signals — already tracked by quality departments and visible within weeks of consistent adoption. Fall risk reassessment frequency after clinical events (medication changes, ambulation) and catheter utilization ratio are the metrics that confirm the mechanism is working: not just that documentation is happening, but that it is happening at the right moment to trigger the prevention protocol.",
        },
        trend: {
          window: "Month 2–6",
          desc: "Bundle compliance moves; harm event exposure compresses",
          metrics: ["Care Bundle Compliance Rate (SEP-1, CAUTI, CLABSI)", "HAPI Stage 1 Detection Rate", "Catheter Days per Admission"],
          callout:
            "Graduation signal: don't expect harm event rates to move until bundle compliance is consistently high on Abridge units. Bundle compliance is the process measure; harm events are the outcome. HAPI Stage 1 detection rate — the share of pressure injury documentation captured at Stage 1 rather than Stage 2+ — is the mechanism-specific trend metric that confirms early documentation is intercepting injuries before they progress. Catheter days per admission declining means the daily necessity review is working.",
        },
        proof: {
          window: "Month 6–18",
          desc: "Harm event rates confirm",
          metrics: ["Nursing-Sensitive Harm Event Rate (Falls, HAPI, CAUTI, CLABSI)", "SEP-1 Bundle Compliance Rate", "CMS HAC Reduction Score"],
          callout:
            "Harm events are low-frequency outcomes that require substantial volume and time to show statistically meaningful trends. Build the quality narrative in sequence: assessment timeliness up (Month 1) → bundle compliance up (Month 3–6) → harm events declining (Month 12+). Leading with harm event data and waiting for it to move is the wrong approach — the process measures are what confirm the program is working while waiting for the outcome data to accumulate.",
        },
      },
    ],
  },

  outpatient: {
    label: "Outpatient",
    coverSubtitle:
      "A transparent framework for understanding\nwhere Abridge creates value in outpatient medicine",
    contextHeadline:
      "Outpatient physicians spend more time on documentation than nearly any other clinical activity.",
    contextBody:
      "Studies consistently show office-based physicians spend roughly 2 hours per day on EHR tasks outside direct patient care. When ambient documentation reduces time per visit, that recovered time becomes available for additional appointments, reduced after-hours charting, and more accurate clinical records.",
    adoptionCallout:
      "All outcomes in this framework require consistent Abridge adoption. Partial use produces partial results. The Signal / Trend / Proof timeline on each domain page shows what to track, and when — starting with the metrics most directly influenced by documentation behavior.",
    domains: [
      {
        domain: "CAPACITY",
        badge: "Panel Capacity & Appointment Access",
        northStar: "Patient Access",
        direction: "↑",
        sub: "Each outpatient visit slot is scheduled, but documentation extends beyond it. When a 20-minute visit requires 12 minutes of note completion afterward, the provider is running behind by visit 5. By the end of a 24-patient day, the provider is 1–2 hours behind — which either extends the day or converts into evening charting. When documentation time drops, that time is recovered — but the capacity story requires that scheduling operations actually absorb recovered time into new appointments, not just leave schedule white space. That scheduling coordination is the step between documentation improvement and access improvement.",
        matterMostIf:
          "Your third next available appointment is above benchmark (14+ days warrants active attention), same-day access is limited, providers are running behind due to documentation, or you're competing on access in a market where patients actively choose providers based on wait time.",
        alsoNote:
          "In markets where patients choose providers, access is a competitive differentiator. Reducing TNA from 21 days to 14 days can measurably affect patient satisfaction scores and market share.",
        chain: ["Visit Documentation Time ↓", "Available Clinical Time ↑", "Panel Capacity ↑"],
        chainOutput: "Patient Access ↑",
        tag: "modeled",
        narrative:
          "Clinical time is the binding constraint on outpatient panel capacity. The model applies a realistic conversion rate of 40–50% of documentation time saved to account for workflow absorption and scheduling constraints — not all recovered time becomes schedulable appointments. The output is a defensible estimate, not a theoretical maximum.",
        signal: {
          window: "Week 4–8",
          desc: "Documentation time drops",
          metrics: ["Post-Visit Note Completion Time", "Same-Day Note Completion Rate"],
          callout:
            "Post-visit note completion time and same-day note completion rate are the upstream behavioral gates. When note completion time reaches a consistent low and same-day rate is high, the provider has recaptured time from the schedule. The next question is whether scheduling is using it — that's the transition to Trend stage. The behavioral change has to stabilize before the scheduling change can begin.",
        },
        trend: {
          window: "Month 2–4",
          desc: "Scheduling absorbs recaptured time",
          metrics: ["After-Hours EHR Activity", "Same-Day Appointment Slot Availability"],
          callout:
            "After-hours EHR activity is the critical Trend-stage metric because it distinguishes two scenarios: did the provider genuinely recapture shift time, or did the work just shift to later in the day? If pajama time isn't dropping, same-day slot availability won't open — the recovered time has been reabsorbed elsewhere. When both metrics move together, the system has genuinely freed capacity.",
        },
        proof: {
          window: "Month 4–12",
          desc: "Access metrics confirm",
          metrics: ["Third Next Available Appointment", "Panel Size per Provider"],
          callout:
            "Third Next Available (TNA) moves at Month 4–12 because scheduling reflects bookings made weeks to months in advance. TNA doesn't improve until new slots are added to the schedule, new slots aren't added until scheduling operations are confident in the new capacity, and that confidence requires a sustained behavioral change that scheduling managers can observe. The lag is operational, not clinical.",
        },
      },
      {
        domain: "WORKFORCE",
        badge: "Provider Wellbeing & Retention",
        northStar: "Voluntary Turnover",
        direction: "↓",
        sub: "A provider seeing 24 patients per day carrying 3 minutes of incomplete documentation per visit enters the evening with 72 minutes of charting backlog — every day, structurally, not occasionally. Ambient capture eliminates that backlog at the point of care. The mechanism that matters most for the retention story isn't time savings in the abstract — it's the difference between leaving the clinic knowing the work is done versus leaving knowing it isn't. That psychological shift, experienced consistently, is what eventually changes departure calculus.",
        matterMostIf:
          "At $250K–$350K per replacement for primary care and higher for specialists, even one additional retention per year covers a significant portion of program cost. Documentation burden is consistently cited in exit interviews as a contributing factor — the attribution is already in your own data.",
        alsoNote:
          "Providers who aren't burned out document more thoroughly (Revenue → E/M accuracy) and are more present in patient conversations (Quality → patient-reported experience). Workforce and quality stories reinforce each other.",
        chain: ["After-Visit Charting Time ↓", "Evening Documentation Burden ↓", "Provider Wellbeing ↑"],
        chainOutput: "Voluntary Turnover ↓",
        tag: "modeled",
        narrative:
          "Industry estimates place voluntary physician replacement costs at $250K–$500K per departure, accounting for recruiting, locum coverage, credentialing, and productivity ramp. The model explicitly attributes only an estimated fraction of departures to documentation burden rather than claiming all turnover stems from it — the connection is defensible and the estimate is conservative.",
        signal: {
          window: "Week 4–8",
          desc: "Pajama time drops",
          metrics: ["After-Hours Charting Time (Pajama Time)", "Post-Visit Note Completion Time"],
          callout:
            "After-hours charting time reduction shows up in EHR audit logs within the first month, is objective, and doesn't require survey coordination. This is the proof point physicians reference when recommending Abridge to colleagues — that peer recommendation is more effective than any formal communication. Signal-stage data isn't just evidence of program success; it's the word-of-mouth engine for adoption.",
        },
        trend: {
          window: "Month 2–5",
          desc: "Wellbeing signals emerge",
          metrics: ["Provider Wellbeing Score", "Intent to Stay"],
          callout:
            "Wellbeing surveys at Month 2–5 translate documentation burden relief into the retention narrative. The key framing: wellbeing improvement isn't a soft HR metric — it's a leading indicator for a financial outcome. A provider wellbeing score moving in the right direction at Month 3 is evidence that the departure calculus is shifting, and that's the foundation for the CFO bridge conversation about retention cost avoidance.",
        },
        proof: {
          window: "Month 12–18",
          desc: "Retention and cost confirmed",
          metrics: ["Voluntary Turnover Rate", "Locum & Agency Utilization"],
          callout:
            "Voluntary departures are a small absolute number annually — a 10-physician practice at 15% turnover produces 1–2 departures per year. Preventing even one additional departure pays back a significant fraction of program cost, but that story requires 12 months of data to tell credibly. The wellbeing data from Month 4 is what makes the conversation defensible before the turnover data arrives.",
        },
      },
      {
        domain: "REVENUE",
        badge: "E/M Accuracy & Denial Prevention",
        northStar: "Revenue Per Visit",
        direction: "↑",
        sub: "Under AMA 2021 E/M guidelines, a Level 4 or Level 5 code requires documentation of High Medical Decision Making — the number and complexity of problems addressed, the data reviewed and analyzed, the risk of complications. That clinical reasoning happens in the conversation: the differential the provider worked through, the records they reviewed, the risk they discussed. Under time pressure, providers code defensively at Level 3 because documenting the MDM elements takes longer than documenting the action. Ambient capture records the MDM as it's happening. The code change isn't upcoding — it's the note finally reflecting the work that was actually done.",
        matterMostIf:
          "Your E/M level distribution is skewed toward lower codes despite high-complexity panels, your first-pass claim acceptance rate is below 95%, or your revenue cycle team is citing documentation gaps as a root cause of write-offs. Providers under time pressure default to lower codes because the note doesn't support the complexity of what was actually managed.",
        alsoNote:
          "For Medicare Advantage panels, accurate chronic condition documentation supports HCC capture — not upcoding, but complete capture. This bridges the revenue and quality stories: better documentation supports both risk adjustment and quality measure attribution.",
        chain: ["Documentation Completeness ↑", "E/M Level Support ↑", "MDM Elements Captured ↑"],
        chainOutput: "Revenue Per Visit ↑",
        tag: "modeled",
        narrative:
          "E/M improvement is recovering revenue already earned but not fully captured — the note wasn't supporting the complexity of what was managed. A separate denial component captures the claim-integrity benefit of documentation that consistently meets payer standards. The distribution shift matters more than the mean.",
        signal: {
          window: "Week 4–8",
          desc: "Note quality and speed improve",
          metrics: ["E/M Level Distribution per Provider", "First-Pass Claim Acceptance Rate"],
          callout:
            "E/M level distribution per provider shows improvement within 4–8 weeks for consistent adopters. Always show the distribution, not just the mean wRVU — a single average can sit flat while Level 3 codes decline and Level 4 codes increase meaningfully. First-pass claim acceptance rate is the complementary signal: cleaner notes mean fewer initial rejections before the revenue shows up in the data.",
        },
        trend: {
          window: "Month 2–5",
          desc: "Coding accuracy confirmed",
          metrics: ["Charge Lag (Days to Bill)", "HCC Capture Rate"],
          callout:
            "Charge lag and HCC capture move at Month 2–5 because coding changes precede payment by 60–90 days in the revenue cycle. For Medicare Advantage panels, the HCC capture story connects revenue improvement and quality improvement in a single documentation change — the same note that supports a Level 4 code also supports chronic condition specificity for risk adjustment. These are not competing narratives; they're the same documentation improvement.",
        },
        proof: {
          window: "Month 4–9",
          desc: "Revenue impact confirmed",
          metrics: ["wRVU Per Encounter", "Documentation-Related Denial Rate"],
          callout:
            "Revenue impact at Month 4–9 is the full chain completing: better notes → correct coding → clean claims → payment received. Denial reduction adds a second payment path — fewer denials at first submission means less revenue held in the appeals cycle. When documentation quality is genuinely better, both paths improve simultaneously: coding lift and denial reduction compound each other.",
        },
      },
      {
        domain: "QUALITY",
        badge: "HEDIS & Preventive Care Attribution",
        northStar: "Care Gap Closure Rate",
        direction: "↑",
        sub: "HEDIS measures care gap closure — whether specific preventive care activities and chronic disease management steps happened and were documented. For medical record review measures, 'happened' means 'is documented with the right specificity.' A provider who counseled on colorectal cancer screening but documented 'discussed preventive care' rather than the specific screening, the recommendation, and the patient's response hasn't given HEDIS enough to close the care gap. Ambient capture preserves the specificity of preventive and chronic care conversations because the provider articulates them to the patient — the note captures what was said, not a compressed summary written afterward.",
        matterMostIf:
          "Your HEDIS composite scores are below benchmark despite high clinical quality, your value-based contracts include quality performance incentives tied to care gap closure, or your Medicare Advantage STARS rating affects CMS bonus payment eligibility. Better HEDIS scores strengthen value-based contract negotiations and can affect network inclusion for high-performing practices.",
        alsoNote:
          "HCC capture and RAF score accuracy for value-based contracts. When chronic condition documentation is complete and specific, risk adjustment reflects the actual patient population — which protects per-member-per-month revenue in capitated arrangements.",
        chain: ["Preventive & Chronic Care Captured ↑", "Quality Measure Attribution ↑", "HEDIS Compliance ↑"],
        chainOutput: "Care Gap Closure Rate ↑",
        tag: "tracked",
        narrative:
          "HEDIS and STARS performance is partly a documentation attribution problem. Specific documentation — naming the screening, documenting the patient response, capturing the clinical plan — is what turns a clinical activity into an attributed care gap closure. Attribution improvements are tracked over time, not modeled in dollars, because quality incentive amounts are health plan- and contract-specific.",
        signal: {
          window: "Week 4–8",
          desc: "Note specificity improves",
          metrics: ["Care Gap Documentation Rate", "Post-Visit Note Specificity"],
          callout:
            "Care gap documentation rate and post-visit note specificity for preventive visits are the earliest-moving quality signals. When notes start containing the specific clinical content required for HEDIS attribution, that's the documentation change — not a modeled estimate, but a direct observation of what's in the record. Population health platforms that track care gap documentation show this within 4–8 weeks.",
        },
        trend: {
          window: "Month 2–5",
          desc: "Measure attribution improves",
          metrics: ["Quality Measure Attribution Rate", "HEDIS Composite Score"],
          callout:
            "Quality measure attribution rate in population health platforms moves at Month 2–5, before formal HEDIS reporting reflects it, because population health tools aggregate documentation in near-real-time while HEDIS reporting is annual. Track the leading indicator — care gap documentation rate in the platform — and use formal HEDIS scores as annual confirmation, not primary evidence.",
        },
        proof: {
          window: "Month 6–18",
          desc: "Quality scores confirmed",
          metrics: ["HEDIS Composite Score vs. Benchmark", "MA STARS Rating"],
          callout:
            "HEDIS composite scores and MA STARS ratings reflect prior-year data and change slowly — the annual measurement creates a structural lag between documentation improvement and score improvement. Establish the internal documentation quality evidence in months 4–8, and treat the annual STARS data as the long-term confirmation of a story that was already visible internally.",
        },
      },
    ],
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 40,
    fontFamily: "Manrope",
    backgroundColor: "#FFFFFF",
    color: "#1A1A1A",
    fontSize: 10,
  },
  wrap: { flex: 1, display: "flex", flexDirection: "column" },

  eyebrow: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#EA2C00",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 5,
  },
  eyebrowGray: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 5,
  },

  h1: { fontSize: 21, fontWeight: 700, color: "#1A1A1A", marginBottom: 7, lineHeight: 1.15 },
  h2: { fontSize: 16, fontWeight: 700, color: "#1A1A1A", marginBottom: 6, lineHeight: 1.15 },

  body: { fontSize: 9.5, color: "#555555", lineHeight: 1.55, marginBottom: 7 },
  small: { fontSize: 8.5, color: "#666666", lineHeight: 1.5 },
  tiny: { fontSize: 8, color: "#999999", lineHeight: 1.45 },

  divider: { borderBottomWidth: 1, borderBottomColor: "#E4DDD4", marginBottom: 12, marginTop: 5 },

  redLeftBorder: {
    borderLeftWidth: 3,
    borderLeftColor: "#EA2C00",
    paddingLeft: 10,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 10,
    backgroundColor: "#FEFAF9",
  },

  row: { flexDirection: "row" },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#E4DDD4",
    marginTop: "auto",
  },
  footerBrand: { fontSize: 8.5, fontWeight: 700, color: "#EA2C00" },
  footerMid: { fontSize: 7.5, color: "#AAAAAA" },
  footerPage: { fontSize: 7.5, color: "#CCCCCC" },
});

// Signal → Trend → Proof: neutral gray progression to brand red
const STAGE_COLORS = {
  signal: { border: "#DDDDDD", bg: "#F8F8F8", label: "#AAAAAA" },
  trend:  { border: "#999999", bg: "#F2F2F2", label: "#555555" },
  proof:  { border: "#EA2C00", bg: "#FEF9F7", label: "#EA2C00" },
};

// ─── Shared Components ────────────────────────────────────────────────────────

function PageFooter({ setting, pageNum, total }: { setting: string; pageNum: number; total: number }) {
  return (
    <View style={S.footer}>
      <Text style={S.footerBrand}>Abridge</Text>
      <Text style={S.footerMid}>Methodology Reference · {setting}</Text>
      <Text style={S.footerPage}>{pageNum} / {total}</Text>
    </View>
  );
}

function DomainPill({ domain }: { domain: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    CAPACITY:  { bg: "#1A1A1A", text: "#FFFFFF" },
    WORKFORCE: { bg: "#4A3728", text: "#FFFFFF" },
    REVENUE:   { bg: "#EA2C00", text: "#FFFFFF" },
    QUALITY:   { bg: "#666666", text: "#FFFFFF" },
  };
  const c = colors[domain] ?? { bg: "#1A1A1A", text: "#FFFFFF" };
  return (
    <View style={{ backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 7, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: 1 }}>
        {domain}
      </Text>
    </View>
  );
}

function TagPill({ tag }: { tag: "modeled" | "tracked" }) {
  const modeled = tag === "modeled";
  return (
    <View style={{ backgroundColor: modeled ? "#1A1A1A" : "#F0EDE8", paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 7, fontWeight: 700, color: modeled ? "#FFFFFF" : "#666666", textTransform: "uppercase", letterSpacing: 1 }}>
        {modeled ? "Modeled" : "Signal"}
      </Text>
    </View>
  );
}

// ─── Page 1: Overview ─────────────────────────────────────────────────────────

function OverviewPage({ sd, pageNum }: { sd: SettingPDFData; pageNum: number }) {
  return (
    <Page size="LETTER" style={S.page} wrap={false}>
      <View style={S.wrap}>
        <Text style={S.eyebrow}>Methodology Overview</Text>
        <Text style={S.h1}>{sd.contextHeadline}</Text>
        <Text style={[S.body, { marginBottom: 12 }]}>{sd.contextBody}</Text>
        <View style={S.divider} />

        <Text style={[S.eyebrowGray, { marginBottom: 8 }]}>Four Domains of Value</Text>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {sd.domains.slice(0, 2).map((d, i) => (
            <View
              key={d.domain}
              style={{ flex: 1, marginRight: i === 0 ? 8 : 0, backgroundColor: "#F5F0EB", padding: 14, borderRadius: 6 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
                <DomainPill domain={d.domain} />
                <Text style={{ fontSize: 7.5, color: "#AAAAAA", marginLeft: 6 }}>{d.badge}</Text>
              </View>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                North Star
              </Text>
              <Text style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.2, marginBottom: 5 }}>
                {d.northStar} <Text style={{ color: "#EA2C00" }}>{d.direction}</Text>
              </Text>
              <Text style={{ fontSize: 8.5, color: "#666666", lineHeight: 1.5 }}>{d.sub.split('.')[0]}.</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          {sd.domains.slice(2, 4).map((d, i) => (
            <View
              key={d.domain}
              style={{ flex: 1, marginRight: i === 0 ? 8 : 0, backgroundColor: "#F5F0EB", padding: 14, borderRadius: 6 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
                <DomainPill domain={d.domain} />
                <Text style={{ fontSize: 7.5, color: "#AAAAAA", marginLeft: 6 }}>{d.badge}</Text>
              </View>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                North Star
              </Text>
              <Text style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.2, marginBottom: 5 }}>
                {d.northStar} <Text style={{ color: "#EA2C00" }}>{d.direction}</Text>
              </Text>
              <Text style={{ fontSize: 8.5, color: "#666666", lineHeight: 1.5 }}>{d.sub.split('.')[0]}.</Text>
            </View>
          ))}
        </View>

        <View style={S.redLeftBorder}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
            Adoption & Attribution
          </Text>
          <Text style={{ fontSize: 8.5, color: "#555555", lineHeight: 1.55 }}>{sd.adoptionCallout}</Text>
        </View>

        <PageFooter setting={sd.label} pageNum={pageNum} total={8} />
      </View>
    </Page>
  );
}

// ─── Pages 2–5: Domain Pages ──────────────────────────────────────────────────

function DomainPage({ d, sd, pageNum }: { d: DomainEntry; sd: SettingPDFData; pageNum: number }) {
  const domainIdx = sd.domains.indexOf(d) + 1;
  const stages = [
    { key: "signal", label: "Signal",  c: STAGE_COLORS.signal, stage: d.signal },
    { key: "trend",  label: "Trend",   c: STAGE_COLORS.trend,  stage: d.trend  },
    { key: "proof",  label: "Proof",   c: STAGE_COLORS.proof,  stage: d.proof  },
  ];

  return (
    <Page size="LETTER" style={S.page} wrap={false}>
      <View style={S.wrap}>
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <DomainPill domain={d.domain} />
          <Text style={{ fontSize: 8, color: "#AAAAAA", marginLeft: 8 }}>Domain {domainIdx} of 4 · {d.badge}</Text>
        </View>

        {/* North Star */}
        <View style={{ marginBottom: 9 }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            North Star Metric
          </Text>
          <Text style={{ fontSize: 23, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.1, marginBottom: 6 }}>
            {d.northStar} <Text style={{ color: "#EA2C00" }}>{d.direction}</Text>
          </Text>
          <Text style={{ fontSize: 9.5, color: "#444444", lineHeight: 1.6 }}>{d.sub}</Text>
        </View>

        {/* Matters most if */}
        <View style={{ backgroundColor: "#F5F0EB", padding: 10, borderRadius: 5, marginBottom: 10 }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#9A8F84", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
            Matters most if…
          </Text>
          <Text style={{ fontSize: 8.5, color: "#555555", lineHeight: 1.55 }}>{d.matterMostIf}</Text>
        </View>

        <View style={S.divider} />

        {/* Causal chain */}
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 2, marginBottom: 7 }}>
          How Abridge Gets There
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
          <View style={{ backgroundColor: "#EA2C00", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, marginRight: 5, marginBottom: 4 }}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#FFFFFF" }}>Abridge Ambient</Text>
          </View>
          {d.chain.map((step, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ fontSize: 9, color: "#C4BBAD", marginRight: 5 }}>→</Text>
              <View style={{ backgroundColor: "#F5F0EB", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, marginRight: 5 }}>
                <Text style={{ fontSize: 7.5, color: "#444444" }}>{step}</Text>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ fontSize: 9, color: "#C4BBAD", marginRight: 5 }}>→</Text>
            <View style={{ borderWidth: 1.5, borderColor: "#EA2C00", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00" }}>{d.chainOutput}</Text>
            </View>
          </View>
        </View>

        {d.alsoNote && (
          <Text style={{ fontSize: 8, color: "#AAAAAA", lineHeight: 1.5, marginBottom: 5, fontStyle: "italic" }}>
            Also note: {d.alsoNote}
          </Text>
        )}

        <View style={S.divider} />

        {/* Signal / Trend / Proof */}
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
          What to Track and When
        </Text>
        <View style={{ flexDirection: "row" }}>
          {stages.map((s, i) => (
            <View
              key={s.key}
              style={{
                flex: 1,
                marginRight: i < 2 ? 7 : 0,
                backgroundColor: s.c.bg,
                borderRadius: 5,
                padding: 10,
                borderTopWidth: 2.5,
                borderTopColor: s.c.border,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: 700, color: s.c.label, textTransform: "uppercase", letterSpacing: 1, marginBottom: 1 }}>
                {s.label}
              </Text>
              <Text style={{ fontSize: 8.5, fontWeight: 700, color: "#333333", marginBottom: 1 }}>{s.stage.window}</Text>
              <Text style={{ fontSize: 7.5, color: "#777777", marginBottom: 8, lineHeight: 1.4 }}>{s.stage.desc}</Text>
              {s.stage.metrics.map((m, mi) => (
                <View key={mi} style={{ flexDirection: "row", marginBottom: 5 }}>
                  <Text style={{ fontSize: 8, color: s.c.border, marginRight: 4, marginTop: 1.5 }}>·</Text>
                  <Text style={{ fontSize: 8, color: "#3A3028", lineHeight: 1.45, flex: 1 }}>{m}</Text>
                </View>
              ))}
              {s.stage.callout ? (
                <View style={{ borderTopWidth: 1, borderTopColor: s.c.border, marginTop: 6, paddingTop: 6 }}>
                  <Text style={{ fontSize: 7.5, color: "#666666", lineHeight: 1.5, fontStyle: "italic" }}>
                    {s.stage.callout}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <PageFooter setting={sd.label} pageNum={pageNum} total={8} />
      </View>
    </Page>
  );
}

// ─── Page 6: Value Architecture ───────────────────────────────────────────────

function ValueArchitecturePage({ sd, pageNum }: { sd: SettingPDFData; pageNum: number }) {
  return (
    <Page size="LETTER" style={S.page} wrap={false}>
      <View style={S.wrap}>
        <Text style={S.eyebrow}>The Value Architecture</Text>
        <Text style={S.h1}>How Abridge Creates Value</Text>
        <Text style={[S.body, { marginBottom: 10 }]}>
          Four domains. Each shows the causal chain — how Abridge documentation improvement connects to the financial or operational outcome. Modeled domains are quantified in the ROI Calculator. Signal domains are tracked over time as program performance evidence.
        </Text>
        <View style={S.divider} />

        {sd.domains.map((d, i) => (
          <View key={d.domain} style={{ marginBottom: i < sd.domains.length - 1 ? 13 : 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
              <DomainPill domain={d.domain} />
              <View style={{ marginLeft: 7 }}><TagPill tag={d.tag} /></View>
              <Text style={{ fontSize: 8, color: "#AAAAAA", marginLeft: 7 }}>{d.badge}</Text>
            </View>
            <Text style={{ fontSize: 9, color: "#444444", lineHeight: 1.55, marginBottom: 6 }}>{d.narrative}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
              <View style={{ backgroundColor: "#EA2C00", paddingVertical: 3, paddingHorizontal: 7, borderRadius: 3, marginRight: 5, marginBottom: 3 }}>
                <Text style={{ fontSize: 7, fontWeight: 700, color: "#FFFFFF" }}>Abridge</Text>
              </View>
              {d.chain.map((step, si) => (
                <View key={si} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                  <Text style={{ fontSize: 8.5, color: "#C4BBAD", marginRight: 4 }}>→</Text>
                  <View style={{ backgroundColor: "#F5F0EB", paddingVertical: 3, paddingHorizontal: 7, borderRadius: 3, marginRight: 5 }}>
                    <Text style={{ fontSize: 7, color: "#555555" }}>{step}</Text>
                  </View>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <Text style={{ fontSize: 8.5, color: "#C4BBAD", marginRight: 4 }}>→</Text>
                <View style={{ borderWidth: 1, borderColor: "#EA2C00", paddingVertical: 3, paddingHorizontal: 7, borderRadius: 3 }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: "#EA2C00" }}>{d.chainOutput}</Text>
                </View>
              </View>
            </View>
            {i < sd.domains.length - 1 && (
              <View style={{ borderBottomWidth: 1, borderBottomColor: "#EDEBE6", marginTop: 11 }} />
            )}
          </View>
        ))}

        <PageFooter setting={sd.label} pageNum={pageNum} total={8} />
      </View>
    </Page>
  );
}

// ─── Page 7: Honest Limits ────────────────────────────────────────────────────

function HonestLimitsPage({ sd, pageNum }: { sd: SettingPDFData; pageNum: number }) {
  const cols = [
    {
      title: "What Abridge Measures Directly",
      c: STAGE_COLORS.signal,
      items: [
        "Documentation time per encounter (EHR audit logs)",
        "Note completion rate — same-shift or same-day",
        "After-hours / post-shift EHR session time",
        "Charge lag from date of service to billing submission",
      ],
    },
    {
      title: "What Abridge Influences",
      c: STAGE_COLORS.trend,
      items: [
        "Throughput and patient flow (requires volume & scheduling alignment)",
        "Physician and nurse retention (requires consistent adoption and time)",
        "Coding accuracy and E/M or DRG level distribution",
        "Quality measure attribution (requires quality team coordination)",
      ],
    },
    {
      title: "What Your Organization Brings",
      c: STAGE_COLORS.proof,
      items: [
        "Annual visit, encounter, or discharge volumes",
        "Baseline rates: LWBS, turnover, denial rate, CMI",
        "Financial benchmarks: replacement cost, base rate, denial value",
        "Internal data access: EHR logs, HR data, revenue cycle, payroll",
      ],
    },
  ];

  return (
    <Page size="LETTER" style={S.page} wrap={false}>
      <View style={S.wrap}>
        <Text style={S.eyebrow}>Honest Limits</Text>
        <Text style={S.h1}>What This Framework Does and Doesn't Claim</Text>
        <Text style={[S.body, { marginBottom: 12 }]}>
          Abridge improves documentation quality. Documentation quality influences — but doesn't fully determine — the operational and financial outcomes in this framework. The distinctions below matter when building the business case for your organization, and they're the same distinctions your CFO and CMO will apply when they evaluate the evidence.
        </Text>
        <View style={S.divider} />

        <View style={{ flexDirection: "row", marginBottom: 14 }}>
          {cols.map((col, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                marginRight: i < 2 ? 8 : 0,
                backgroundColor: col.c.bg,
                borderRadius: 5,
                padding: 12,
                borderTopWidth: 2.5,
                borderTopColor: col.c.border,
              }}
            >
              <Text style={{ fontSize: 8.5, fontWeight: 700, color: col.c.label, marginBottom: 9, lineHeight: 1.35 }}>
                {col.title}
              </Text>
              {col.items.map((item, ii) => (
                <View key={ii} style={{ flexDirection: "row", marginBottom: 7 }}>
                  <Text style={{ fontSize: 8, color: col.c.border, marginRight: 5, marginTop: 1.5 }}>·</Text>
                  <Text style={{ fontSize: 8.5, color: "#444444", lineHeight: 1.5, flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={[S.redLeftBorder, { marginBottom: 12 }]}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
            Adoption is the variable
          </Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6 }}>
            Every outcome in this framework assumes consistent, sustained Abridge use by the provider cohort being measured. Providers who use Abridge occasionally will show occasional results. The measurement approach on each domain page is designed to isolate Abridge adopters — so adoption rate and outcome size are visible together, not conflated. Partial adoption is visible, not hidden.
          </Text>
        </View>

        <View style={{ backgroundColor: "#1A1A1A", padding: 16, borderRadius: 6 }}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
            What Comes Next
          </Text>
          <Text style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF", marginBottom: 7, lineHeight: 1.25 }}>
            The ROI Calculator takes this methodology and shows you the number.
          </Text>
          <Text style={{ fontSize: 9, color: "#AAAAAA", lineHeight: 1.6 }}>
            Enter your volumes, baselines, and organization-specific inputs. The calculator applies the same causal logic from this document — the formulas are transparent, the assumptions are yours to adjust, and the output is a defensible estimate built on your data, not ours. This document is the 'why.' The calculator is the 'how much.'
          </Text>
        </View>

        <PageFooter setting={sd.label} pageNum={pageNum} total={8} />
      </View>
    </Page>
  );
}

// ─── Document Assembly ────────────────────────────────────────────────────────

function MethodologyPDFDocument({ setting }: { setting: MethodologyCareSetting }) {
  const sd = settingData[setting];
  return (
    <Document>
      <PDFCoverPage
        reportLabel="Methodology Reference"
        title={`${sd.label} Value Framework`}
        subtitle={sd.coverSubtitle}
        showPreparedBy={false}
      />
      <OverviewPage sd={sd} pageNum={2} />
      {sd.domains.map((d, i) => (
        <DomainPage key={d.domain} d={d} sd={sd} pageNum={i + 3} />
      ))}
      <ValueArchitecturePage sd={sd} pageNum={7} />
      <HonestLimitsPage sd={sd} pageNum={8} />
    </Document>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateMethodologyPDF(setting: MethodologyCareSetting): Promise<void> {
  const blob = await pdf(<MethodologyPDFDocument setting={setting} />).toBlob();
  const sd = settingData[setting];
  await savePdfBlob(blob, `abridge-methodology-${sd.label.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
