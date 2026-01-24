import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DriverDetail {
  id: string;
  name: string;
  value: number;
  category: 'labor' | 'revenue';
  theory: string;
  keyVariables?: { label: string; value: string }[];
  formula?: string;
  steps?: { label: string; calculation: string; result: string }[];
}

export interface PremiumPDFData {
  setting: string;
  unitName: string;
  unitNamePlural: string;
  providers: number;
  encounters: number;
  utilization: number;
  totalValue: number;
  investment: number;
  netGain: number;
  roi: number;
  costPerProvider: number;
  hoursReturned: number;
  additionalVisits: number;
  timeSaved: number;
  laborDrivers: { name: string; value: number; description: string }[];
  revenueDrivers: { name: string; value: number; description: string }[];
  laborTotal: number;
  revenueTotal: number;
  laborPct: number;
  revenuePct: number;
  year1: number;
  year2: number;
  year3: number;
  threeYearValue: number;
  threeYearCost: number;
  threeYearNet: number;
  fullScaleProviders: number;
  fullScaleUtil: number;
  fullScaleValue: number;
  fullScaleROI: number;
  networkEffect: number;
  qualitativeDrivers?: string[];
  driverDetails?: DriverDetail[];
}

// Premium color palette
const COLORS = {
  coral: [232, 90, 79] as [number, number, number],
  coralLight: [254, 242, 242] as [number, number, number],
  coralDark: [220, 38, 38] as [number, number, number],
  green: [5, 150, 105] as [number, number, number],
  greenLight: [236, 253, 245] as [number, number, number],
  greenDark: [4, 120, 87] as [number, number, number],
  black: [17, 24, 39] as [number, number, number],
  darkGray: [55, 65, 81] as [number, number, number],
  mediumGray: [107, 114, 128] as [number, number, number],
  lightGray: [156, 163, 175] as [number, number, number],
  backgroundGray: [249, 250, 251] as [number, number, number],
  cream: [250, 250, 249] as [number, number, number],
  borderGray: [229, 231, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  blueLight: [239, 246, 255] as [number, number, number],
};

const formatNumber = (num: number): string => {
  if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (Math.abs(num) >= 1000) return Math.round(num / 1000).toLocaleString() + 'K';
  return Math.round(num).toLocaleString();
};

const formatCurrency = (num: number): string => {
  const prefix = num >= 0 ? '+$' : '-$';
  return prefix + formatNumber(Math.abs(num));
};

const formatCurrencyPlain = (num: number): string => {
  return '$' + formatNumber(Math.abs(num));
};

const formatCurrencyFull = (num: number): string => {
  return '$' + Math.round(num).toLocaleString();
};

export async function generatePremiumPDF(data: PremiumPDFData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let currentPage = 1;
  
  const allDrivers = [...data.laborDrivers, ...data.revenueDrivers];
  const totalPages = 6 + allDrivers.length;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const eligibleEncounters = Math.round(data.encounters * data.utilization / 100);
  const paybackMonths = data.investment > 0 ? Math.ceil(12 * data.investment / data.totalValue) : 0;

  // Helper functions
  const drawHeader = () => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.coral);
    doc.text('ABRIDGE', margin, 15);
    
    doc.setTextColor(...COLORS.mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text('ROI Analysis', pageWidth - margin, 15, { align: 'right' });
    
    doc.setDrawColor(...COLORS.borderGray);
    doc.setLineWidth(0.5);
    doc.line(margin, 20, pageWidth - margin, 20);
  };

  const drawFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.lightGray);
    doc.text('This analysis provides estimates for planning purposes based on conservative assumptions.', margin, pageHeight - 12);
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  };

  const drawSectionTitle = (title: string, y: number): number => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(title.toUpperCase(), margin, y);
    return y + 10;
  };

  const drawCard = (x: number, y: number, w: number, h: number, bgColor: [number, number, number] = COLORS.white, borderColor?: [number, number, number]) => {
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    if (borderColor) {
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 2, 2, 'S');
    }
  };

  const newPage = () => {
    doc.addPage();
    currentPage++;
    drawHeader();
    drawFooter();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1: COVER / EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  
  let yPos = 25;
  
  // Logo and title area with border
  drawCard(margin, yPos, contentWidth, 55, COLORS.white, COLORS.borderGray);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.coral);
  doc.text('ABRIDGE', pageWidth / 2, yPos + 15, { align: 'center' });
  
  doc.setDrawColor(...COLORS.borderGray);
  doc.setLineWidth(0.3);
  doc.line(margin + 40, yPos + 22, pageWidth - margin - 40, yPos + 22);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('ROI ANALYSIS', pageWidth / 2, yPos + 32, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text(`${data.setting} Ambient Documentation`, pageWidth / 2, yPos + 40, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(today, pageWidth / 2, yPos + 50, { align: 'center' });
  
  yPos += 65;
  
  // Divider
  doc.setDrawColor(...COLORS.coral);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 10;
  
  // YOUR PROJECTED RETURN section title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('YOUR PROJECTED RETURN', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  
  // Hero Net Value card
  drawCard(margin, yPos, contentWidth, 45, COLORS.greenLight);
  
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrency(data.netGain), pageWidth / 2, yPos + 22, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Net Annual Value', pageWidth / 2, yPos + 32, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(`${formatCurrencyPlain(data.totalValue)} total value  -  ${formatCurrencyPlain(data.investment)} investment`, pageWidth / 2, yPos + 40, { align: 'center' });
  
  yPos += 55;
  
  // Three supporting metrics
  const metricWidth = (contentWidth - 10) / 3;
  const metrics = [
    { value: data.roi.toFixed(1) + 'x', label: 'Return on', sublabel: 'Investment' },
    { value: paybackMonths + ' mo', label: 'Payback', sublabel: 'Period' },
    { value: formatCurrencyPlain(data.threeYearNet), label: '3-Year Net', sublabel: 'Value' },
  ];
  
  metrics.forEach((metric, i) => {
    const x = margin + i * (metricWidth + 5);
    drawCard(x, yPos, metricWidth, 40, COLORS.white, COLORS.borderGray);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(metric.value, x + metricWidth / 2, yPos + 16, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(metric.label, x + metricWidth / 2, yPos + 28, { align: 'center' });
    doc.text(metric.sublabel, x + metricWidth / 2, yPos + 35, { align: 'center' });
  });
  
  yPos += 50;
  
  // Divider
  doc.setDrawColor(...COLORS.coral);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 10;
  
  // YOUR CONFIGURATION
  yPos = drawSectionTitle('YOUR CONFIGURATION', yPos);
  
  const configWidth = (contentWidth - 15) / 4;
  const configs = [
    { value: data.providers.toString(), label: `${data.unitNamePlural}`, sublabel: 'in scope' },
    { value: formatNumber(data.encounters), label: 'Encounters', sublabel: 'per year' },
    { value: data.utilization + '%', label: 'Utilization', sublabel: 'expected' },
    { value: allDrivers.length.toString(), label: 'Drivers', sublabel: 'selected' },
  ];
  
  configs.forEach((config, i) => {
    const x = margin + i * (configWidth + 5);
    drawCard(x, yPos, configWidth, 35, COLORS.backgroundGray);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(config.value, x + configWidth / 2, yPos + 14, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(config.label, x + configWidth / 2, yPos + 24, { align: 'center' });
    doc.text(config.sublabel, x + configWidth / 2, yPos + 30, { align: 'center' });
  });
  
  yPos += 45;
  
  // SELECTED VALUE DRIVERS
  yPos = drawSectionTitle('SELECTED VALUE DRIVERS', yPos);
  
  drawCard(margin, yPos, contentWidth, 8 + allDrivers.length * 14, COLORS.white, COLORS.borderGray);
  
  let driverY = yPos + 8;
  const maxDriverValue = Math.max(...allDrivers.map(d => d.value));
  
  allDrivers.forEach((driver) => {
    const pct = Math.round((driver.value / data.totalValue) * 100);
    const barWidth = 60;
    const filledWidth = (driver.value / maxDriverValue) * barWidth;
    
    // Dot
    const isLabor = data.laborDrivers.some(d => d.name === driver.name);
    doc.setFillColor(...(isLabor ? COLORS.blue : COLORS.green));
    doc.circle(margin + 8, driverY, 2, 'F');
    
    // Driver name
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.black);
    doc.text(driver.name, margin + 15, driverY + 1);
    
    // Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(driver.value), margin + 90, driverY + 1);
    
    // Progress bar
    const barX = margin + 115;
    doc.setFillColor(...COLORS.backgroundGray);
    doc.roundedRect(barX, driverY - 3, barWidth, 6, 1, 1, 'F');
    doc.setFillColor(...(isLabor ? COLORS.blue : COLORS.green));
    doc.roundedRect(barX, driverY - 3, filledWidth, 6, 1, 1, 'F');
    
    // Percentage
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(pct + '%', barX + barWidth + 5, driverY + 1);
    
    driverY += 14;
  });
  
  yPos = driverY + 5;
  
  // Footer disclaimer
  doc.setDrawColor(...COLORS.borderGray);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 6;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.lightGray);
  doc.text('This analysis provides estimates for planning purposes based on your inputs and conservative assumptions. See methodology for details.', margin, yPos);
  
  // Page number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('Page 1', pageWidth - margin, pageHeight - 12, { align: 'right' });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2: UNDERSTANDING HOW AMBIENT AI CREATES VALUE
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('UNDERSTANDING HOW AMBIENT AI CREATES VALUE', yPos);
  
  // Intro card
  drawCard(margin, yPos, contentWidth, 48, COLORS.cream, COLORS.borderGray);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  
  const introText = [
    "Ambient AI doesn't generate revenue or cut costs directly. It does two things:",
    "",
    "1. Returns time to clinicians (by handling documentation)",
    "2. Captures clinical information (that would otherwise be lost)",
    "",
    "That time and information convert to measurable value through specific",
    "pathways - depending on what matters most to your organization.",
  ];
  
  introText.forEach((line, i) => {
    doc.text(line, margin + 8, yPos + 10 + i * 6);
  });
  
  yPos += 58;
  
  // THE TWO VALUE CATEGORIES
  yPos = drawSectionTitle('THE TWO VALUE CATEGORIES', yPos);
  
  const catWidth = (contentWidth - 5) / 2;
  
  // Capacity & Labor column
  drawCard(margin, yPos, catWidth, 90, COLORS.blueLight, COLORS.blue);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.blue);
  doc.text('CAPACITY & LABOR', margin + 8, yPos + 12);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Time -> Efficiency', margin + 8, yPos + 20);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  const laborDesc = [
    "When clinicians spend less time on",
    "documentation, that time can convert to:",
    "",
    "  - More patient visits",
    "  - Reduced overtime",
    "  - Lower turnover",
    "  - Better work-life balance",
  ];
  laborDesc.forEach((line, i) => {
    doc.text(line, margin + 8, yPos + 30 + i * 5);
  });
  
  // Show labor drivers selection
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.blue);
  doc.text('YOUR SELECTION', margin + 8, yPos + 68);
  doc.setDrawColor(...COLORS.blue);
  doc.line(margin + 8, yPos + 70, margin + 50, yPos + 70);
  
  let laborSelY = yPos + 76;
  data.laborDrivers.forEach((d) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.green);
    doc.text('*', margin + 8, laborSelY);
    doc.setTextColor(...COLORS.black);
    doc.text(d.name, margin + 14, laborSelY);
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(d.value), margin + catWidth - 25, laborSelY);
    laborSelY += 6;
  });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.blue);
  doc.text('SUBTOTAL: ' + formatCurrencyPlain(data.laborTotal), margin + 8, yPos + 86);
  
  // Revenue & Quality column
  const revX = margin + catWidth + 5;
  drawCard(revX, yPos, catWidth, 90, COLORS.greenLight, COLORS.green);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('REVENUE & QUALITY', revX + 8, yPos + 12);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Information -> Accuracy', revX + 8, yPos + 20);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  const revDesc = [
    "When documentation captures the full",
    "clinical picture, organizations see:",
    "",
    "  - Better coding accuracy",
    "  - Improved HCC capture",
    "  - Fewer denials",
    "  - Complete documentation",
  ];
  revDesc.forEach((line, i) => {
    doc.text(line, revX + 8, yPos + 30 + i * 5);
  });
  
  // Show revenue drivers selection
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('YOUR SELECTION', revX + 8, yPos + 68);
  doc.setDrawColor(...COLORS.green);
  doc.line(revX + 8, yPos + 70, revX + 50, yPos + 70);
  
  let revSelY = yPos + 76;
  data.revenueDrivers.forEach((d) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.green);
    doc.text('*', revX + 8, revSelY);
    doc.setTextColor(...COLORS.black);
    doc.text(d.name, revX + 14, revSelY);
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(d.value), revX + catWidth - 25, revSelY);
    revSelY += 6;
  });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('SUBTOTAL: ' + formatCurrencyPlain(data.revenueTotal), revX + 8, yPos + 86);
  
  yPos += 100;
  
  // WHY WE USE CONSERVATIVE ASSUMPTIONS
  yPos = drawSectionTitle('WHY WE USE CONSERVATIVE ASSUMPTIONS', yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text("Every calculation in this analysis applies multiple conservative factors. We'd rather underestimate and overdeliver.", margin, yPos);
  
  yPos += 10;
  
  const factorsData = [
    ['Factor', 'Rate', 'What it means'],
    ['Time-to-access conversion', '25%', 'Only 1/4 of saved time goes to seeing patients'],
    ['Visit conversion', '60%', 'Scheduling/capacity limits actual conversion'],
    ['Burnout attribution', '30%', 'We only claim partial credit for retention'],
    ['HCC audit factor', '25%', 'Accounts for RADV and payer adjustments'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [factorsData[0]],
    body: factorsData.slice(1),
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: COLORS.darkGray,
    },
    headStyles: {
      fillColor: COLORS.backgroundGray,
      textColor: COLORS.darkGray,
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 80 },
    },
    margin: { left: margin, right: margin },
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3: YOUR SELECTED VALUE DRIVERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('YOUR SELECTED VALUE DRIVERS', yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text(`Based on your strategic priorities, you've selected ${allDrivers.length} value pathways. Here's what drives each one.`, margin, yPos);
  
  yPos += 12;
  
  // Get driver-specific content
  const getDriverContent = (driverName: string, value: number, index: number): { theory: string[]; variables: { label: string; value: string }[]; logic: string } => {
    const appendixLetter = String.fromCharCode(65 + index);
    
    switch (driverName) {
      case 'Clinician Retention':
        return {
          theory: [
            "Documentation burden is the #1 driver of physician burnout.",
            "Reducing this burden improves satisfaction and retention.",
            "Replacing a physician costs $400K-$800K+.",
          ],
          variables: [
            { label: `${data.providers} ${data.unitNamePlural.toLowerCase()}`, value: 'in scope' },
            { label: '6% turnover', value: 'rate' },
            { label: '$400K', value: 'replacement cost' },
          ],
          logic: `${data.providers} ${data.unitNamePlural.toLowerCase()} x 6% = ${(data.providers * 0.06).toFixed(1)} departures/yr x 45% burnout-related x 30% Abridge attribution = ${(data.providers * 0.06 * 0.45 * 0.30).toFixed(2)} avoided/yr x $400K = ${formatCurrencyPlain(value)}     Full calculation -> Appendix ${appendixLetter}`,
        };
      case 'Patient Access':
        return {
          theory: [
            "When clinicians spend less time on documentation, they have",
            "capacity to see additional patients. Not all time converts -",
            "but even a modest portion creates meaningful revenue.",
          ],
          variables: [
            { label: formatNumber(eligibleEncounters), value: 'encounters eligible' },
            { label: '2 min saved', value: 'per encounter' },
            { label: '$200/visit', value: 'avg revenue' },
          ],
          logic: `${formatNumber(eligibleEncounters)} enc x 2 min = ${formatNumber(Math.round(eligibleEncounters * 2 / 60))} hrs saved x 25% to access x 60% conversion / 30 min = additional visits x $200 = ${formatCurrencyPlain(value)}     Full calculation -> Appendix ${appendixLetter}`,
        };
      case 'Accurate Level of Service':
        return {
          theory: [
            "Physicians under time pressure document less than the full",
            "clinical picture. AI captures complexity that supports accurate",
            "coding - not upcoding, just getting credit for work done.",
          ],
          variables: [
            { label: formatNumber(eligibleEncounters), value: 'encounters eligible' },
            { label: '1.5 wRVU/enc', value: 'baseline' },
            { label: '5% improvement', value: 'expected' },
          ],
          logic: `${formatNumber(eligibleEncounters)} enc x 1.5 wRVU x 5% improvement = ${formatNumber(Math.round(eligibleEncounters * 1.5 * 0.05))} additional wRVU x $33 = ${formatCurrencyPlain(value)}     Full calculation -> Appendix ${appendixLetter}`,
        };
      case 'HCC & Chronic Condition Capture':
        return {
          theory: [
            "Accurate documentation of chronic conditions ensures proper",
            "risk adjustment, improving reimbursement accuracy for",
            "value-based care arrangements.",
          ],
          variables: [
            { label: formatNumber(eligibleEncounters), value: 'encounters eligible' },
            { label: '$800', value: 'avg HCC value' },
            { label: '25%', value: 'audit factor' },
          ],
          logic: `Estimated HCC captures x $800 value x 25% audit factor = ${formatCurrencyPlain(value)}     Full calculation -> Appendix ${appendixLetter}`,
        };
      case 'Overtime & Locum Savings':
        return {
          theory: [
            "Reducing documentation time decreases the need for overtime",
            "and expensive locum coverage, translating directly to",
            "labor cost savings.",
          ],
          variables: [
            { label: formatNumber(data.hoursReturned), value: 'hours returned' },
            { label: '$150/hr', value: 'overtime rate' },
            { label: '20%', value: 'conversion' },
          ],
          logic: `${formatNumber(data.hoursReturned)} hours x $150/hr x 20% overtime conversion = ${formatCurrencyPlain(value)}     Full calculation -> Appendix ${appendixLetter}`,
        };
      default:
        return {
          theory: [
            "This driver creates value through improved efficiency",
            "and reduced administrative burden from AI-assisted",
            "documentation workflows.",
          ],
          variables: [
            { label: formatNumber(eligibleEncounters), value: 'encounters' },
            { label: 'Conservative', value: 'factors applied' },
            { label: 'Industry', value: 'benchmarks used' },
          ],
          logic: `Value calculated using conservative industry benchmarks = ${formatCurrencyPlain(value)}     Full calculation -> Appendix ${appendixLetter}`,
        };
    }
  };
  
  allDrivers.forEach((driver, idx) => {
    const content = getDriverContent(driver.name, driver.value, idx);
    const isLabor = data.laborDrivers.some(d => d.name === driver.name);
    const cardHeight = 65;
    
    // Check if we need a new page
    if (yPos + cardHeight > pageHeight - 25) {
      newPage();
      yPos = 30;
    }
    
    drawCard(margin, yPos, contentWidth, cardHeight, COLORS.white, COLORS.borderGray);
    
    // Icon indicator
    doc.setFillColor(...(isLabor ? COLORS.blue : COLORS.green));
    doc.circle(margin + 8, yPos + 10, 3, 'F');
    
    // Driver name and value
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(driver.name.toUpperCase(), margin + 16, yPos + 12);
    
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(driver.value), pageWidth - margin - 8, yPos + 12, { align: 'right' });
    
    // Divider
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(margin + 8, yPos + 16, pageWidth - margin - 8, yPos + 16);
    
    // The Theory
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text('The Theory', margin + 8, yPos + 24);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    content.theory.forEach((line, i) => {
      doc.text(line, margin + 8, yPos + 30 + i * 4);
    });
    
    // Key Variables
    const varY = yPos + 44;
    const varWidth = (contentWidth - 30) / 3;
    
    content.variables.forEach((v, i) => {
      const vx = margin + 8 + i * (varWidth + 5);
      drawCard(vx, varY, varWidth, 12, COLORS.backgroundGray);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(v.label, vx + varWidth / 2, varY + 5, { align: 'center' });
      
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.mediumGray);
      doc.text(v.value, vx + varWidth / 2, varY + 10, { align: 'center' });
    });
    
    // The Logic
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.mediumGray);
    const logicLines = doc.splitTextToSize(content.logic, contentWidth - 16);
    doc.text(logicLines[0], margin + 8, yPos + 62);
    
    yPos += cardHeight + 5;
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4: THE SCALING OPPORTUNITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('THE SCALING OPPORTUNITY', yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text(`This analysis models a pilot of ${data.providers} ${data.unitNamePlural.toLowerCase()}. Here's what scaling across your organization could look like.`, margin, yPos);
  
  yPos += 15;
  
  // Pilot vs Full Scale comparison
  const compWidth = (contentWidth - 10) / 2;
  
  // Pilot card
  drawCard(margin, yPos, compWidth, 70, COLORS.white, COLORS.borderGray);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('PILOT (TODAY)', margin + compWidth / 2, yPos + 12, { align: 'center' });
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(data.providers.toString(), margin + compWidth / 2, yPos + 32, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(data.unitNamePlural.toLowerCase(), margin + compWidth / 2, yPos + 40, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text(formatNumber(data.encounters) + ' encounters', margin + compWidth / 2, yPos + 50, { align: 'center' });
  doc.text(data.utilization + '% utilization', margin + compWidth / 2, yPos + 56, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrencyPlain(data.totalValue), margin + compWidth / 2, yPos + 66, { align: 'center' });
  
  // Full Scale card
  const fsX = margin + compWidth + 10;
  drawCard(fsX, yPos, compWidth, 70, COLORS.greenLight, COLORS.green);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('FULL SCALE', fsX + compWidth / 2, yPos + 12, { align: 'center' });
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(data.fullScaleProviders.toString(), fsX + compWidth / 2, yPos + 32, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(data.unitNamePlural.toLowerCase(), fsX + compWidth / 2, yPos + 40, { align: 'center' });
  
  const fsEncounters = Math.round(data.encounters * (data.fullScaleProviders / data.providers));
  doc.setFontSize(8);
  doc.text(formatNumber(fsEncounters) + ' encounters', fsX + compWidth / 2, yPos + 50, { align: 'center' });
  doc.text(data.fullScaleUtil + '% utilization', fsX + compWidth / 2, yPos + 56, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrencyPlain(data.fullScaleValue), fsX + compWidth / 2, yPos + 66, { align: 'center' });
  
  yPos += 85;
  
  // YOUR JOURNEY TO FULL SCALE (simplified text representation)
  yPos = drawSectionTitle('YOUR JOURNEY TO FULL SCALE', yPos);
  
  drawCard(margin, yPos, contentWidth, 50, COLORS.backgroundGray, COLORS.borderGray);
  
  // Journey timeline
  const timelineY = yPos + 25;
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, timelineY, pageWidth - margin - 20, timelineY);
  
  const milestones = [
    { label: 'Today', value: data.providers, amount: data.totalValue },
    { label: '12 mo', value: Math.round(data.providers * 1.5), amount: data.totalValue * 1.5 },
    { label: '24 mo', value: Math.round(data.providers * 2), amount: data.totalValue * 2.2 },
    { label: 'Full Scale', value: data.fullScaleProviders, amount: data.fullScaleValue },
  ];
  
  const timelineWidth = contentWidth - 40;
  milestones.forEach((m, i) => {
    const x = margin + 20 + (i / (milestones.length - 1)) * timelineWidth;
    
    doc.setFillColor(...COLORS.green);
    doc.circle(x, timelineY, 3, 'F');
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(m.label, x, timelineY - 8, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(m.value + ' ' + data.unitNamePlural.toLowerCase(), x, timelineY + 10, { align: 'center' });
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(m.amount), x, timelineY + 18, { align: 'center' });
  });
  
  yPos += 60;
  
  // WHY VALUE COMPOUNDS
  yPos = drawSectionTitle('WHY VALUE COMPOUNDS (NOT JUST SCALES)', yPos);
  
  const compoundReasons = [
    { title: 'Utilization improves', desc: `${data.utilization}% -> ${data.fullScaleUtil}% as adoption matures and habits form` },
    { title: 'Retention benefits materialize', desc: 'Full impact emerges after 6-12 months' },
    { title: 'Efficiency compounds', desc: 'Shared learnings, optimized workflows, organizational muscle' },
  ];
  
  drawCard(margin, yPos, contentWidth, 45, COLORS.white, COLORS.borderGray);
  
  let reasonY = yPos + 10;
  compoundReasons.forEach((r) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('> ' + r.title, margin + 8, reasonY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(r.desc, margin + 15, reasonY + 6);
    
    reasonY += 14;
  });
  
  yPos += 55;
  
  // Compounding bonus
  const compoundBonus = data.fullScaleValue - (data.totalValue * (data.fullScaleProviders / data.providers));
  if (compoundBonus > 0) {
    drawCard(margin, yPos, contentWidth, 30, COLORS.greenLight, COLORS.green);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.green);
    doc.text('COMPOUNDING BONUS', pageWidth / 2, yPos + 10, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text(formatCurrency(compoundBonus), pageWidth / 2, yPos + 22, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('over 24 months beyond linear projection', pageWidth / 2, yPos + 28, { align: 'center' });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5: YOUR INVESTMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('YOUR INVESTMENT', yPos);
  
  // Two-column layout: Configuration + Multi-Year Projection
  const colWidth = (contentWidth - 10) / 2;
  
  // Configuration column
  drawCard(margin, yPos, colWidth, 85, COLORS.white, COLORS.borderGray);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('YOUR CONFIGURATION', margin + 8, yPos + 12);
  
  const configItems = [
    ['Setting', data.setting],
    [data.unitNamePlural, data.providers.toString()],
    ['Price', formatCurrencyPlain(data.costPerProvider) + '/mo'],
    ['Term', '2 years'],
    ['', ''],
    ['Annual Investment', formatCurrencyPlain(data.investment)],
  ];
  
  let configY = yPos + 24;
  configItems.forEach((item) => {
    if (item[0] === '') {
      doc.setDrawColor(...COLORS.borderGray);
      doc.line(margin + 8, configY - 2, margin + colWidth - 8, configY - 2);
    } else if (item[0] === 'Annual Investment') {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(item[0], margin + 8, configY);
      doc.setTextColor(...COLORS.green);
      doc.text(item[1], margin + colWidth - 8, configY, { align: 'right' });
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.mediumGray);
      doc.text(item[0], margin + 8, configY);
      doc.setTextColor(...COLORS.black);
      doc.text(item[1], margin + colWidth - 8, configY, { align: 'right' });
    }
    configY += 10;
  });
  
  // Multi-Year Projection column
  const projX = margin + colWidth + 10;
  drawCard(projX, yPos, colWidth, 85, COLORS.backgroundGray, COLORS.borderGray);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('MULTI-YEAR PROJECTION', projX + 8, yPos + 12);
  
  // Column headers
  const year1Cost = data.investment;
  const year2Cost = data.investment;
  const year3Cost = data.investment;
  const year1Net = data.year1 - year1Cost;
  const year2Net = data.year2 - year2Cost;
  const year3Net = data.year3 - year3Cost;
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('Year 1', projX + colWidth - 60, yPos + 24);
  doc.text('Year 2', projX + colWidth - 38, yPos + 24);
  doc.text('Year 3', projX + colWidth - 16, yPos + 24);
  
  const projRows = [
    ['Value', formatCurrencyPlain(data.year1), formatCurrencyPlain(data.year2), formatCurrencyPlain(data.year3)],
    ['Cost', formatCurrencyPlain(year1Cost), formatCurrencyPlain(year2Cost), formatCurrencyPlain(year3Cost)],
    ['Net', formatCurrency(year1Net), formatCurrency(year2Net), formatCurrency(year3Net)],
  ];
  
  let projY = yPos + 34;
  projRows.forEach((row, i) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', i === 2 ? 'bold' : 'normal');
    doc.setTextColor(...COLORS.darkGray);
    doc.text(row[0], projX + 8, projY);
    
    const textColor = i === 2 ? COLORS.green : COLORS.black;
    doc.setTextColor(...textColor);
    doc.text(row[1], projX + colWidth - 60, projY);
    doc.text(row[2], projX + colWidth - 38, projY);
    doc.text(row[3], projX + colWidth - 16, projY);
    
    if (i === 1) {
      projY += 4;
      doc.setDrawColor(...COLORS.borderGray);
      doc.line(projX + 8, projY, projX + colWidth - 8, projY);
      projY += 6;
    } else {
      projY += 10;
    }
  });
  
  // 3-Year Total
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('3-YEAR TOTAL NET: ' + formatCurrency(data.threeYearNet), projX + 8, yPos + 78);
  
  yPos += 95;
  
  // THE ROI EQUATION
  yPos = drawSectionTitle('THE ROI EQUATION', yPos);
  
  drawCard(margin, yPos, contentWidth, 50, COLORS.white, COLORS.borderGray);
  
  const eqBoxWidth = (contentWidth - 60) / 3;
  const eqY = yPos + 22;
  
  // Value box
  drawCard(margin + 10, yPos + 8, eqBoxWidth, 35, COLORS.backgroundGray);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(formatCurrencyPlain(data.totalValue), margin + 10 + eqBoxWidth / 2, eqY, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('Value', margin + 10 + eqBoxWidth / 2, eqY + 10, { align: 'center' });
  
  // Minus
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('-', margin + 15 + eqBoxWidth, eqY, { align: 'center' });
  
  // Cost box
  const costX = margin + 25 + eqBoxWidth;
  drawCard(costX, yPos + 8, eqBoxWidth, 35, COLORS.backgroundGray);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(formatCurrencyPlain(data.investment), costX + eqBoxWidth / 2, eqY, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('Cost', costX + eqBoxWidth / 2, eqY + 10, { align: 'center' });
  
  // Equals
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('=', costX + eqBoxWidth + 10, eqY, { align: 'center' });
  
  // Net Gain box
  const netX = costX + eqBoxWidth + 20;
  drawCard(netX, yPos + 8, eqBoxWidth, 35, COLORS.greenLight);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrency(data.netGain), netX + eqBoxWidth / 2, eqY, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Net Gain', netX + eqBoxWidth / 2, eqY + 10, { align: 'center' });
  
  // ROI callout
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(data.roi.toFixed(1) + 'x ROI', pageWidth / 2, yPos + 48, { align: 'center' });
  
  yPos += 60;
  
  // WHAT THIS MEANS
  yPos = drawSectionTitle('WHAT THIS MEANS', yPos);
  
  const meaningPoints = [
    `Your investment pays for itself in approximately ${paybackMonths} months`,
    `After month ${paybackMonths + 1}, every dollar is net positive value`,
    `Over 3 years, you could realize ${formatCurrencyPlain(data.threeYearNet)}+ in net value`,
    'These projections use conservative assumptions throughout',
    'Value grows as utilization increases and benefits compound',
  ];
  
  drawCard(margin, yPos, contentWidth, 45, COLORS.white, COLORS.borderGray);
  
  let meaningY = yPos + 10;
  meaningPoints.forEach((point) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    doc.text('*  ' + point, margin + 8, meaningY);
    meaningY += 8;
  });
  
  yPos += 55;
  
  // Disclaimer card
  drawCard(margin, yPos, contentWidth, 35, COLORS.cream, COLORS.borderGray);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.mediumGray);
  const disclaimerText = '"This analysis provides estimates for planning purposes based on your inputs and conservative assumptions. Actual results will vary based on implementation, adoption, and organizational factors. Value realization requires consistent usage and organizational commitment."';
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth - 16);
  disclaimerLines.forEach((line: string, i: number) => {
    doc.text(line, margin + 8, yPos + 10 + i * 5);
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 6: KEY ASSUMPTIONS & METHODOLOGY
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('KEY ASSUMPTIONS & METHODOLOGY', yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('This analysis combines your inputs with industry benchmarks and conservative assumptions. Everything is designed to be verifiable.', margin, yPos);
  
  yPos += 12;
  
  // Your Inputs table
  const inputsData = [
    ['YOUR INPUTS', 'VALUES'],
    [`${data.unitNamePlural} in scope`, data.providers.toString()],
    ['Annual encounters', formatNumber(data.encounters)],
    ['Expected utilization', data.utilization + '%'],
    ['Eligible encounters', formatNumber(eligibleEncounters)],
    ['Price per ' + data.unitName.toLowerCase() + '/month', formatCurrencyPlain(data.costPerProvider)],
    ['Contract term', '2 years'],
    ['Full scale ' + data.unitNamePlural.toLowerCase(), data.fullScaleProviders.toString()],
    ['Target utilization at scale', data.fullScaleUtil + '%'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [inputsData[0]],
    body: inputsData.slice(1),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.darkGray },
    headStyles: { fillColor: COLORS.backgroundGray, textColor: COLORS.darkGray, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 50, halign: 'right' } },
    margin: { left: margin, right: pageWidth - margin - 120 },
  });
  
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  
  // Industry Benchmarks Used
  yPos = drawSectionTitle('INDUSTRY BENCHMARKS USED', yPos);
  
  const benchmarksData = [
    ['Benchmark', 'Value', 'Source'],
    ['Physician replacement cost', '$400-800K', 'MGMA, AAFP'],
    ['Physician turnover rate', '6-8%', 'AAMC'],
    ['Burnout as departure factor', '40-50%', 'Mayo Clinic'],
    ['wRVU conversion factor', '$33', 'CMS (2024)'],
    ['Average HCC value', '$800', 'CMS RAF data'],
    ['Avg outpatient visit revenue', '$150-300', 'Industry avg'],
    ['Documentation time per encounter', '10-15 min', 'AMA research'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [benchmarksData[0]],
    body: benchmarksData.slice(1),
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 3, textColor: COLORS.darkGray },
    headStyles: { fillColor: COLORS.backgroundGray, textColor: COLORS.darkGray, fontStyle: 'bold', fontSize: 7 },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 35 } },
    margin: { left: margin, right: margin },
  });
  
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  
  // Conservative Factors Applied
  yPos = drawSectionTitle('CONSERVATIVE FACTORS APPLIED', yPos);
  
  const factorsTableData = [
    ['Factor', 'Rate', 'Rationale'],
    ['Time allocation to patient access', '25%', 'Only 1/4 of time goes to seeing more patients'],
    ['Visit conversion', '60%', 'Scheduling and capacity limit actual conversion'],
    ['Burnout attribution', '30%', 'We only claim 30% of retention improvement'],
    ['HCC audit factor', '25%', '75% haircut for RADV, payer review, adjustments'],
    ['wRVU improvement', '5%', 'Validated Abridge benchmark'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [factorsTableData[0]],
    body: factorsTableData.slice(1),
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 3, textColor: COLORS.darkGray },
    headStyles: { fillColor: COLORS.backgroundGray, textColor: COLORS.darkGray, fontStyle: 'bold', fontSize: 7 },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 75 } },
    margin: { left: margin, right: margin },
  });
  
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  
  // Important Disclaimers
  yPos = drawSectionTitle('IMPORTANT DISCLAIMERS', yPos);
  
  const disclaimers = [
    'This analysis provides estimates for planning purposes',
    'Actual results will vary based on implementation and adoption',
    'Value realization requires organizational commitment',
    'Past performance of other organizations does not guarantee results',
    'All projections use conservative assumptions as described above',
  ];
  
  disclaimers.forEach((d) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    doc.text('*  ' + d, margin, yPos);
    yPos += 7;
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APPENDIX PAGES: One per selected driver
  // ═══════════════════════════════════════════════════════════════════════════
  
  allDrivers.forEach((driver, idx) => {
    newPage();
    yPos = 30;
    
    const appendixLetter = String.fromCharCode(65 + idx);
    const isLabor = data.laborDrivers.some(d => d.name === driver.name);
    
    // Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(`APPENDIX ${appendixLetter}: ${driver.name.toUpperCase()}`, margin, yPos);
    
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(driver.value), pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 15;
    
    // THE THEORY
    drawCard(margin, yPos, contentWidth, 40, COLORS.cream, COLORS.borderGray);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('THE THEORY', margin + 8, yPos + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    
    const theoryLines = doc.splitTextToSize(driver.description, contentWidth - 16);
    theoryLines.forEach((line: string, i: number) => {
      doc.text(line, margin + 8, yPos + 22 + i * 5);
    });
    
    yPos += 50;
    
    // STEP-BY-STEP CALCULATION
    yPos = drawSectionTitle('STEP-BY-STEP CALCULATION', yPos);
    
    // Generate driver-specific calculation steps
    const getCalculationSteps = (dName: string): { step: string; calc: string; result: string }[] => {
      switch (dName) {
        case 'Clinician Retention':
          const expectedDepartures = data.providers * 0.06;
          const burnoutRelated = expectedDepartures * 0.45;
          const abridgeAttrib = burnoutRelated * 0.30;
          return [
            { step: 'STEP 1: BASELINE TURNOVER', calc: `${data.providers} ${data.unitNamePlural.toLowerCase()} x 6% turnover rate`, result: `${expectedDepartures.toFixed(1)} expected departures/year` },
            { step: 'STEP 2: BURNOUT-RELATED DEPARTURES', calc: `${expectedDepartures.toFixed(1)} departures x 45% burnout-related`, result: `${burnoutRelated.toFixed(2)} burnout departures` },
            { step: 'STEP 3: ABRIDGE ATTRIBUTION', calc: `${burnoutRelated.toFixed(2)} x 30% Abridge attribution`, result: `${abridgeAttrib.toFixed(2)} avoided departures` },
            { step: 'STEP 4: VALUE CALCULATION', calc: `${abridgeAttrib.toFixed(2)} avoided x $400,000 replacement cost`, result: formatCurrencyPlain(driver.value) },
          ];
        case 'Patient Access':
          const hoursSaved = Math.round(eligibleEncounters * 2 / 60);
          const accessHours = hoursSaved * 0.25;
          const visits = Math.round(accessHours * 0.60 * 2);
          return [
            { step: 'STEP 1: TIME SAVED', calc: `${formatNumber(eligibleEncounters)} encounters x 2 min saved`, result: `${formatNumber(hoursSaved)} hours saved` },
            { step: 'STEP 2: TIME TO ACCESS', calc: `${formatNumber(hoursSaved)} hours x 25% allocation to access`, result: `${formatNumber(Math.round(accessHours))} hours to patient access` },
            { step: 'STEP 3: VISITS GENERATED', calc: `${formatNumber(Math.round(accessHours))} hours x 60% conversion / 30 min per visit`, result: `${formatNumber(visits)} additional visits` },
            { step: 'STEP 4: VALUE CALCULATION', calc: `${formatNumber(visits)} visits x $200 avg revenue`, result: formatCurrencyPlain(driver.value) },
          ];
        case 'Accurate Level of Service':
          const additionalWRVU = Math.round(eligibleEncounters * 1.5 * 0.05);
          return [
            { step: 'STEP 1: BASELINE wRVUs', calc: `${formatNumber(eligibleEncounters)} encounters x 1.5 avg wRVU`, result: `${formatNumber(Math.round(eligibleEncounters * 1.5))} baseline wRVUs` },
            { step: 'STEP 2: IMPROVEMENT', calc: `${formatNumber(Math.round(eligibleEncounters * 1.5))} wRVUs x 5% improvement`, result: `${formatNumber(additionalWRVU)} additional wRVUs` },
            { step: 'STEP 3: VALUE CALCULATION', calc: `${formatNumber(additionalWRVU)} wRVUs x $33 conversion factor`, result: formatCurrencyPlain(driver.value) },
          ];
        default:
          return [
            { step: 'STEP 1: ESTABLISH BASELINE', calc: `${formatNumber(eligibleEncounters)} eligible encounters`, result: 'Baseline established' },
            { step: 'STEP 2: APPLY CONSERVATIVE FACTORS', calc: 'Industry benchmarks and Abridge data', result: 'Factors applied' },
            { step: 'STEP 3: VALUE CALCULATION', calc: 'Conservative methodology', result: formatCurrencyPlain(driver.value) },
          ];
      }
    };
    
    const steps = getCalculationSteps(driver.name);
    
    steps.forEach((s, i) => {
      drawCard(margin, yPos, contentWidth, 28, i === steps.length - 1 ? COLORS.greenLight : COLORS.white, COLORS.borderGray);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(s.step, margin + 8, yPos + 10);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.darkGray);
      doc.text(s.calc, margin + 8, yPos + 18);
      
      doc.setFont('helvetica', 'bold');
      const resultColor = i === steps.length - 1 ? COLORS.green : COLORS.black;
      doc.setTextColor(...resultColor);
      doc.text(s.result, pageWidth - margin - 8, yPos + 18, { align: 'right' });
      
      yPos += 32;
    });
    
    yPos += 5;
    
    // KEY ASSUMPTIONS FOR THIS DRIVER
    yPos = drawSectionTitle('KEY ASSUMPTIONS FOR THIS DRIVER', yPos);
    
    const driverAssumptions = [
      'Values based on industry benchmarks and Abridge customer data',
      'Conservative attribution factors applied throughout',
      'Assumes consistent utilization throughout the period',
      'Does not account for potential compounding effects',
      'All projections are estimates for planning purposes',
    ];
    
    driverAssumptions.forEach((assumption) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.darkGray);
      doc.text('*  ' + assumption, margin, yPos);
      yPos += 7;
    });
    
    yPos += 10;
    
    // Sources
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.lightGray);
    doc.text('Sources: MGMA, AAFP, AAMC, Mayo Clinic research, CMS data, AMA studies, Abridge customer benchmarks', margin, yPos);
  });
  
  // Save the PDF
  const filename = `Abridge_ROI_${data.setting.replace(/\s+/g, '_')}_${data.providers}P.pdf`;
  doc.save(filename);
}
