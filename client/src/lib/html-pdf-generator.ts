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
  organizationName?: string;
}

// Premium color palette - brand-aligned
const COLORS = {
  coral: [232, 90, 79] as [number, number, number],
  coralLight: [254, 242, 242] as [number, number, number],
  green: [5, 150, 105] as [number, number, number],
  greenLight: [236, 253, 245] as [number, number, number],
  greenDark: [4, 120, 87] as [number, number, number],
  black: [17, 24, 39] as [number, number, number],
  darkGray: [55, 65, 81] as [number, number, number],
  mediumGray: [107, 114, 128] as [number, number, number],
  lightGray: [156, 163, 175] as [number, number, number],
  backgroundGray: [249, 250, 251] as [number, number, number],
  subtleGray: [243, 244, 246] as [number, number, number],
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

const formatCurrencyWithPlus = (num: number): string => {
  const prefix = num >= 0 ? '+$' : '-$';
  return prefix + Math.round(Math.abs(num)).toLocaleString();
};

const formatCurrencyPlain = (num: number): string => {
  return '$' + Math.round(Math.abs(num)).toLocaleString();
};

const formatCurrencyShort = (num: number): string => {
  return '$' + formatNumber(Math.abs(num));
};

export async function generatePremiumPDF(data: PremiumPDFData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let currentPage = 1;
  
  const allDrivers = [...data.laborDrivers, ...data.revenueDrivers];
  const totalPages = 7 + allDrivers.length;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const eligibleEncounters = Math.round(data.encounters * data.utilization / 100);
  const paybackMonths = data.investment > 0 ? Math.ceil(12 * data.investment / data.totalValue) : 0;
  const orgName = data.organizationName || 'Your Organization';

  // Helper functions
  const drawHeader = () => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.coral);
    doc.text('ABRIDGE', margin, 15);
    
    doc.setTextColor(...COLORS.mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text('ROI Analysis', pageWidth - margin, 15, { align: 'right' });
    
    doc.setDrawColor(...COLORS.coral);
    doc.setLineWidth(0.5);
    doc.line(margin, 20, pageWidth - margin, 20);
  };

  const drawFooter = () => {
    doc.setDrawColor(...COLORS.borderGray);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.lightGray);
    doc.text('This analysis provides estimates based on your inputs and conservative assumptions. See methodology on final pages.', margin, pageHeight - 12);
    doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  };

  const drawSectionTitle = (title: string, y: number, subtitle?: string): number => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(title.toUpperCase(), margin, y);
    
    doc.setDrawColor(...COLORS.black);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 2, margin + doc.getTextWidth(title.toUpperCase()), y + 2);
    
    if (subtitle) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.mediumGray);
      doc.text(subtitle, margin, y + 10);
      return y + 18;
    }
    return y + 12;
  };

  const drawCard = (x: number, y: number, w: number, h: number, bgColor: [number, number, number] = COLORS.white, borderColor?: [number, number, number], leftAccent?: [number, number, number]) => {
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    if (borderColor) {
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 2, 2, 'S');
    }
    if (leftAccent) {
      doc.setFillColor(...leftAccent);
      doc.rect(x, y + 2, 3, h - 4, 'F');
    }
  };

  const newPage = () => {
    doc.addPage();
    currentPage++;
    drawHeader();
    drawFooter();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1: THE HEADLINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  let yPos = 25;
  
  // Abridge logo and coral accent line
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.coral);
  doc.text('ABRIDGE', margin, yPos);
  
  yPos += 8;
  doc.setDrawColor(...COLORS.coral);
  doc.setLineWidth(1.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 18;
  
  // Title block
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('ROI ANALYSIS', margin, yPos);
  
  doc.setDrawColor(...COLORS.black);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos + 2, margin + 80, yPos + 2);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text(`${data.setting} Ambient Documentation`, margin, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(`Prepared for ${orgName}`, margin, yPos);
  doc.text(today, margin, yPos + 6);
  
  yPos += 22;
  
  // YOUR PROJECTED ANNUAL VALUE - Hero card with green background
  drawCard(margin, yPos, contentWidth, 70, COLORS.greenLight);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('YOUR PROJECTED ANNUAL VALUE', pageWidth / 2, yPos + 12, { align: 'center' });
  
  // Hero number - 48pt, green, with + sign
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrencyWithPlus(data.netGain), pageWidth / 2, yPos + 35, { align: 'center' });
  
  // Underline the hero number
  const heroNumWidth = doc.getTextWidth(formatCurrencyWithPlus(data.netGain));
  doc.setDrawColor(...COLORS.green);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - heroNumWidth / 2, yPos + 38, pageWidth / 2 + heroNumWidth / 2, yPos + 38);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('net gain after investment', pageWidth / 2, yPos + 48, { align: 'center' });
  
  // Three metrics in mini cards
  const miniCardWidth = (contentWidth - 40) / 3;
  const miniCardY = yPos + 54;
  const miniCards = [
    { value: data.roi.toFixed(1) + 'x', label: 'ROI' },
    { value: paybackMonths + ' mo', label: 'payback' },
    { value: formatCurrencyShort(data.threeYearNet), label: '3-year' },
  ];
  
  miniCards.forEach((card, i) => {
    const cardX = margin + 10 + i * (miniCardWidth + 10);
    drawCard(cardX, miniCardY, miniCardWidth, 22, COLORS.white, COLORS.borderGray);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(card.value, cardX + miniCardWidth / 2, miniCardY + 10, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(card.label, cardX + miniCardWidth / 2, miniCardY + 18, { align: 'center' });
  });
  
  yPos += 85;
  
  // YOUR DEPLOYMENT - Single line with dot separators
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('YOUR DEPLOYMENT', margin, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  const deploymentText = `${data.providers} ${data.unitNamePlural.toLowerCase()}  ·  ${formatNumber(data.encounters)} encounters  ·  ${data.utilization}% utilization`;
  doc.text(deploymentText, margin, yPos);
  
  yPos += 15;
  
  // YOUR SELECTED VALUE DRIVERS
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('YOUR SELECTED VALUE DRIVERS', margin, yPos);
  
  yPos += 8;
  
  // Drivers table with mini bar charts
  const driverCardHeight = 12 + allDrivers.length * 16 + 20;
  drawCard(margin, yPos, contentWidth, driverCardHeight, COLORS.white, COLORS.borderGray);
  
  let driverY = yPos + 12;
  const maxDriverValue = Math.max(...allDrivers.map(d => d.value));
  
  allDrivers.forEach((driver) => {
    const pct = Math.round((driver.value / data.totalValue) * 100);
    const isLabor = data.laborDrivers.some(d => d.name === driver.name);
    
    // Colored dot
    doc.setFillColor(...(isLabor ? COLORS.blue : COLORS.green));
    doc.circle(margin + 8, driverY, 2.5, 'F');
    
    // Driver name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.black);
    doc.text(driver.name, margin + 16, driverY + 1);
    
    // Dollar value (green)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(driver.value), margin + 95, driverY + 1);
    
    // Percentage
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(pct + '%', margin + 130, driverY + 1);
    
    // Mini bar chart
    const barX = margin + 145;
    const barMaxWidth = 25;
    const barWidth = (driver.value / maxDriverValue) * barMaxWidth;
    
    doc.setFillColor(...COLORS.backgroundGray);
    doc.roundedRect(barX, driverY - 3.5, barMaxWidth, 7, 1, 1, 'F');
    doc.setFillColor(...(isLabor ? COLORS.blue : COLORS.green));
    doc.roundedRect(barX, driverY - 3.5, barWidth, 7, 1, 1, 'F');
    
    driverY += 16;
  });
  
  // Total row
  doc.setDrawColor(...COLORS.borderGray);
  doc.setLineWidth(0.5);
  doc.line(margin + 8, driverY - 4, margin + contentWidth - 8, driverY - 4);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('TOTAL VALUE', margin + 16, driverY + 6);
  
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrencyPlain(data.totalValue), margin + 95, driverY + 6);
  
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('100%', margin + 130, driverY + 6);
  
  // Page 1 footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2: THE FRAMEWORK
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('HOW AMBIENT AI CREATES VALUE', yPos);
  
  // Intro callout card with coral left accent
  drawCard(margin, yPos, contentWidth, 52, COLORS.backgroundGray, undefined, COLORS.coral);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  
  const introLines = [
    "Ambient AI doesn't generate revenue or cut costs directly.",
    "It does two things:",
    "",
    "   1. Returns time to clinicians (by handling documentation)",
    "   2. Captures clinical information (that would otherwise be lost or incomplete)",
    "",
    "That time and information convert to measurable value through specific pathways",
    "— depending on what matters most to your organization.",
  ];
  
  introLines.forEach((line, i) => {
    doc.text(line, margin + 12, yPos + 10 + i * 5.5);
  });
  
  yPos += 62;
  
  // THE TWO VALUE CATEGORIES
  yPos = drawSectionTitle('THE TWO VALUE CATEGORIES', yPos);
  
  const catWidth = (contentWidth - 8) / 2;
  
  // CAPACITY & LABOR card (blue tint)
  drawCard(margin, yPos, catWidth, 95, COLORS.blueLight, COLORS.blue);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.blue);
  doc.text('CAPACITY & LABOR', margin + 10, yPos + 14);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Time → Efficiency', margin + 10, yPos + 22);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  const laborBenefits = [
    "When clinicians spend less time",
    "documenting, that time converts to:",
    "",
    "  · More patient visits",
    "  · Reduced overtime",
    "  · Lower turnover",
    "  · Better work-life balance",
  ];
  laborBenefits.forEach((line, i) => {
    doc.text(line, margin + 10, yPos + 32 + i * 5);
  });
  
  // YOUR SELECTION in labor card
  doc.setDrawColor(...COLORS.blue);
  doc.setLineWidth(0.5);
  doc.line(margin + 10, yPos + 68, margin + catWidth - 10, yPos + 68);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.blue);
  doc.text('YOUR SELECTION:', margin + 10, yPos + 75);
  
  let laborSelY = yPos + 82;
  data.laborDrivers.forEach((d) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.green);
    doc.text('✓', margin + 10, laborSelY);
    doc.setTextColor(...COLORS.black);
    doc.text(d.name, margin + 16, laborSelY);
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(d.value), margin + catWidth - 30, laborSelY);
    laborSelY += 6;
  });
  
  if (data.laborDrivers.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.lightGray);
    doc.text('None selected', margin + 10, laborSelY);
  }
  
  // REVENUE & QUALITY card (green tint)
  const revX = margin + catWidth + 8;
  drawCard(revX, yPos, catWidth, 95, COLORS.greenLight, COLORS.green);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('REVENUE & QUALITY', revX + 10, yPos + 14);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Information → Accuracy', revX + 10, yPos + 22);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  const revBenefits = [
    "When documentation captures the",
    "full clinical picture:",
    "",
    "  · Better coding accuracy",
    "  · Improved HCC capture",
    "  · Fewer denials",
    "  · Complete documentation",
  ];
  revBenefits.forEach((line, i) => {
    doc.text(line, revX + 10, yPos + 32 + i * 5);
  });
  
  // YOUR SELECTION in revenue card
  doc.setDrawColor(...COLORS.green);
  doc.setLineWidth(0.5);
  doc.line(revX + 10, yPos + 68, revX + catWidth - 10, yPos + 68);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('YOUR SELECTION:', revX + 10, yPos + 75);
  
  let revSelY = yPos + 82;
  data.revenueDrivers.forEach((d) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.green);
    doc.text('✓', revX + 10, revSelY);
    doc.setTextColor(...COLORS.black);
    doc.text(d.name, revX + 16, revSelY);
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(d.value), revX + catWidth - 30, revSelY);
    revSelY += 6;
  });
  
  if (data.revenueDrivers.length === 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.lightGray);
    doc.text('None selected', revX + 10, revSelY);
  }
  
  yPos += 105;
  
  // WHY WE USE CONSERVATIVE ASSUMPTIONS
  yPos = drawSectionTitle('WHY WE USE CONSERVATIVE ASSUMPTIONS', yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text("Every calculation applies multiple conservative factors. We'd rather underestimate and overdeliver.", margin, yPos);
  
  yPos += 10;
  
  const factorsData = [
    ['Factor', 'Rate', 'What it means'],
    ['Time-to-access conversion', '25%', 'Only 1/4 of saved time goes to patient visits'],
    ['Visit conversion', '60%', 'Scheduling and capacity limit actual conversion'],
    ['Burnout attribution', '30%', 'We claim partial credit for retention improvement'],
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
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: COLORS.backgroundGray,
      textColor: COLORS.darkGray,
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 'auto' },
    },
    tableWidth: contentWidth,
    margin: { left: margin, right: margin },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3+: VALUE DRIVER DETAILS (one per driver)
  // ═══════════════════════════════════════════════════════════════════════════
  
  allDrivers.forEach((driver, idx) => {
    newPage();
    yPos = 30;
    
    const isLabor = data.laborDrivers.some(d => d.name === driver.name);
    const categoryColor = isLabor ? COLORS.blue : COLORS.green;
    const appendixLetter = String.fromCharCode(65 + idx);
    
    // Page section header
    if (idx === 0) {
      yPos = drawSectionTitle('YOUR VALUE DRIVERS', yPos, 'Based on your strategic priorities');
    } else {
      yPos += 5;
    }
    
    // Driver header card
    drawCard(margin, yPos, contentWidth, 20, COLORS.white, COLORS.borderGray);
    
    // Colored dot
    doc.setFillColor(...categoryColor);
    doc.circle(margin + 10, yPos + 10, 3, 'F');
    
    // Driver name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(driver.name.toUpperCase(), margin + 20, yPos + 12);
    
    // Dollar value (green, right-aligned)
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(driver.value), pageWidth - margin - 10, yPos + 12, { align: 'right' });
    
    // Underline
    doc.setDrawColor(...categoryColor);
    doc.setLineWidth(1);
    doc.line(margin, yPos + 22, pageWidth - margin, yPos + 22);
    
    yPos += 30;
    
    // THE THEORY section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('THE THEORY', margin, yPos);
    doc.setDrawColor(...COLORS.borderGray);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos + 2, margin + 50, yPos + 2);
    
    yPos += 10;
    
    // Theory text based on driver
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    
    const theoryText = getDriverTheory(driver.name);
    const theoryLines = doc.splitTextToSize(theoryText, contentWidth);
    theoryLines.forEach((line: string, i: number) => {
      doc.text(line, margin, yPos + i * 5);
    });
    
    yPos += theoryLines.length * 5 + 12;
    
    // YOUR INPUTS section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('YOUR INPUTS', margin, yPos);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(margin, yPos + 2, margin + 50, yPos + 2);
    
    yPos += 10;
    
    // Three input boxes
    const inputBoxWidth = (contentWidth - 16) / 3;
    const inputs = getDriverInputs(driver.name, data, eligibleEncounters);
    
    inputs.forEach((input, i) => {
      const boxX = margin + i * (inputBoxWidth + 8);
      drawCard(boxX, yPos, inputBoxWidth, 35, COLORS.backgroundGray);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(input.value, boxX + inputBoxWidth / 2, yPos + 15, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.mediumGray);
      doc.text(input.label, boxX + inputBoxWidth / 2, yPos + 25, { align: 'center' });
      doc.text(input.sublabel, boxX + inputBoxWidth / 2, yPos + 31, { align: 'center' });
    });
    
    yPos += 48;
    
    // THE LOGIC section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('THE LOGIC', margin, yPos);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(margin, yPos + 2, margin + 45, yPos + 2);
    
    yPos += 12;
    
    // Logic steps with arrows
    const logicSteps = getDriverLogicSteps(driver.name, data, eligibleEncounters, driver.value);
    
    logicSteps.forEach((step, i) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.darkGray);
      doc.text(step.calculation, margin, yPos);
      
      // Arrow line pointing to result
      const calcWidth = doc.getTextWidth(step.calculation);
      doc.setDrawColor(...COLORS.borderGray);
      doc.setLineWidth(0.3);
      doc.line(margin + calcWidth + 5, yPos - 1, margin + 125, yPos - 1);
      
      // Arrow head
      doc.setFillColor(...COLORS.mediumGray);
      doc.triangle(margin + 127, yPos - 1, margin + 125, yPos - 3, margin + 125, yPos + 1, 'F');
      
      // Result
      const isLast = i === logicSteps.length - 1;
      doc.setFont('helvetica', isLast ? 'bold' : 'normal');
      doc.setTextColor(...(isLast ? COLORS.green : COLORS.black));
      doc.text(step.result, margin + 132, yPos);
      
      yPos += 12;
    });
    
    yPos += 8;
    
    // Attribution callout box
    const callout = getDriverCallout(driver.name);
    if (callout) {
      drawCard(margin, yPos, contentWidth, 38, COLORS.backgroundGray, COLORS.borderGray);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(callout.title, margin + 10, yPos + 12);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.darkGray);
      const calloutLines = doc.splitTextToSize(callout.text, contentWidth - 20);
      calloutLines.forEach((line: string, i: number) => {
        doc.text(line, margin + 10, yPos + 20 + i * 5);
      });
      
      yPos += 45;
    }
    
    // Link to appendix
    doc.setDrawColor(...COLORS.borderGray);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    yPos += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(`Full step-by-step calculation → Appendix ${appendixLetter}`, margin, yPos);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // THE SCALING OPPORTUNITY PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('THE SCALING OPPORTUNITY', yPos, 'What growth could look like');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text(`This analysis models a deployment of ${data.providers} ${data.unitNamePlural.toLowerCase()}. Here's what scaling across your organization could mean.`, margin, yPos);
  
  yPos += 15;
  
  // PILOT vs FULL SCALE side by side
  const scaleCardWidth = (contentWidth - 20) / 2;
  
  // Pilot card (gray)
  drawCard(margin, yPos, scaleCardWidth, 85, COLORS.backgroundGray, COLORS.borderGray);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('PILOT (TODAY)', margin + scaleCardWidth / 2, yPos + 12, { align: 'center' });
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(data.providers.toString(), margin + scaleCardWidth / 2, yPos + 32, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(data.unitNamePlural.toLowerCase(), margin + scaleCardWidth / 2, yPos + 40, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text(`${formatNumber(data.encounters)} encounters`, margin + scaleCardWidth / 2, yPos + 52, { align: 'center' });
  doc.text(`${data.utilization}% utilization`, margin + scaleCardWidth / 2, yPos + 60, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(formatCurrencyShort(data.totalValue), margin + scaleCardWidth / 2, yPos + 72, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('annual value', margin + scaleCardWidth / 2, yPos + 79, { align: 'center' });
  
  // Arrow between cards
  const arrowX = margin + scaleCardWidth + 10;
  doc.setFillColor(...COLORS.mediumGray);
  doc.triangle(arrowX + 5, yPos + 42, arrowX - 2, yPos + 38, arrowX - 2, yPos + 46, 'F');
  doc.setDrawColor(...COLORS.mediumGray);
  doc.setLineWidth(1.5);
  doc.line(arrowX - 5, yPos + 42, arrowX, yPos + 42);
  
  // Full Scale card (green)
  const fullX = margin + scaleCardWidth + 20;
  drawCard(fullX, yPos, scaleCardWidth, 85, COLORS.greenLight, COLORS.green);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('FULL SCALE', fullX + scaleCardWidth / 2, yPos + 12, { align: 'center' });
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(data.fullScaleProviders.toString(), fullX + scaleCardWidth / 2, yPos + 32, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(data.unitNamePlural.toLowerCase(), fullX + scaleCardWidth / 2, yPos + 40, { align: 'center' });
  
  const fullScaleEnc = Math.round(data.encounters * (data.fullScaleProviders / data.providers));
  doc.setFontSize(8);
  doc.text(`${formatNumber(fullScaleEnc)} encounters`, fullX + scaleCardWidth / 2, yPos + 52, { align: 'center' });
  doc.text(`${data.fullScaleUtil}% utilization`, fullX + scaleCardWidth / 2, yPos + 60, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrencyShort(data.fullScaleValue), fullX + scaleCardWidth / 2, yPos + 72, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('annual value', fullX + scaleCardWidth / 2, yPos + 79, { align: 'center' });
  
  yPos += 95;
  
  // WHY VALUE COMPOUNDS section
  yPos = drawSectionTitle('WHY VALUE COMPOUNDS (NOT JUST SCALES)', yPos);
  
  drawCard(margin, yPos, contentWidth, 50, COLORS.white, COLORS.borderGray);
  
  const compoundPoints = [
    { icon: '↗', title: 'UTILIZATION IMPROVES', desc: `${data.utilization}% → ${data.fullScaleUtil}% as adoption matures and habits form` },
    { icon: '↗', title: 'RETENTION BENEFITS MATERIALIZE', desc: 'Full impact emerges after 6-12 months' },
    { icon: '↗', title: 'EFFICIENCY COMPOUNDS', desc: 'Shared learnings, optimized workflows, organizational muscle' },
  ];
  
  let compY = yPos + 12;
  compoundPoints.forEach((point) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.green);
    doc.text(point.icon, margin + 10, compY);
    
    doc.setTextColor(...COLORS.black);
    doc.text(point.title, margin + 22, compY);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(point.desc, margin + 22, compY + 6);
    
    compY += 16;
  });
  
  yPos += 60;
  
  // Compounding bonus callout
  const compoundingBonus = Math.round((data.fullScaleValue * 2) - (data.totalValue * (data.fullScaleProviders / data.providers) * 2));
  drawCard(margin, yPos, contentWidth, 35, COLORS.greenLight, COLORS.green);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('COMPOUNDING BONUS', margin + 10, yPos + 12);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrencyWithPlus(Math.abs(compoundingBonus) > 10000 ? compoundingBonus : data.networkEffect), margin + 10, yPos + 26);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('over 24 months beyond linear projection', margin + 85, yPos + 26);

  // ═══════════════════════════════════════════════════════════════════════════
  // YOUR INVESTMENT PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('YOUR INVESTMENT', yPos, 'The financial picture');
  
  // Two column layout: Configuration + Multi-Year
  const colWidth = (contentWidth - 10) / 2;
  
  // YOUR CONFIGURATION column
  drawCard(margin, yPos, colWidth, 75, COLORS.white, COLORS.borderGray);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('YOUR CONFIGURATION', margin + 10, yPos + 12);
  
  const configItems = [
    { label: 'Setting', value: data.setting },
    { label: data.unitNamePlural, value: data.providers.toString() },
    { label: 'Price', value: `$${data.costPerProvider}/mo` },
    { label: 'Term', value: '2 years' },
  ];
  
  let configY = yPos + 24;
  configItems.forEach((item) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(item.label, margin + 10, configY);
    
    doc.setTextColor(...COLORS.black);
    doc.text(item.value, margin + colWidth - 10, configY, { align: 'right' });
    configY += 10;
  });
  
  doc.setDrawColor(...COLORS.borderGray);
  doc.line(margin + 10, configY, margin + colWidth - 10, configY);
  configY += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('Annual Investment', margin + 10, configY);
  doc.text(formatCurrencyPlain(data.investment), margin + colWidth - 10, configY, { align: 'right' });
  
  // MULTI-YEAR PROJECTION column
  const multiX = margin + colWidth + 10;
  drawCard(multiX, yPos, colWidth, 75, COLORS.white, COLORS.borderGray);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('MULTI-YEAR PROJECTION', multiX + 10, yPos + 12);
  
  // Table headers
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('Yr 1', multiX + 35, yPos + 24);
  doc.text('Yr 2', multiX + 55, yPos + 24);
  doc.text('Yr 3', multiX + 75, yPos + 24);
  
  // Value row
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Value', multiX + 10, yPos + 34);
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrencyShort(data.year1), multiX + 35, yPos + 34);
  doc.text(formatCurrencyShort(data.year2), multiX + 55, yPos + 34);
  doc.text(formatCurrencyShort(data.year3), multiX + 75, yPos + 34);
  
  // Cost row
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Cost', multiX + 10, yPos + 44);
  doc.text(formatCurrencyShort(data.investment), multiX + 35, yPos + 44);
  doc.text(formatCurrencyShort(data.investment), multiX + 55, yPos + 44);
  doc.text(formatCurrencyShort(data.investment), multiX + 75, yPos + 44);
  
  // Line
  doc.setDrawColor(...COLORS.borderGray);
  doc.line(multiX + 10, yPos + 50, multiX + colWidth - 10, yPos + 50);
  
  // Net row
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text('Net', multiX + 10, yPos + 58);
  doc.text(formatCurrencyWithPlus(data.year1 - data.investment), multiX + 35, yPos + 58);
  doc.text(formatCurrencyWithPlus(data.year2 - data.investment), multiX + 55, yPos + 58);
  doc.text(formatCurrencyWithPlus(data.year3 - data.investment), multiX + 75, yPos + 58);
  
  // 3-Year Total
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('3-YEAR TOTAL: ' + formatCurrencyWithPlus(data.threeYearNet), multiX + 10, yPos + 70);
  
  yPos += 90;
  
  // THE ROI EQUATION
  yPos = drawSectionTitle('THE ROI EQUATION', yPos);
  
  drawCard(margin, yPos, contentWidth, 55, COLORS.white, COLORS.borderGray);
  
  const eqBoxWidth = 50;
  const eqY = yPos + 25;
  
  // Value box
  drawCard(margin + 15, yPos + 10, eqBoxWidth, 35, COLORS.backgroundGray);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(formatCurrencyShort(data.totalValue), margin + 15 + eqBoxWidth / 2, eqY, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('Value', margin + 15 + eqBoxWidth / 2, eqY + 10, { align: 'center' });
  
  // Minus sign
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('−', margin + 75, eqY);
  
  // Cost box
  drawCard(margin + 85, yPos + 10, eqBoxWidth, 35, COLORS.backgroundGray);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text(formatCurrencyShort(data.investment), margin + 85 + eqBoxWidth / 2, eqY, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('Cost', margin + 85 + eqBoxWidth / 2, eqY + 10, { align: 'center' });
  
  // Equals sign
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text('=', margin + 145, eqY);
  
  // Net Gain box (green background)
  drawCard(margin + 155, yPos + 10, eqBoxWidth, 35, COLORS.greenLight);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(formatCurrencyWithPlus(data.netGain), margin + 155 + eqBoxWidth / 2, eqY, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('Net Gain', margin + 155 + eqBoxWidth / 2, eqY + 10, { align: 'center' });
  
  // ROI callout
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.green);
  doc.text(data.roi.toFixed(1) + 'x ROI', pageWidth / 2, yPos + 52, { align: 'center' });
  
  yPos += 65;
  
  // WHAT THIS MEANS
  yPos = drawSectionTitle('WHAT THIS MEANS', yPos);
  
  drawCard(margin, yPos, contentWidth, 45, COLORS.white, COLORS.borderGray);
  
  const meaningPoints = [
    `Your investment pays for itself in approximately ${paybackMonths} months`,
    `After month ${paybackMonths + 1}, every dollar is net positive value`,
    `Over 3 years, you could realize ${formatCurrencyShort(data.threeYearNet)}+ in net value`,
    'These projections use conservative assumptions throughout',
  ];
  
  let meaningY = yPos + 12;
  meaningPoints.forEach((point) => {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.green);
    doc.text('✓', margin + 10, meaningY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    doc.text(point, margin + 20, meaningY);
    meaningY += 10;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // METHODOLOGY PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  newPage();
  yPos = 30;
  
  yPos = drawSectionTitle('KEY ASSUMPTIONS & METHODOLOGY', yPos, 'Transparent, verifiable, conservative');
  
  // Your Inputs table
  const inputsData = [
    ['YOUR INPUTS', 'VALUES'],
    [`${data.unitNamePlural} in scope`, data.providers.toString()],
    ['Annual encounters', formatNumber(data.encounters)],
    ['Expected utilization', data.utilization + '%'],
    ['Eligible encounters', formatNumber(eligibleEncounters)],
    ['Price per ' + data.unitName.toLowerCase() + '/month', `$${data.costPerProvider}`],
    ['Contract term', '2 years'],
    ['Full scale ' + data.unitNamePlural.toLowerCase(), data.fullScaleProviders.toString()],
    ['Target utilization at scale', data.fullScaleUtil + '%'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [inputsData[0]],
    body: inputsData.slice(1),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.darkGray, overflow: 'linebreak' },
    headStyles: { fillColor: COLORS.backgroundGray, textColor: COLORS.darkGray, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 35, halign: 'right' } },
    tableWidth: 90,
    margin: { left: margin, right: margin },
  });
  
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  
  // Industry Benchmarks
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
    styles: { fontSize: 7, cellPadding: 3, textColor: COLORS.darkGray, overflow: 'linebreak' },
    headStyles: { fillColor: COLORS.backgroundGray, textColor: COLORS.darkGray, fontStyle: 'bold', fontSize: 7 },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 'auto' } },
    tableWidth: contentWidth,
    margin: { left: margin, right: margin },
  });
  
  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  
  // Important Disclaimers
  yPos = drawSectionTitle('IMPORTANT DISCLAIMERS', yPos);
  
  const disclaimers = [
    'This analysis provides estimates for planning purposes based on your inputs',
    'Actual results will vary based on implementation, adoption, and organizational factors',
    'Value realization requires consistent usage and organizational commitment',
    'All projections use conservative assumptions as described above',
    'Past performance of other organizations does not guarantee results',
  ];
  
  disclaimers.forEach((d) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    doc.text('•  ' + d, margin, yPos);
    yPos += 8;
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
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text(`APPENDIX ${appendixLetter}: ${driver.name.toUpperCase()}`, margin, yPos);
    
    doc.setTextColor(...COLORS.green);
    doc.text(formatCurrencyPlain(driver.value), pageWidth - margin, yPos, { align: 'right' });
    
    yPos += 15;
    
    // THE THEORY box
    drawCard(margin, yPos, contentWidth, 40, COLORS.backgroundGray, COLORS.borderGray, COLORS.coral);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('THE THEORY', margin + 12, yPos + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    
    const theoryLines = doc.splitTextToSize(driver.description || getDriverTheory(driver.name), contentWidth - 24);
    theoryLines.slice(0, 4).forEach((line: string, i: number) => {
      doc.text(line, margin + 12, yPos + 22 + i * 5);
    });
    
    yPos += 50;
    
    // STEP-BY-STEP CALCULATION
    yPos = drawSectionTitle('STEP-BY-STEP CALCULATION', yPos);
    
    const steps = getAppendixSteps(driver.name, data, eligibleEncounters, driver.value);
    
    steps.forEach((s, i) => {
      const isLast = i === steps.length - 1;
      drawCard(margin, yPos, contentWidth, 28, isLast ? COLORS.greenLight : COLORS.white, COLORS.borderGray);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(s.step, margin + 8, yPos + 10);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.darkGray);
      doc.text(s.calc, margin + 8, yPos + 18);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(isLast ? COLORS.green : COLORS.black));
      doc.text(s.result, pageWidth - margin - 8, yPos + 18, { align: 'right' });
      
      yPos += 32;
    });
    
    yPos += 5;
    
    // KEY ASSUMPTIONS
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
      doc.text('•  ' + assumption, margin, yPos);
      yPos += 7;
    });
    
    yPos += 5;
    
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

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR DRIVER-SPECIFIC CONTENT
// ═══════════════════════════════════════════════════════════════════════════

function getDriverTheory(driverName: string): string {
  switch (driverName) {
    case 'Clinician Retention':
      return "Documentation burden is the #1 driver of physician burnout. The average physician spends 2 hours on documentation for every 1 hour of patient care. Reducing this burden improves satisfaction and retention. When a physician leaves, the true cost ranges from $400,000 to $800,000+ when you factor in recruiting, lost revenue during vacancy, and onboarding time.";
    case 'Patient Access':
      return "When clinicians spend less time on documentation, they have capacity to see additional patients. Not all saved time converts to visits — scheduling, room availability, and demand all play a role — but even a modest conversion creates meaningful revenue.";
    case 'Accurate Level of Service':
      return "Physicians under time pressure document less than the full clinical picture. When documentation is incomplete, coding doesn't reflect the true complexity of care delivered. AI-assisted documentation captures clinical complexity that supports accurate coding — not upcoding, just getting credit for work already done.";
    case 'HCC & Chronic Condition Capture':
      return "Accurate documentation of chronic conditions ensures proper risk adjustment, improving reimbursement accuracy for value-based care arrangements. AI captures clinical details that might otherwise be missed in rushed documentation.";
    case 'Reduced Overtime':
      return "When documentation happens during the visit rather than after hours, clinicians can go home on time. Reduced overtime directly lowers labor costs and improves satisfaction.";
    case 'Quality Metrics':
      return "Better documentation supports quality measure compliance, reducing penalties and maximizing incentive payments under value-based care programs.";
    default:
      return "This value driver creates measurable benefit by converting time savings and improved documentation into tangible organizational outcomes.";
  }
}

function getDriverInputs(driverName: string, data: PremiumPDFData, eligibleEncounters: number): { value: string; label: string; sublabel: string }[] {
  switch (driverName) {
    case 'Clinician Retention':
      return [
        { value: data.providers.toString(), label: data.unitNamePlural.toLowerCase(), sublabel: 'in scope' },
        { value: '6%', label: 'turnover', sublabel: 'rate' },
        { value: '$400K', label: 'replacement', sublabel: 'cost' },
      ];
    case 'Patient Access':
      return [
        { value: formatNumber(eligibleEncounters), label: 'eligible', sublabel: 'encounters' },
        { value: '2 min', label: 'saved', sublabel: 'per enc.' },
        { value: '$200', label: 'per visit', sublabel: 'revenue' },
      ];
    case 'Accurate Level of Service':
      return [
        { value: formatNumber(eligibleEncounters), label: 'eligible', sublabel: 'encounters' },
        { value: '1.5', label: 'avg wRVU/', sublabel: 'encounter' },
        { value: '5%', label: 'improvement', sublabel: 'expected' },
      ];
    case 'HCC & Chronic Condition Capture':
      return [
        { value: formatNumber(eligibleEncounters), label: 'eligible', sublabel: 'encounters' },
        { value: '$800', label: 'avg HCC', sublabel: 'value' },
        { value: '25%', label: 'audit', sublabel: 'factor' },
      ];
    default:
      return [
        { value: data.providers.toString(), label: data.unitNamePlural.toLowerCase(), sublabel: 'in scope' },
        { value: formatNumber(eligibleEncounters), label: 'encounters', sublabel: 'eligible' },
        { value: data.utilization + '%', label: 'utilization', sublabel: 'rate' },
      ];
  }
}

function getDriverLogicSteps(driverName: string, data: PremiumPDFData, eligibleEncounters: number, value: number): { calculation: string; result: string }[] {
  switch (driverName) {
    case 'Clinician Retention': {
      const departures = (data.providers * 0.06).toFixed(1);
      const burnout = (data.providers * 0.06 * 0.45).toFixed(2);
      const avoided = (data.providers * 0.06 * 0.45 * 0.30).toFixed(2);
      return [
        { calculation: `${data.providers} ${data.unitNamePlural.toLowerCase()} × 6% turnover`, result: `${departures} departures/yr` },
        { calculation: `${departures} departures × 45% burnout-related`, result: `${burnout} preventable` },
        { calculation: `${burnout} preventable × 30% Abridge attribution`, result: `${avoided} avoided` },
        { calculation: `${avoided} avoided × $400,000 replacement cost`, result: formatCurrencyPlain(value) },
      ];
    }
    case 'Patient Access': {
      const hours = Math.round(eligibleEncounters * 2 / 60);
      const accessHours = Math.round(hours * 0.25);
      const convertedHours = Math.round(accessHours * 0.60);
      const visits = Math.round(convertedHours * 2);
      return [
        { calculation: `${formatNumber(eligibleEncounters)} encounters × 2 min saved`, result: `${formatNumber(hours)} hours` },
        { calculation: `${formatNumber(hours)} hours × 25% allocated to access`, result: `${formatNumber(accessHours)} hours` },
        { calculation: `${formatNumber(accessHours)} hours × 60% conversion to visits`, result: `${formatNumber(convertedHours)} hours` },
        { calculation: `${formatNumber(convertedHours)} hours ÷ 30 min per visit`, result: `${formatNumber(visits)} visits` },
        { calculation: `${formatNumber(visits)} visits × $200 revenue`, result: formatCurrencyPlain(value) },
      ];
    }
    case 'Accurate Level of Service': {
      const baseWRVU = Math.round(eligibleEncounters * 1.5);
      const additionalWRVU = Math.round(baseWRVU * 0.05);
      return [
        { calculation: `${formatNumber(eligibleEncounters)} encounters × 1.5 wRVU/enc`, result: `${formatNumber(baseWRVU)} wRVU` },
        { calculation: `${formatNumber(baseWRVU)} wRVU × 5% improvement`, result: `${formatNumber(additionalWRVU)} wRVU gain` },
        { calculation: `${formatNumber(additionalWRVU)} wRVU × $33 conversion factor`, result: formatCurrencyPlain(value) },
      ];
    }
    default:
      return [
        { calculation: `${formatNumber(eligibleEncounters)} eligible encounters`, result: 'Baseline' },
        { calculation: 'Apply conservative factors and benchmarks', result: 'Calculated' },
        { calculation: 'Final value', result: formatCurrencyPlain(value) },
      ];
  }
}

function getDriverCallout(driverName: string): { title: string; text: string } | null {
  switch (driverName) {
    case 'Clinician Retention':
      return {
        title: 'WHY 30% ATTRIBUTION?',
        text: "Documentation burden accounts for approximately 50% of burnout drivers. Abridge reduces documentation burden by ~70%. 50% × 70% = 35% theoretical impact. We round to 30% for conservatism.",
      };
    case 'Patient Access':
      return {
        title: 'WHERE DOES SAVED TIME GO?',
        text: "We assume saved time splits: 50% → Quality of life (not monetized), 25% → Patient access (this driver), 25% → Cost reduction (overtime savings if selected).",
      };
    case 'Accurate Level of Service':
      return {
        title: 'WHY $33 CONVERSION FACTOR?',
        text: "We use the Medicare conversion factor ($33) for conservatism. Commercial rates typically range $45-$65 — actual results may be higher.",
      };
    default:
      return null;
  }
}

function getAppendixSteps(driverName: string, data: PremiumPDFData, eligibleEncounters: number, value: number): { step: string; calc: string; result: string }[] {
  switch (driverName) {
    case 'Clinician Retention': {
      const departures = (data.providers * 0.06).toFixed(1);
      const burnout = (data.providers * 0.06 * 0.45).toFixed(2);
      const avoided = (data.providers * 0.06 * 0.45 * 0.30).toFixed(2);
      return [
        { step: 'STEP 1: BASELINE TURNOVER', calc: `${data.providers} ${data.unitNamePlural.toLowerCase()} × 6% turnover rate`, result: `${departures} expected departures/year` },
        { step: 'STEP 2: BURNOUT-RELATED DEPARTURES', calc: `${departures} departures × 45% burnout-related`, result: `${burnout} burnout departures` },
        { step: 'STEP 3: ABRIDGE ATTRIBUTION', calc: `${burnout} × 30% Abridge attribution`, result: `${avoided} avoided departures` },
        { step: 'STEP 4: VALUE CALCULATION', calc: `${avoided} avoided × $400,000 replacement cost`, result: formatCurrencyPlain(value) },
      ];
    }
    case 'Patient Access': {
      const hours = Math.round(eligibleEncounters * 2 / 60);
      const accessHours = Math.round(hours * 0.25);
      const visits = Math.round(accessHours * 0.60 * 2);
      return [
        { step: 'STEP 1: TIME SAVED', calc: `${formatNumber(eligibleEncounters)} encounters × 2 min saved`, result: `${formatNumber(hours)} hours saved` },
        { step: 'STEP 2: TIME TO ACCESS', calc: `${formatNumber(hours)} hours × 25% allocation to access`, result: `${formatNumber(accessHours)} hours to patient access` },
        { step: 'STEP 3: VISITS GENERATED', calc: `${formatNumber(accessHours)} hours × 60% conversion / 30 min per visit`, result: `${formatNumber(visits)} additional visits` },
        { step: 'STEP 4: VALUE CALCULATION', calc: `${formatNumber(visits)} visits × $200 avg revenue`, result: formatCurrencyPlain(value) },
      ];
    }
    case 'Accurate Level of Service': {
      const additionalWRVU = Math.round(eligibleEncounters * 1.5 * 0.05);
      return [
        { step: 'STEP 1: BASELINE wRVUs', calc: `${formatNumber(eligibleEncounters)} encounters × 1.5 avg wRVU`, result: `${formatNumber(Math.round(eligibleEncounters * 1.5))} baseline wRVUs` },
        { step: 'STEP 2: IMPROVEMENT', calc: `${formatNumber(Math.round(eligibleEncounters * 1.5))} wRVUs × 5% improvement`, result: `${formatNumber(additionalWRVU)} additional wRVUs` },
        { step: 'STEP 3: VALUE CALCULATION', calc: `${formatNumber(additionalWRVU)} wRVUs × $33 conversion factor`, result: formatCurrencyPlain(value) },
      ];
    }
    default:
      return [
        { step: 'STEP 1: ESTABLISH BASELINE', calc: `${formatNumber(eligibleEncounters)} eligible encounters`, result: 'Baseline established' },
        { step: 'STEP 2: APPLY CONSERVATIVE FACTORS', calc: 'Industry benchmarks and Abridge data', result: 'Factors applied' },
        { step: 'STEP 3: VALUE CALCULATION', calc: 'Conservative methodology', result: formatCurrencyPlain(value) },
      ];
  }
}
