import { jsPDF } from "jspdf";
import { 
  type RoiInputs, 
  type LeverId, 
  leverLabels,
  leverDescriptions
} from "./roi-types";
import { calculateRoi } from "./roi-calculator";

// Abridge Brand Colors
const COLORS = {
  abridgeOrange: { r: 232, g: 83, b: 47 },      // #EA2C00
  abridgeRed: { r: 240, g: 51, b: 25 },          // #EA2C00
  black: { r: 17, g: 24, b: 39 },                 // #111827
  gray: { r: 107, g: 114, b: 128 },               // #6B7280
  lightGray: { r: 156, g: 163, b: 175 },          // #9CA3AF
  green: { r: 5, g: 150, b: 105 },                // #059669
  cardBg: { r: 249, g: 250, b: 251 },             // #F9FAFB
  warningBg: { r: 254, g: 243, b: 199 },          // #FEF3C7
  infoBg: { r: 239, g: 246, b: 255 },             // #EFF6FF
  white: { r: 255, g: 255, b: 255 },
};

// Typography settings
const FONTS = {
  title: 32,
  subtitle: 24,
  sectionHeader: 16,
  pageHeader: 14,
  body: 12,
  bodySmall: 11,
  caption: 10,
  tiny: 8,
};

// Page dimensions (Letter size in mm)
const PAGE = {
  width: 215.9,
  height: 279.4,
  margin: 25.4,  // 1 inch margins
  get contentWidth() { return this.width - 2 * this.margin; },
};

export interface ExportOptions {
  documentTitle?: string;
  organizationName?: string;
  preparedFor?: string;
  preparedBy?: string;
  customNotes?: string;
  includeSections: {
    executiveSummary: boolean;
    valueBreakdown: boolean;
    detailedCalculations: boolean;
    methodology: boolean;
    scenarios?: boolean;
  };
  includeBaselineComparison?: boolean;
}

export interface ScenarioData {
  id: string;
  name: string;
  type: 'expand_providers' | 'add_drivers' | 'new_care_setting';
  description: string;
  inputs: RoiInputs;
  results: ReturnType<typeof calculateRoi>;
}

type PDFDoc = jsPDF & {
  GState: new (options: Record<string, number>) => unknown;
};

class PdfGenerator {
  private doc: PDFDoc;
  private pageNumber: number = 1;
  private y: number = PAGE.margin;
  private currentDate: string;

  constructor() {
    this.doc = new jsPDF() as PDFDoc;
    this.currentDate = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  // Helper: Set text color from COLORS object
  private setColor(color: { r: number; g: number; b: number }) {
    this.doc.setTextColor(color.r, color.g, color.b);
  }

  private setDrawColorObj(color: { r: number; g: number; b: number }) {
    this.doc.setDrawColor(color.r, color.g, color.b);
  }

  private setFillColorObj(color: { r: number; g: number; b: number }) {
    this.doc.setFillColor(color.r, color.g, color.b);
  }

  // Helper: Format currency
  private formatCurrency(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Helper: Add geometric pattern (Abridge branding)
  private addGeometricPattern(isCover: boolean = false) {
    this.setDrawColorObj(COLORS.abridgeRed);
    this.doc.setLineWidth(0.2);
    
    const gState = new this.doc.GState({ "stroke-opacity": 0.02 });
    this.doc.setGState(gState);
    
    if (isCover) {
      const startX = PAGE.width - 80;
      const startY = 15;
      const size = 6;
      const gap = 10;
      
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const x = startX + col * gap;
          const yPos = startY + row * gap;
          if ((row + col) % 2 === 0) {
            this.doc.circle(x, yPos, size / 3, 'S');
          } else {
            this.doc.rect(x - size / 4, yPos - size / 4, size / 2, size / 2, 'S');
          }
        }
      }
      
      const bottomX = 15;
      const bottomY = PAGE.height - 60;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const x = bottomX + col * gap;
          const yPos = bottomY + row * gap;
          if ((row + col) % 2 === 0) {
            this.doc.circle(x, yPos, size / 3, 'S');
          }
        }
      }
    } else {
      const cornerX = PAGE.width - 25;
      const cornerY = 15;
      const smallSize = 4;
      const smallGap = 6;
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x = cornerX + col * smallGap;
          const yPos = cornerY + row * smallGap;
          if ((row + col) % 2 === 0) {
            this.doc.circle(x, yPos, smallSize / 4, 'S');
          }
        }
      }
    }
    
    const resetState = new this.doc.GState({ "stroke-opacity": 1.0 });
    this.doc.setGState(resetState);
    this.doc.setDrawColor(200);
  }

  // Helper: Add page footer
  private addFooter() {
    this.doc.setFontSize(FONTS.tiny);
    this.setColor(COLORS.lightGray);
    this.doc.text(`abridge.com/roi`, PAGE.margin, PAGE.height - 10);
    this.doc.text(`Page ${this.pageNumber}`, PAGE.width - PAGE.margin, PAGE.height - 10, { align: 'right' });
  }

  // Helper: New page
  private newPage(addPattern: boolean = true) {
    this.addFooter();
    this.doc.addPage();
    this.pageNumber++;
    this.y = PAGE.margin;
    if (addPattern) {
      this.addGeometricPattern(false);
    }
  }

  // Helper: Page header (orange, uppercase)
  private addPageHeader(text: string) {
    this.doc.setFontSize(FONTS.pageHeader);
    this.setColor(COLORS.abridgeOrange);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(text.toUpperCase(), PAGE.margin, this.y);
    this.y += 12;
  }

  // Helper: Section header with divider
  private addSectionHeader(text: string) {
    this.doc.setFontSize(FONTS.sectionHeader);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(text.toUpperCase(), PAGE.margin, this.y);
    this.y += 3;
    this.setDrawColorObj(COLORS.lightGray);
    this.doc.setLineWidth(0.3);
    this.doc.line(PAGE.margin, this.y, PAGE.margin + PAGE.contentWidth, this.y);
    this.y += 8;
  }

  // Helper: Draw a card/box with background
  private drawCard(height: number, bgColor: { r: number; g: number; b: number } = COLORS.cardBg) {
    this.setDrawColorObj(COLORS.lightGray);
    this.setFillColorObj(bgColor);
    this.doc.roundedRect(PAGE.margin, this.y, PAGE.contentWidth, height, 2, 2, 'FD');
  }

  // Helper: Two-column row (label left, value right)
  private addRow(label: string, value: string, options: { 
    bold?: boolean; 
    valueColor?: { r: number; g: number; b: number };
    indent?: number;
  } = {}) {
    const x = PAGE.margin + (options.indent || 0);
    this.doc.setFontSize(FONTS.body);
    this.setColor(COLORS.gray);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(label, x + 5, this.y);
    
    if (options.bold) {
      this.doc.setFont("helvetica", "bold");
    }
    this.setColor(options.valueColor || COLORS.black);
    this.doc.text(value, PAGE.margin + PAGE.contentWidth - 5, this.y, { align: 'right' });
    this.y += 6;
  }

  // Helper: Bullet point
  private addBullet(text: string, indent: number = 0) {
    this.doc.setFontSize(FONTS.body);
    this.setColor(COLORS.gray);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(`•  ${text}`, PAGE.margin + indent, this.y);
    this.y += 6;
  }

  // Helper: Check if we need a new page
  private checkPageBreak(neededHeight: number) {
    if (this.y + neededHeight > PAGE.height - PAGE.margin - 15) {
      this.newPage();
      return true;
    }
    return false;
  }

  // ================================================================
  // COVER PAGE
  // ================================================================
  private buildCoverPage(
    title: string,
    subtitle: string,
    deploymentDetails: string,
    netGain: number,
    roi: number,
    orgName?: string
  ) {
    this.addGeometricPattern(true);
    
    this.y = PAGE.height / 3;
    
    // Main title
    this.doc.setFontSize(FONTS.title);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title.toUpperCase(), PAGE.width / 2, this.y, { align: 'center' });
    this.y += 12;
    
    // Organization name
    if (orgName) {
      this.doc.setFontSize(FONTS.subtitle);
      this.setColor(COLORS.gray);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(orgName, PAGE.width / 2, this.y, { align: 'center' });
      this.y += 15;
    }
    
    // Deployment details
    this.doc.setFontSize(FONTS.sectionHeader);
    this.setColor(COLORS.gray);
    this.doc.text(subtitle, PAGE.width / 2, this.y, { align: 'center' });
    this.y += 8;
    this.doc.text(deploymentDetails, PAGE.width / 2, this.y, { align: 'center' });
    this.y += 25;
    
    // Key metrics
    this.doc.setFontSize(20);
    this.doc.setFont("helvetica", "bold");
    this.setColor(COLORS.green);
    this.doc.text(`Net Annual Gain: ${this.formatCurrency(netGain)}`, PAGE.width / 2, this.y, { align: 'center' });
    this.y += 10;
    this.setColor(COLORS.black);
    this.doc.text(`Return on Investment: ${roi.toFixed(1)}x`, PAGE.width / 2, this.y, { align: 'center' });
    
    // Footer
    this.doc.setFontSize(FONTS.body);
    this.setColor(COLORS.lightGray);
    this.doc.text(`Generated: ${this.currentDate}`, PAGE.width / 2, PAGE.height - 35, { align: 'center' });
    this.doc.text(`abridge.com/roi`, PAGE.width / 2, PAGE.height - 28, { align: 'center' });
    
    this.addFooter();
  }

  // ================================================================
  // EXECUTIVE SUMMARY PAGE
  // ================================================================
  private buildExecutiveSummary(
    inputs: RoiInputs,
    results: ReturnType<typeof calculateRoi>,
    enabledDrivers: LeverId[],
    careSettingLabel: string
  ) {
    this.newPage();
    this.addPageHeader("Executive Summary");
    
    // Model Overview
    this.addSectionHeader("Model Overview");
    
    this.doc.setFontSize(FONTS.body);
    this.setColor(COLORS.gray);
    this.doc.setFont("helvetica", "normal");
    
    const overviewText = `This model evaluates the financial impact of deploying Abridge's ambient documentation solution across ${inputs.numberOfProviders} providers in an ${careSettingLabel.toLowerCase()} setting.`;
    const overviewLines = this.doc.splitTextToSize(overviewText, PAGE.contentWidth);
    this.doc.text(overviewLines, PAGE.margin, this.y);
    this.y += overviewLines.length * 5 + 5;
    
    const driversText = `The analysis captures ${enabledDrivers.length} strategic value driver${enabledDrivers.length > 1 ? 's' : ''}: ${enabledDrivers.map(id => leverLabels[id]).join(', ')}.`;
    const driversLines = this.doc.splitTextToSize(driversText, PAGE.contentWidth);
    this.doc.text(driversLines, PAGE.margin, this.y);
    this.y += driversLines.length * 5 + 12;
    
    // Key Findings
    this.addSectionHeader("Key Findings");
    
    // Annual Financial Impact Card
    this.drawCard(50);
    this.y += 8;
    
    this.doc.setFontSize(FONTS.bodySmall);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("ANNUAL FINANCIAL IMPACT", PAGE.margin + 8, this.y);
    this.y += 8;
    
    this.addRow("Total Annual Benefit", this.formatCurrency(results.totalAnnualBenefit), { bold: true });
    this.addRow("Annual Investment", this.formatCurrency(results.annualAbridgeCost));
    this.y += 2;
    this.setDrawColorObj(COLORS.lightGray);
    this.doc.line(PAGE.margin + 8, this.y - 2, PAGE.margin + PAGE.contentWidth - 8, this.y - 2);
    this.addRow("Net Annual Gain", this.formatCurrency(results.netValueCreated), { bold: true, valueColor: COLORS.green });
    this.y += 2;
    this.addRow("Return on Investment", `${results.roiMultiple.toFixed(1)}x`, { bold: true });
    this.y += 8;
    
    // 3-Year Projection Card
    this.drawCard(40);
    this.y += 8;
    
    this.doc.setFontSize(FONTS.bodySmall);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("3-YEAR PROJECTION", PAGE.margin + 8, this.y);
    this.y += 8;
    
    const threeYearBenefit = results.totalAnnualBenefit * 3;
    const threeYearInvestment = results.annualAbridgeCost * 3;
    const threeYearNet = threeYearBenefit - threeYearInvestment;
    
    this.addRow("Total Value (3 years)", this.formatCurrency(threeYearBenefit), { bold: true });
    this.addRow("Total Investment", this.formatCurrency(threeYearInvestment));
    this.addRow("Net 3-Year Gain", this.formatCurrency(threeYearNet), { bold: true, valueColor: COLORS.green });
    this.y += 12;
    
    // Deployment Details
    this.addSectionHeader("Deployment Details");
    
    const encountersWithAbridge = Math.round(inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100));
    
    this.addRow("Care Setting", careSettingLabel);
    this.addRow("Providers in Scope", inputs.numberOfProviders.toLocaleString());
    this.addRow("Annual Encounters", inputs.annualOutpatientEncounters.toLocaleString());
    this.addRow("Expected Utilization", `${inputs.abridgeUtilizationPct}%`);
    this.addRow("Eligible Encounters", encountersWithAbridge.toLocaleString());
    this.y += 6;
    
    this.addRow("Active Value Drivers", `${enabledDrivers.length} of 6`);
    this.y += 4;
    
    enabledDrivers.forEach(id => {
      this.addBullet(`${leverLabels[id]} - ${leverDescriptions[id]}`, 5);
    });
  }

  // ================================================================
  // VALUE BREAKDOWN PAGE
  // ================================================================
  private buildValueBreakdown(
    results: ReturnType<typeof calculateRoi>,
    enabledDrivers: LeverId[],
    driverValues: Record<LeverId, number>,
    inputs: RoiInputs
  ) {
    this.newPage();
    this.addPageHeader("Value Breakdown");
    
    const encountersWithAbridge = Math.round(inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100));
    const totalHoursReclaimed = (inputs.minutesSavedPerEncounter * encountersWithAbridge) / 60;
    
    // Capacity & Labor
    const capacityDrivers = enabledDrivers.filter(id => ['patientAccess', 'workforce', 'overtime'].includes(id));
    if (capacityDrivers.length > 0) {
      this.addSectionHeader("Capacity & Labor");
      
      capacityDrivers.forEach(id => {
        this.checkPageBreak(35);
        this.drawCard(30);
        this.y += 8;
        
        this.doc.setFontSize(FONTS.pageHeader);
        this.setColor(COLORS.black);
        this.doc.setFont("helvetica", "bold");
        this.doc.text(leverLabels[id], PAGE.margin + 8, this.y);
        this.doc.text(this.formatCurrency(driverValues[id]), PAGE.margin + PAGE.contentWidth - 8, this.y, { align: 'right' });
        this.y += 7;
        
        this.doc.setFontSize(FONTS.bodySmall);
        this.setColor(COLORS.gray);
        this.doc.setFont("helvetica", "normal");
        
        let calcLine = '';
        if (id === 'patientAccess') {
          const reinvestedHours = totalHoursReclaimed * (inputs.patientAccess.pctTimeToNewVisits / 100);
          const addedVisits = Math.round(reinvestedHours / (inputs.patientAccess.avgVisitDurationMinutes / 60));
          calcLine = `${addedVisits.toLocaleString()} incremental visits × ${this.formatCurrency(inputs.patientAccess.avgNetRevenuePerVisit)}/visit`;
        } else if (id === 'workforce') {
          const departuresAvoided = (inputs.workforce.providerCount * (inputs.workforce.baselineAttritionRate / 100) * 
            (inputs.workforce.pctAttritionLinkedToBurnout / 100) * (inputs.workforce.pctBurnoutExitsAvoided / 100)).toFixed(1);
          calcLine = `${departuresAvoided} departures avoided × ${this.formatCurrency(inputs.workforce.costPerDeparture)} replacement cost`;
        } else if (id === 'overtime') {
          const afterHoursReclaimed = totalHoursReclaimed * (inputs.overtime.pctAfterHours / 100);
          const overtimeReduced = Math.round(afterHoursReclaimed * (inputs.overtime.pctOvertimeReduced / 100));
          calcLine = `${overtimeReduced.toLocaleString()} overtime hours reduced × ${this.formatCurrency(inputs.overtime.blendedOvertimeRate)}/hr`;
        }
        
        this.doc.text(calcLine, PAGE.margin + 8, this.y);
        this.y += 5;
        
        this.doc.setFont("helvetica", "italic");
        this.doc.text(leverDescriptions[id], PAGE.margin + 8, this.y);
        this.y += 12;
      });
    }
    
    // Revenue & Risk
    const revenueDrivers = enabledDrivers.filter(id => ['wrvu', 'denials', 'hcc'].includes(id));
    if (revenueDrivers.length > 0) {
      this.y += 5;
      this.addSectionHeader("Revenue & Risk");
      
      revenueDrivers.forEach(id => {
        this.checkPageBreak(35);
        this.drawCard(30);
        this.y += 8;
        
        this.doc.setFontSize(FONTS.pageHeader);
        this.setColor(COLORS.black);
        this.doc.setFont("helvetica", "bold");
        this.doc.text(leverLabels[id], PAGE.margin + 8, this.y);
        this.doc.text(this.formatCurrency(driverValues[id]), PAGE.margin + PAGE.contentWidth - 8, this.y, { align: 'right' });
        this.y += 7;
        
        this.doc.setFontSize(FONTS.bodySmall);
        this.setColor(COLORS.gray);
        this.doc.setFont("helvetica", "normal");
        
        let calcLine = '';
        if (id === 'wrvu') {
          const incrementalWrvuPerEncounter = inputs.baselineWrvuPerEncounter * (inputs.wrvu.pctIncreaseWrvuPerEncounter / 100);
          const totalIncrementalWrvus = Math.round(incrementalWrvuPerEncounter * encountersWithAbridge);
          calcLine = `${totalIncrementalWrvus.toLocaleString()} incremental wRVUs × ${this.formatCurrency(inputs.wrvu.wrvuConversionFactor)}/wRVU`;
        } else if (id === 'hcc') {
          const maPatients = Math.round((encountersWithAbridge / 2.5) * (inputs.hcc.pctMedicareAdvantage / 100));
          calcLine = `${maPatients.toLocaleString()} MA patients × RAF lift × ${this.formatCurrency(inputs.hcc.pmpmBenchmark)}/PMPM × 12 mo`;
        } else if (id === 'denials') {
          const netRevenue = encountersWithAbridge * inputs.denials.avgRevenuePerEncounter;
          const docDenialRevenue = Math.round(netRevenue * (inputs.denials.baselineDenialRate / 100) * (inputs.denials.pctDenialsFromDocumentation / 100));
          calcLine = `${this.formatCurrency(docDenialRevenue)} doc-related denials × ${inputs.denials.pctDocDenialsRecovered}% recovered`;
        }
        
        this.doc.text(calcLine, PAGE.margin + 8, this.y);
        this.y += 5;
        
        this.doc.setFont("helvetica", "italic");
        this.doc.text(leverDescriptions[id], PAGE.margin + 8, this.y);
        this.y += 12;
      });
    }
    
    // Total Summary
    this.checkPageBreak(50);
    this.y += 10;
    this.addSectionHeader("Total Annual Benefit");
    
    const capacityTotal = capacityDrivers.reduce((sum, id) => sum + driverValues[id], 0);
    const revenueTotal = revenueDrivers.reduce((sum, id) => sum + driverValues[id], 0);
    
    this.drawCard(45);
    this.y += 10;
    
    if (capacityDrivers.length > 0) {
      this.addRow("Capacity & Labor", this.formatCurrency(capacityTotal));
    }
    if (revenueDrivers.length > 0) {
      this.addRow("Revenue & Risk", this.formatCurrency(revenueTotal));
    }
    
    this.y += 2;
    this.setDrawColorObj(COLORS.lightGray);
    this.doc.line(PAGE.margin + 8, this.y - 2, PAGE.margin + PAGE.contentWidth - 8, this.y - 2);
    
    this.addRow("Total Benefit", this.formatCurrency(results.totalAnnualBenefit), { bold: true });
    this.y += 2;
    this.addRow("Annual Investment", this.formatCurrency(results.annualAbridgeCost));
    
    this.y += 2;
    this.setDrawColorObj(COLORS.black);
    this.doc.setLineWidth(0.5);
    this.doc.line(PAGE.margin + 8, this.y - 2, PAGE.margin + PAGE.contentWidth - 8, this.y - 2);
    this.doc.setLineWidth(0.3);
    
    this.addRow("Net Annual Gain", this.formatCurrency(results.netValueCreated), { bold: true, valueColor: COLORS.green });
  }

  // ================================================================
  // DETAILED CALCULATION PAGE
  // ================================================================
  private buildDetailedCalculation(
    driverId: LeverId,
    inputs: RoiInputs,
    driverValue: number
  ) {
    this.newPage();
    this.addPageHeader(`Detailed Calculation: ${leverLabels[driverId]}`);
    
    this.doc.setFontSize(FONTS.body);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("HOW WE CALCULATED THIS", PAGE.margin, this.y);
    this.y += 10;
    
    const encountersWithAbridge = Math.round(inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100));
    const totalHoursReclaimed = (inputs.minutesSavedPerEncounter * encountersWithAbridge) / 60;
    
    const addStep = (stepNum: number, title: string, rows: Array<{ label: string; value: string; isResult?: boolean }>, note?: string) => {
      this.checkPageBreak(40);
      
      this.doc.setFontSize(FONTS.body);
      this.setColor(COLORS.gray);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(`STEP ${stepNum}: ${title}`, PAGE.margin, this.y);
      this.y += 3;
      this.setDrawColorObj(COLORS.lightGray);
      this.doc.line(PAGE.margin, this.y, PAGE.margin + PAGE.contentWidth, this.y);
      this.y += 8;
      
      rows.forEach(row => {
        this.doc.setFontSize(FONTS.bodySmall);
        this.setColor(row.isResult ? COLORS.abridgeOrange : COLORS.gray);
        this.doc.setFont("helvetica", "normal");
        this.doc.text(row.label, PAGE.margin + 5, this.y);
        this.doc.setFont("helvetica", row.isResult ? "bold" : "normal");
        this.setColor(row.isResult ? COLORS.abridgeOrange : COLORS.black);
        this.doc.text(row.value, PAGE.margin + PAGE.contentWidth - 5, this.y, { align: 'right' });
        this.y += 6;
      });
      
      if (note) {
        this.y += 2;
        this.doc.setFontSize(FONTS.caption);
        this.setColor(COLORS.lightGray);
        this.doc.setFont("helvetica", "italic");
        const noteLines = this.doc.splitTextToSize(note, PAGE.contentWidth - 10);
        this.doc.text(noteLines, PAGE.margin + 5, this.y);
        this.y += noteLines.length * 4;
      }
      
      this.y += 8;
    };
    
    // Driver-specific calculations
    if (driverId === 'patientAccess') {
      const minutesSaved = inputs.minutesSavedPerEncounter;
      const totalMinutes = minutesSaved * encountersWithAbridge;
      const hoursReturned = totalMinutes / 60;
      const realizationPct = inputs.patientAccess.pctTimeToNewVisits;
      const usableHours = hoursReturned * (realizationPct / 100);
      const visitDuration = inputs.patientAccess.avgVisitDurationMinutes;
      const additionalVisits = Math.round(usableHours * 60 / visitDuration);
      const revenuePerVisit = inputs.patientAccess.avgNetRevenuePerVisit;
      
      addStep(1, "TIME RETURNED", [
        { label: "Minutes saved per encounter", value: `${minutesSaved} min` },
        { label: "Annual Abridge-documented encounters", value: encountersWithAbridge.toLocaleString() },
        { label: "Total hours returned", value: `${Math.round(hoursReturned).toLocaleString()} hrs`, isResult: true },
      ], `Formula: (${minutesSaved} min × ${encountersWithAbridge.toLocaleString()} encounters) ÷ 60`);
      
      addStep(2, "REALIZED CAPACITY", [
        { label: "Total hours returned", value: `${Math.round(hoursReturned).toLocaleString()} hrs` },
        { label: "Capacity realization factor", value: `${realizationPct}%` },
        { label: "Usable hours", value: `${Math.round(usableHours).toLocaleString()} hrs`, isResult: true },
      ], "Not all time converts to new visits due to scheduling, staffing constraints, and patient demand.");
      
      addStep(3, "NEW VISIT CAPACITY", [
        { label: "Usable hours (in minutes)", value: `${Math.round(usableHours * 60).toLocaleString()} min` },
        { label: "Average visit duration", value: `${visitDuration} min` },
        { label: "Additional visits possible", value: `${additionalVisits.toLocaleString()} visits`, isResult: true },
      ]);
      
      addStep(4, "REVENUE IMPACT", [
        { label: "Additional visits", value: additionalVisits.toLocaleString() },
        { label: "Revenue per visit", value: this.formatCurrency(revenuePerVisit) },
        { label: "Annual value", value: this.formatCurrency(driverValue), isResult: true },
      ]);
      
    } else if (driverId === 'workforce') {
      const providers = inputs.workforce.providerCount;
      const turnoverRate = inputs.workforce.baselineAttritionRate;
      const expectedDepartures = providers * (turnoverRate / 100);
      const burnoutAttribution = inputs.workforce.pctAttritionLinkedToBurnout;
      const burnoutDepartures = expectedDepartures * (burnoutAttribution / 100);
      const abridgePrevention = inputs.workforce.pctBurnoutExitsAvoided;
      const departuresAvoided = burnoutDepartures * (abridgePrevention / 100);
      const costPerDeparture = inputs.workforce.costPerDeparture;
      
      addStep(1, "BASELINE TURNOVER", [
        { label: "Providers in scope", value: providers.toString() },
        { label: "Baseline attrition rate", value: `${turnoverRate}%` },
        { label: "Expected departures/year", value: expectedDepartures.toFixed(1), isResult: true },
      ]);
      
      addStep(2, "BURNOUT-RELATED DEPARTURES", [
        { label: "Expected departures", value: expectedDepartures.toFixed(1) },
        { label: "% attributed to burnout", value: `${burnoutAttribution}%` },
        { label: "Burnout-driven departures", value: burnoutDepartures.toFixed(2), isResult: true },
      ], "Per JAMA physician workforce studies, documentation burden is a major burnout driver.");
      
      addStep(3, "ABRIDGE IMPACT", [
        { label: "Burnout departures", value: burnoutDepartures.toFixed(2) },
        { label: "% preventable with Abridge", value: `${abridgePrevention}%` },
        { label: "Departures avoided", value: departuresAvoided.toFixed(2), isResult: true },
      ]);
      
      addStep(4, "COST SAVINGS", [
        { label: "Departures avoided", value: departuresAvoided.toFixed(2) },
        { label: "Replacement cost per provider", value: this.formatCurrency(costPerDeparture) },
        { label: "Annual savings", value: this.formatCurrency(driverValue), isResult: true },
      ]);
      
    } else if (driverId === 'wrvu') {
      const baselineWrvu = inputs.baselineWrvuPerEncounter;
      const improvementPct = inputs.wrvu.pctIncreaseWrvuPerEncounter;
      const postWrvu = baselineWrvu * (1 + improvementPct / 100);
      const incrementalWrvu = postWrvu - baselineWrvu;
      const totalIncrementalWrvus = incrementalWrvu * encountersWithAbridge;
      const revenuePerWrvu = inputs.wrvu.wrvuConversionFactor;
      
      addStep(1, "BASELINE PERFORMANCE", [
        { label: "Abridge-documented encounters", value: encountersWithAbridge.toLocaleString() },
        { label: "Baseline wRVU per encounter", value: baselineWrvu.toFixed(2) },
        { label: "Current annual wRVUs", value: Math.round(baselineWrvu * encountersWithAbridge).toLocaleString(), isResult: true },
      ]);
      
      addStep(2, "DOCUMENTATION QUALITY LIFT", [
        { label: "Expected improvement", value: `${improvementPct}%` },
        { label: "Post-Abridge wRVU/encounter", value: postWrvu.toFixed(2), isResult: true },
      ], "Abridge captures clinical complexity that may be under-documented in real-time.");
      
      addStep(3, "ADDITIONAL wRVUs CAPTURED", [
        { label: "Incremental wRVU per encounter", value: incrementalWrvu.toFixed(3) },
        { label: "Eligible encounters", value: encountersWithAbridge.toLocaleString() },
        { label: "Total additional wRVUs", value: Math.round(totalIncrementalWrvus).toLocaleString(), isResult: true },
      ]);
      
      addStep(4, "REVENUE IMPACT", [
        { label: "Additional wRVUs", value: Math.round(totalIncrementalWrvus).toLocaleString() },
        { label: "Revenue per wRVU", value: this.formatCurrency(revenuePerWrvu) },
        { label: "Annual value", value: this.formatCurrency(driverValue), isResult: true },
      ]);
      
    } else if (driverId === 'hcc') {
      const uniquePatients = Math.round(encountersWithAbridge / 2.5);
      const maPct = inputs.hcc.pctMedicareAdvantage;
      const maPatients = Math.round(uniquePatients * (maPct / 100));
      const conditionsPerMember = inputs.hcc.avgConditionsPerMember;
      const totalConditions = maPatients * conditionsPerMember;
      const missedPct = inputs.hcc.pctConditionsMissed;
      const missedConditions = totalConditions * (missedPct / 100);
      const recapturePct = inputs.hcc.pctMissedConditionsRecaptured;
      const recaptured = missedConditions * (recapturePct / 100);
      const newPct = inputs.hcc.pctNewConditionsIdentified;
      const newConditions = totalConditions * (newPct / 100);
      const pmpm = inputs.hcc.pmpmBenchmark;
      
      addStep(1, "DERIVE MA POPULATION", [
        { label: "Eligible encounters", value: encountersWithAbridge.toLocaleString() },
        { label: "Encounters per patient (avg)", value: "2.5" },
        { label: "Unique patients", value: uniquePatients.toLocaleString() },
        { label: "% Medicare Advantage", value: `${maPct}%` },
        { label: "Impacted MA patients", value: maPatients.toLocaleString(), isResult: true },
      ]);
      
      addStep(2, "DIAGNOSTIC GAP", [
        { label: "MA patients", value: maPatients.toLocaleString() },
        { label: "Avg conditions per member", value: conditionsPerMember.toString() },
        { label: "Total conditions", value: Math.round(totalConditions).toLocaleString() },
        { label: "% conditions missed", value: `${missedPct}%` },
        { label: "Conditions not documented", value: Math.round(missedConditions).toLocaleString(), isResult: true },
      ]);
      
      addStep(3, "ABRIDGE RECAPTURE", [
        { label: "Missed conditions", value: Math.round(missedConditions).toLocaleString() },
        { label: "% recaptured by Abridge", value: `${recapturePct}%` },
        { label: "Recaptured conditions", value: Math.round(recaptured).toLocaleString() },
        { label: "New conditions identified", value: Math.round(newConditions).toLocaleString() },
        { label: "Total conditions improved", value: Math.round(recaptured + newConditions).toLocaleString(), isResult: true },
      ]);
      
      addStep(4, "REVENUE IMPACT", [
        { label: "PMPM benchmark", value: this.formatCurrency(pmpm) },
        { label: "Annual value", value: this.formatCurrency(driverValue), isResult: true },
      ]);
      
    } else if (driverId === 'denials') {
      const avgRevenue = inputs.denials.avgRevenuePerEncounter;
      const totalRevenue = encountersWithAbridge * avgRevenue;
      const denialRate = inputs.denials.baselineDenialRate;
      const deniedAmount = totalRevenue * (denialRate / 100);
      const docPct = inputs.denials.pctDenialsFromDocumentation;
      const docDenials = deniedAmount * (docPct / 100);
      const preventPct = inputs.denials.pctDocDenialsRecovered;
      
      addStep(1, "REVENUE AT RISK", [
        { label: "Eligible encounters", value: encountersWithAbridge.toLocaleString() },
        { label: "Avg revenue per encounter", value: this.formatCurrency(avgRevenue) },
        { label: "Total collectible revenue", value: this.formatCurrency(totalRevenue), isResult: true },
      ]);
      
      addStep(2, "BASELINE DENIALS", [
        { label: "Collectible revenue", value: this.formatCurrency(totalRevenue) },
        { label: "Baseline denial rate", value: `${denialRate}%` },
        { label: "Total denied revenue", value: this.formatCurrency(deniedAmount), isResult: true },
      ]);
      
      addStep(3, "DOCUMENTATION-RELATED DENIALS", [
        { label: "Total denied revenue", value: this.formatCurrency(deniedAmount) },
        { label: "% from documentation gaps", value: `${docPct}%` },
        { label: "Doc-related denials", value: this.formatCurrency(docDenials), isResult: true },
      ]);
      
      addStep(4, "ABRIDGE RECOVERY", [
        { label: "Doc-related denials", value: this.formatCurrency(docDenials) },
        { label: "% recovered with Abridge", value: `${preventPct}%` },
        { label: "Annual value recovered", value: this.formatCurrency(driverValue), isResult: true },
      ]);
      
    } else if (driverId === 'overtime') {
      const afterHoursPct = inputs.overtime.pctAfterHours;
      const afterHoursReclaimed = totalHoursReclaimed * (afterHoursPct / 100);
      const overtimePct = inputs.overtime.pctOvertimeReduced;
      const overtimeReduced = afterHoursReclaimed * (overtimePct / 100);
      const rate = inputs.overtime.blendedOvertimeRate;
      
      addStep(1, "TIME RETURNED", [
        { label: "Total hours reclaimed", value: `${Math.round(totalHoursReclaimed).toLocaleString()} hrs` },
        { label: "% occurring after-hours", value: `${afterHoursPct}%` },
        { label: "After-hours time reclaimed", value: `${Math.round(afterHoursReclaimed).toLocaleString()} hrs`, isResult: true },
      ]);
      
      addStep(2, "OVERTIME REDUCTION", [
        { label: "After-hours reclaimed", value: `${Math.round(afterHoursReclaimed).toLocaleString()} hrs` },
        { label: "% converted to OT reduction", value: `${overtimePct}%` },
        { label: "Overtime hours reduced", value: `${Math.round(overtimeReduced).toLocaleString()} hrs`, isResult: true },
      ]);
      
      addStep(3, "COST SAVINGS", [
        { label: "Overtime hours reduced", value: `${Math.round(overtimeReduced).toLocaleString()} hrs` },
        { label: "Blended overtime rate", value: this.formatCurrency(rate) + "/hr" },
        { label: "Annual savings", value: this.formatCurrency(driverValue), isResult: true },
      ]);
    }
    
    // Important Assumptions Box
    this.checkPageBreak(40);
    this.y += 5;
    this.setFillColorObj(COLORS.warningBg);
    this.setDrawColorObj({ r: 251, g: 191, b: 36 });
    this.doc.roundedRect(PAGE.margin, this.y, PAGE.contentWidth, 30, 2, 2, 'FD');
    this.y += 8;
    
    this.doc.setFontSize(FONTS.bodySmall);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("IMPORTANT ASSUMPTIONS", PAGE.margin + 8, this.y);
    this.y += 6;
    
    this.doc.setFont("helvetica", "normal");
    this.setColor(COLORS.gray);
    this.doc.setFontSize(FONTS.caption);
    
    const assumptions = this.getDriverAssumptions(driverId);
    assumptions.forEach(assumption => {
      this.doc.text(`•  ${assumption}`, PAGE.margin + 8, this.y);
      this.y += 4;
    });
  }
  
  private getDriverAssumptions(driverId: LeverId): string[] {
    switch (driverId) {
      case 'patientAccess':
        return [
          "Assumes sufficient patient demand to fill new capacity",
          "Revenue per visit based on net collectible amount",
          "Realization factor accounts for real-world constraints",
        ];
      case 'workforce':
        return [
          "Turnover rate typical for outpatient providers",
          "Burnout attribution per JAMA physician workforce studies",
          "Replacement cost includes recruiting, onboarding, coverage",
        ];
      case 'wrvu':
        return [
          "Baseline wRVU reflects current documentation practices",
          "Improvement rate based on Abridge customer data",
          "Revenue per wRVU is blended average across specialties",
        ];
      case 'hcc':
        return [
          "MA population derived from encounter volume",
          "Recapture rate based on Abridge AI suggestions",
          "RAF gains subject to 12+ month realization period",
        ];
      case 'denials':
        return [
          "Denial rate typical for outpatient settings",
          "Documentation-related denials are preventable",
          "Recovery assumes timely appeal with better documentation",
        ];
      case 'overtime':
        return [
          "After-hours work driven by documentation burden",
          "Overtime rate is blended average across roles",
          "Reduction assumes sustained Abridge adoption",
        ];
      default:
        return [];
    }
  }

  // ================================================================
  // METHODOLOGY PAGE
  // ================================================================
  private buildMethodology(inputs: RoiInputs, careSettingLabel: string) {
    this.newPage();
    this.addPageHeader("Assumptions & Methodology");
    
    const encountersWithAbridge = Math.round(inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100));
    
    // Deployment Assumptions
    this.addSectionHeader("Deployment Assumptions");
    this.addBullet(`${inputs.numberOfProviders} providers deployed across ${careSettingLabel.toLowerCase()} setting`);
    this.addBullet(`${inputs.annualOutpatientEncounters.toLocaleString()} total annual encounters`);
    this.addBullet(`${inputs.abridgeUtilizationPct}% utilization rate (${encountersWithAbridge.toLocaleString()} eligible encounters)`);
    this.addBullet(`Typical posture selected (median performance benchmarks)`);
    this.y += 8;
    
    // Financial Parameters
    this.addSectionHeader("Financial Parameters");
    this.addBullet(`Revenue per visit: ${this.formatCurrency(inputs.patientAccess.avgNetRevenuePerVisit)} (net collectible)`);
    this.addBullet(`Revenue per wRVU: ${this.formatCurrency(inputs.wrvu.wrvuConversionFactor)} (blended rate)`);
    this.addBullet(`Provider replacement cost: ${this.formatCurrency(inputs.workforce.costPerDeparture)}`);
    this.addBullet(`Cost per provider/month: ${this.formatCurrency(inputs.monthlyCostPerProvider)}`);
    this.y += 8;
    
    // Value Posture
    this.addSectionHeader("Value Posture");
    this.doc.setFontSize(FONTS.body);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Typical (Recommended)", PAGE.margin, this.y);
    this.y += 8;
    
    this.doc.setFont("helvetica", "normal");
    this.setColor(COLORS.gray);
    const postureText = "This posture uses median performance benchmarks from 200+ health system partners. Conservative and Aggressive postures are available for sensitivity analysis.";
    const postureLines = this.doc.splitTextToSize(postureText, PAGE.contentWidth);
    this.doc.text(postureLines, PAGE.margin, this.y);
    this.y += postureLines.length * 5 + 10;
    
    // Data Sources
    this.addSectionHeader("Data Sources");
    this.addBullet("Encounter volume: Organization-provided");
    this.addBullet("Benchmark data: Abridge customer base (200+ partners)");
    this.addBullet("Financial parameters: Organization-specific or typical industry averages");
    this.y += 8;
    
    // Important Limitations
    this.addSectionHeader("Important Limitations");
    
    this.doc.setFontSize(FONTS.body);
    this.setColor(COLORS.gray);
    this.doc.setFont("helvetica", "normal");
    const limitText = "This model provides estimates based on typical performance and your organization's inputs. Actual results may vary based on:";
    const limitLines = this.doc.splitTextToSize(limitText, PAGE.contentWidth);
    this.doc.text(limitLines, PAGE.margin, this.y);
    this.y += limitLines.length * 5 + 4;
    
    this.addBullet("Adoption rates and user engagement");
    this.addBullet("Payer mix and contracted rates");
    this.addBullet("Available patient demand (for capacity drivers)");
    this.addBullet("Organization-specific workflows and constraints");
    this.y += 6;
    
    const noteText = "Long-term value drivers (retention, HCC capture) require 12+ months to fully materialize.";
    const noteLines = this.doc.splitTextToSize(noteText, PAGE.contentWidth);
    this.doc.setFont("helvetica", "italic");
    this.doc.text(noteLines, PAGE.margin, this.y);
  }

  // ================================================================
  // SCENARIO COMPARISON PAGE
  // ================================================================
  private buildScenarioComparison(
    baseline: { inputs: RoiInputs; results: ReturnType<typeof calculateRoi> },
    scenarios: ScenarioData[],
    careSettingLabel: string
  ) {
    this.newPage();
    this.addPageHeader("Scenario Comparison");
    
    this.addSectionHeader("Side-by-Side Analysis");
    
    // Table header
    const colWidth = PAGE.contentWidth / (scenarios.length + 2);
    let x = PAGE.margin;
    
    this.doc.setFontSize(FONTS.bodySmall);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    
    this.doc.text("Metric", x, this.y);
    x += colWidth;
    this.doc.text("Baseline", x, this.y);
    x += colWidth;
    scenarios.forEach(s => {
      const name = s.name.length > 15 ? s.name.substring(0, 12) + '...' : s.name;
      this.doc.text(name, x, this.y);
      x += colWidth;
    });
    this.y += 3;
    
    this.setDrawColorObj(COLORS.black);
    this.doc.line(PAGE.margin, this.y, PAGE.margin + PAGE.contentWidth, this.y);
    this.y += 6;
    
    // Comparison rows
    const metrics = [
      { label: "Providers", getValue: (r: ReturnType<typeof calculateRoi>, i: RoiInputs) => i.numberOfProviders.toLocaleString() },
      { label: "Annual Encounters", getValue: (r: ReturnType<typeof calculateRoi>, i: RoiInputs) => i.annualOutpatientEncounters.toLocaleString() },
      { label: "Total Benefit", getValue: (r: ReturnType<typeof calculateRoi>, i: RoiInputs) => this.formatCurrency(r.totalAnnualBenefit) },
      { label: "Investment", getValue: (r: ReturnType<typeof calculateRoi>, i: RoiInputs) => this.formatCurrency(r.annualAbridgeCost) },
      { label: "Net Annual Gain", getValue: (r: ReturnType<typeof calculateRoi>, i: RoiInputs) => this.formatCurrency(r.netValueCreated), isGreen: true },
      { label: "ROI Multiple", getValue: (r: ReturnType<typeof calculateRoi>, i: RoiInputs) => `${r.roiMultiple.toFixed(1)}x` },
    ];
    
    metrics.forEach(metric => {
      x = PAGE.margin;
      this.doc.setFont("helvetica", "normal");
      this.setColor(COLORS.gray);
      this.doc.text(metric.label, x, this.y);
      x += colWidth;
      
      this.setColor(metric.isGreen ? COLORS.green : COLORS.black);
      this.doc.setFont("helvetica", "bold");
      this.doc.text(metric.getValue(baseline.results, baseline.inputs), x, this.y);
      x += colWidth;
      
      scenarios.forEach(s => {
        this.doc.text(metric.getValue(s.results, s.inputs), x, this.y);
        x += colWidth;
      });
      
      this.y += 6;
    });
    
    this.y += 10;
    
    // Delta from baseline
    this.addSectionHeader("Change from Baseline");
    
    scenarios.forEach(scenario => {
      this.checkPageBreak(30);
      
      this.doc.setFontSize(FONTS.body);
      this.setColor(COLORS.black);
      this.doc.setFont("helvetica", "bold");
      this.doc.text(scenario.name, PAGE.margin, this.y);
      this.y += 6;
      
      const netDelta = scenario.results.netValueCreated - baseline.results.netValueCreated;
      const pctChange = baseline.results.netValueCreated > 0 
        ? ((netDelta / baseline.results.netValueCreated) * 100).toFixed(0)
        : 'N/A';
      
      this.doc.setFont("helvetica", "normal");
      this.setColor(COLORS.gray);
      this.doc.setFontSize(FONTS.bodySmall);
      this.doc.text(`Net Gain Delta: `, PAGE.margin + 5, this.y);
      this.setColor(netDelta >= 0 ? COLORS.green : { r: 220, g: 38, b: 38 });
      this.doc.setFont("helvetica", "bold");
      this.doc.text(`${netDelta >= 0 ? '+' : ''}${this.formatCurrency(netDelta)} (${pctChange}%)`, PAGE.margin + 45, this.y);
      this.y += 10;
    });
  }

  // ================================================================
  // PUBLIC METHODS
  // ================================================================

  /**
   * Generate Baseline Model PDF (7 pages)
   */
  public generateBaselineExport(
    inputs: RoiInputs,
    results: ReturnType<typeof calculateRoi>,
    enabledDrivers: LeverId[],
    driverValues: Record<LeverId, number>,
    careSettingLabel: string,
    options: ExportOptions
  ): void {
    const title = options.documentTitle || "ABRIDGE ROI MODEL";
    const deploymentDetails = `${inputs.numberOfProviders} Providers | ${inputs.annualOutpatientEncounters.toLocaleString()} Encounters`;
    
    // Page 1: Cover
    this.buildCoverPage(
      title,
      `${careSettingLabel} Deployment`,
      deploymentDetails,
      results.netValueCreated,
      results.roiMultiple,
      options.organizationName
    );
    
    // Page 2: Executive Summary
    if (options.includeSections.executiveSummary) {
      this.buildExecutiveSummary(inputs, results, enabledDrivers, careSettingLabel);
    }
    
    // Page 3: Value Breakdown
    if (options.includeSections.valueBreakdown) {
      this.buildValueBreakdown(results, enabledDrivers, driverValues, inputs);
    }
    
    // Pages 4-6: Detailed Calculations
    if (options.includeSections.detailedCalculations) {
      enabledDrivers.forEach(driverId => {
        this.buildDetailedCalculation(driverId, inputs, driverValues[driverId]);
      });
    }
    
    // Page 7: Methodology
    if (options.includeSections.methodology) {
      this.buildMethodology(inputs, careSettingLabel);
    }
    
    this.addFooter();
    
    // Generate filename
    const orgSlug = options.organizationName 
      ? options.organizationName.replace(/\s+/g, '_').substring(0, 20)
      : 'Model';
    const dateSlug = this.currentDate.replace(/,?\s+/g, '_');
    const fileName = `Abridge_ROI_Model_${orgSlug}_${dateSlug}.pdf`;
    
    this.doc.save(fileName);
  }

  /**
   * Generate Single Scenario PDF (8-9 pages)
   */
  public generateScenarioExport(
    baselineInputs: RoiInputs,
    baselineResults: ReturnType<typeof calculateRoi>,
    scenario: ScenarioData,
    enabledDrivers: LeverId[],
    driverValues: Record<LeverId, number>,
    careSettingLabel: string,
    options: ExportOptions
  ): void {
    const combinedNetGain = baselineResults.netValueCreated + scenario.results.netValueCreated;
    const combinedInvestment = baselineResults.annualAbridgeCost + scenario.results.annualAbridgeCost;
    const combinedRoi = combinedInvestment > 0 ? (combinedNetGain + combinedInvestment) / combinedInvestment : 0;
    const pctVsBaseline = baselineResults.netValueCreated > 0
      ? ((combinedNetGain - baselineResults.netValueCreated) / baselineResults.netValueCreated * 100).toFixed(0)
      : 'N/A';
    
    const title = "ABRIDGE ROI MODEL - SCENARIO ANALYSIS";
    const deploymentDetails = `Combined: ${baselineInputs.numberOfProviders + scenario.inputs.numberOfProviders} Providers`;
    
    // Page 1: Cover with scenario info
    this.buildCoverPage(
      scenario.name,
      title,
      deploymentDetails + ` (+${pctVsBaseline}% vs baseline)`,
      combinedNetGain,
      combinedRoi,
      options.organizationName
    );
    
    // Page 2: Scenario Summary with comparison
    this.newPage();
    this.addPageHeader("Scenario Summary");
    
    this.addSectionHeader("Scenario Overview");
    this.doc.setFontSize(FONTS.body);
    this.setColor(COLORS.gray);
    const overviewLines = this.doc.splitTextToSize(scenario.description, PAGE.contentWidth);
    this.doc.text(overviewLines, PAGE.margin, this.y);
    this.y += overviewLines.length * 5 + 12;
    
    // Comparison table
    this.addSectionHeader("Comparison to Baseline");
    
    this.drawCard(70);
    this.y += 10;
    
    const col1 = PAGE.margin + 10;
    const col2 = PAGE.margin + PAGE.contentWidth * 0.4;
    const col3 = PAGE.margin + PAGE.contentWidth * 0.7;
    
    this.doc.setFontSize(FONTS.bodySmall);
    this.setColor(COLORS.black);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("", col1, this.y);
    this.doc.text("BASELINE", col2, this.y);
    this.doc.text("THIS SCENARIO", col3, this.y);
    this.y += 8;
    
    const compRows = [
      { label: "Providers", baseline: baselineInputs.numberOfProviders.toLocaleString(), scenario: (baselineInputs.numberOfProviders + scenario.inputs.numberOfProviders).toLocaleString() },
      { label: "Encounters", baseline: baselineInputs.annualOutpatientEncounters.toLocaleString(), scenario: (baselineInputs.annualOutpatientEncounters + scenario.inputs.annualOutpatientEncounters).toLocaleString() },
      { label: "Total Benefit", baseline: this.formatCurrency(baselineResults.totalAnnualBenefit), scenario: this.formatCurrency(baselineResults.totalAnnualBenefit + scenario.results.totalAnnualBenefit) },
      { label: "Investment", baseline: this.formatCurrency(baselineResults.annualAbridgeCost), scenario: this.formatCurrency(combinedInvestment) },
      { label: "Net Annual Gain", baseline: this.formatCurrency(baselineResults.netValueCreated), scenario: this.formatCurrency(combinedNetGain), isGreen: true },
      { label: "ROI", baseline: `${baselineResults.roiMultiple.toFixed(1)}x`, scenario: `${combinedRoi.toFixed(1)}x` },
    ];
    
    compRows.forEach(row => {
      this.doc.setFont("helvetica", "normal");
      this.setColor(COLORS.gray);
      this.doc.text(row.label, col1, this.y);
      this.setColor(row.isGreen ? COLORS.green : COLORS.black);
      this.doc.setFont("helvetica", row.isGreen ? "bold" : "normal");
      this.doc.text(row.baseline, col2, this.y);
      this.doc.text(row.scenario, col3, this.y);
      this.y += 6;
    });
    
    this.y += 4;
    this.doc.setFont("helvetica", "bold");
    this.setColor(COLORS.green);
    this.doc.text("CHANGE", col1, this.y);
    this.doc.text(`+${pctVsBaseline}%`, col3, this.y);
    
    // Continue with remaining pages as needed
    if (options.includeSections.valueBreakdown) {
      this.buildValueBreakdown(
        { ...baselineResults, totalAnnualBenefit: baselineResults.totalAnnualBenefit + scenario.results.totalAnnualBenefit },
        enabledDrivers,
        driverValues,
        baselineInputs
      );
    }
    
    if (options.includeSections.methodology) {
      this.buildMethodology(baselineInputs, careSettingLabel);
    }
    
    this.addFooter();
    
    const orgSlug = options.organizationName 
      ? options.organizationName.replace(/\s+/g, '_').substring(0, 20)
      : 'Scenario';
    const scenarioSlug = scenario.name.replace(/\s+/g, '_').substring(0, 20);
    const dateSlug = this.currentDate.replace(/,?\s+/g, '_');
    const fileName = `Abridge_ROI_${scenarioSlug}_${orgSlug}_${dateSlug}.pdf`;
    
    this.doc.save(fileName);
  }

  /**
   * Generate Scenario Comparison PDF (10-12 pages)
   */
  public generateComparisonExport(
    baselineInputs: RoiInputs,
    baselineResults: ReturnType<typeof calculateRoi>,
    scenarios: ScenarioData[],
    enabledDrivers: LeverId[],
    driverValues: Record<LeverId, number>,
    careSettingLabel: string,
    options: ExportOptions
  ): void {
    const title = "ABRIDGE ROI SCENARIO COMPARISON";
    
    // Page 1: Cover
    this.buildCoverPage(
      title,
      `Evaluating ${scenarios.length} Expansion Options`,
      `${careSettingLabel} Base Deployment`,
      baselineResults.netValueCreated,
      baselineResults.roiMultiple,
      options.organizationName
    );
    
    // Page 2: Executive Summary with comparison table
    if (options.includeSections.executiveSummary) {
      this.buildExecutiveSummary(baselineInputs, baselineResults, enabledDrivers, careSettingLabel);
    }
    
    // Page 3: Scenario Comparison
    this.buildScenarioComparison(
      { inputs: baselineInputs, results: baselineResults },
      scenarios,
      careSettingLabel
    );
    
    // Pages 4+: Individual scenario details
    scenarios.forEach((scenario, index) => {
      this.newPage();
      this.addPageHeader(`Scenario ${index + 1}: ${scenario.name}`);
      
      this.doc.setFontSize(FONTS.body);
      this.setColor(COLORS.gray);
      const descLines = this.doc.splitTextToSize(scenario.description, PAGE.contentWidth);
      this.doc.text(descLines, PAGE.margin, this.y);
      this.y += descLines.length * 5 + 10;
      
      this.addSectionHeader("Financial Summary");
      
      this.drawCard(40);
      this.y += 8;
      
      this.addRow("Total Benefit", this.formatCurrency(scenario.results.totalAnnualBenefit), { bold: true });
      this.addRow("Investment", this.formatCurrency(scenario.results.annualAbridgeCost));
      this.addRow("Net Annual Gain", this.formatCurrency(scenario.results.netValueCreated), { bold: true, valueColor: COLORS.green });
      this.addRow("ROI Multiple", `${scenario.results.roiMultiple.toFixed(1)}x`, { bold: true });
    });
    
    if (options.includeSections.methodology) {
      this.buildMethodology(baselineInputs, careSettingLabel);
    }
    
    this.addFooter();
    
    const orgSlug = options.organizationName 
      ? options.organizationName.replace(/\s+/g, '_').substring(0, 20)
      : 'Comparison';
    const dateSlug = this.currentDate.replace(/,?\s+/g, '_');
    const fileName = `Abridge_ROI_Comparison_${orgSlug}_${dateSlug}.pdf`;
    
    this.doc.save(fileName);
  }
}

// Export factory function
export function createPdfGenerator(): PdfGenerator {
  return new PdfGenerator();
}

// ================================================================
// SIMPLE SUMMARY PDF EXPORT
// ================================================================

export interface SummaryPDFData {
  setting: string;
  unitName: string;
  unitNamePlural: string;
  providers: number;
  encounters: number;
  utilizationRate: number;
  totalValue: number;
  annualInvestment: number;
  netGain: number;
  roi: number;
  costPerUnit: number;
  valueBreakdown: { name: string; value: number; category: 'labor' | 'revenue' }[];
  laborValue: number;
  revenueValue: number;
  laborPercent: number;
  revenuePercent: number;
  year1: number;
  year2: number;
  year3: number;
  threeYearNet: number;
}

const formatCurrencyPdf = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    const k = Math.round(value / 1000);
    if (k >= 1000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${k.toLocaleString()}K`;
  }
  return `$${value.toLocaleString()}`;
};

export function generateSummaryPDF(data: SummaryPDFData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let currentPage = 0;
  const totalPages = 5;

  const colors = {
    abridgeRed: [234, 44, 0] as [number, number, number],
    darkGray: [17, 24, 39] as [number, number, number],
    mediumGray: [107, 114, 128] as [number, number, number],
    lightGray: [243, 244, 246] as [number, number, number],
    green: [16, 185, 129] as [number, number, number],
    greenLight: [236, 253, 245] as [number, number, number],
    blue: [59, 130, 246] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  const addLogo = (x = margin, y = margin) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.abridgeRed);
    doc.text('ABRIDGE', x, y + 4);
  };

  const addPageNumber = () => {
    currentPage++;
    doc.setFontSize(9);
    doc.setTextColor(...colors.mediumGray);
    doc.text(`${currentPage} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const setTitle = (text: string, y = 40) => {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.darkGray);
    doc.text(text, margin, y);
    doc.setDrawColor(...colors.abridgeRed);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 2, margin + 50, y + 2);
  };

  const drawBox = (x: number, y: number, width: number, height: number, fillColor: [number, number, number]) => {
    doc.setFillColor(...fillColor);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');
  };

  // ============================================
  // PAGE 1: COVER
  // ============================================
  addLogo();

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('AMBIENT AI', pageWidth / 2, 70, { align: 'center' });
  doc.text('ROI MODEL', pageWidth / 2, 82, { align: 'center' });

  doc.setDrawColor(...colors.abridgeRed);
  doc.setLineWidth(2);
  doc.line(60, 88, 150, 88);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  
  const details = [
    `${data.setting} Care Setting`,
    `${data.providers} ${data.unitNamePlural}`,
  ];
  
  let detailY = 105;
  details.forEach((detail) => {
    doc.text(detail, pageWidth / 2, detailY, { align: 'center' });
    detailY += 8;
  });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('NET ANNUAL GAIN', pageWidth / 2, 145, { align: 'center' });

  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.green);
  doc.text(`+${formatCurrencyPdf(data.netGain)}`, pageWidth / 2, 162, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text(`${data.roi.toFixed(1)}x Return on Investment`, pageWidth / 2, 178, { align: 'center' });

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFontSize(9);
  doc.setTextColor(...colors.mediumGray);
  doc.text(`Generated: ${today}`, pageWidth / 2, 270, { align: 'center' });

  // ============================================
  // PAGE 2: EXECUTIVE SUMMARY
  // ============================================
  doc.addPage();
  addLogo();
  setTitle('EXECUTIVE SUMMARY', 40);
  addPageNumber();

  let y = 55;

  drawBox(margin, y, contentWidth, 50, colors.lightGray);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('AT A GLANCE', margin + 5, y + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);

  const summaryItems = [
    { label: 'Total Annual Value', value: formatCurrencyPdf(data.totalValue), color: colors.green },
    { label: 'Annual Investment', value: formatCurrencyPdf(data.annualInvestment), color: colors.darkGray },
    { label: 'Net Annual Gain', value: `+${formatCurrencyPdf(data.netGain)}`, color: colors.green },
    { label: 'Return on Investment', value: `${data.roi.toFixed(1)}x`, color: colors.abridgeRed },
  ];

  const colWidth = contentWidth / 4;
  summaryItems.forEach((item, i) => {
    const colX = margin + i * colWidth + 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.mediumGray);
    doc.text(item.label, colX, y + 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...item.color);
    doc.text(item.value, colX, y + 30);
    doc.setFontSize(10);
  });

  y += 60;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('KEY FINDINGS', margin, y);
  y += 8;

  const findings = [
    `This ${data.setting} deployment with ${data.providers} ${data.unitNamePlural} is projected to generate ${formatCurrencyPdf(data.totalValue)} in annual value.`,
    `At an investment of ${formatCurrencyPdf(data.annualInvestment)}, the organization will realize a net gain of ${formatCurrencyPdf(data.netGain)} per year.`,
    `The ${data.roi.toFixed(1)}x ROI means every dollar invested returns $${data.roi.toFixed(2)} in value.`,
    `Over 3 years, the projected net benefit is ${formatCurrencyPdf(data.threeYearNet)}.`,
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);

  findings.forEach((finding) => {
    const lines = doc.splitTextToSize(`- ${finding}`, contentWidth - 10);
    doc.text(lines, margin + 5, y);
    y += lines.length * 5 + 3;
  });

  // ============================================
  // PAGE 3: VALUE BREAKDOWN
  // ============================================
  doc.addPage();
  addLogo();
  setTitle('VALUE BREAKDOWN', 40);
  addPageNumber();

  y = 55;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Where your ROI comes from', margin, y);
  y += 12;

  const laborDrivers = data.valueBreakdown.filter((d) => d.category === 'labor');
  const revenueDrivers = data.valueBreakdown.filter((d) => d.category === 'revenue');

  // Labor & Efficiency Card
  const laborCardHeight = 25 + laborDrivers.length * 8;
  drawBox(margin, y, contentWidth / 2 - 5, laborCardHeight, colors.lightGray);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('LABOR & EFFICIENCY', margin + 5, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text(`${data.laborPercent}% of total value`, margin + 5, y + 14);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.blue);
  doc.text(formatCurrencyPdf(data.laborValue), margin + contentWidth / 2 - 15, y + 12, { align: 'right' });

  let driverY = y + 22;
  doc.setFontSize(9);
  laborDrivers.forEach((driver) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkGray);
    doc.text(driver.name, margin + 8, driverY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.green);
    doc.text(formatCurrencyPdf(driver.value), margin + contentWidth / 2 - 15, driverY, { align: 'right' });
    driverY += 8;
  });

  // Revenue & Quality Card
  const revenueCardHeight = 25 + revenueDrivers.length * 8;
  drawBox(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, revenueCardHeight, colors.lightGray);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('REVENUE & QUALITY', margin + contentWidth / 2 + 10, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text(`${data.revenuePercent}% of total value`, margin + contentWidth / 2 + 10, y + 14);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.green);
  doc.text(formatCurrencyPdf(data.revenueValue), margin + contentWidth - 10, y + 12, { align: 'right' });

  let revenueDriverY = y + 22;
  doc.setFontSize(9);
  revenueDrivers.forEach((driver) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkGray);
    doc.text(driver.name, margin + contentWidth / 2 + 13, revenueDriverY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.green);
    doc.text(formatCurrencyPdf(driver.value), margin + contentWidth - 10, revenueDriverY, { align: 'right' });
    revenueDriverY += 8;
  });

  y += Math.max(laborCardHeight, revenueCardHeight) + 15;

  // Value Distribution Bar
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('VALUE DISTRIBUTION', margin, y);
  y += 8;

  const barHeight = 12;
  const laborBarWidth = (data.laborPercent / 100) * contentWidth;
  const revenueBarWidth = (data.revenuePercent / 100) * contentWidth;

  doc.setFillColor(...colors.blue);
  doc.roundedRect(margin, y, laborBarWidth, barHeight, 2, 2, 'F');

  doc.setFillColor(...colors.green);
  doc.roundedRect(margin + laborBarWidth, y, revenueBarWidth, barHeight, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.white);
  if (data.laborPercent > 20) {
    doc.text(`Labor ${data.laborPercent}%`, margin + laborBarWidth / 2, y + 8, { align: 'center' });
  }
  if (data.revenuePercent > 20) {
    doc.text(`Revenue ${data.revenuePercent}%`, margin + laborBarWidth + revenueBarWidth / 2, y + 8, { align: 'center' });
  }

  // ============================================
  // PAGE 4: INVESTMENT DETAILS
  // ============================================
  doc.addPage();
  addLogo();
  setTitle('INVESTMENT DETAILS', 40);
  addPageNumber();

  y = 55;

  // Configuration Card
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('YOUR CONFIGURATION', margin, y);
  y += 8;

  drawBox(margin, y, contentWidth / 2 - 5, 55, colors.lightGray);

  const configItems = [
    { label: 'Setting', value: data.setting },
    { label: data.unitNamePlural.charAt(0).toUpperCase() + data.unitNamePlural.slice(1), value: data.providers.toString() },
    { label: 'Price', value: `$${data.costPerUnit}/${data.unitName}/month` },
    { label: 'Annual Investment', value: formatCurrencyPdf(data.annualInvestment), bold: true },
  ];

  let configY = y + 10;
  configItems.forEach((item) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.mediumGray);
    doc.text(item.label, margin + 5, configY);
    doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
    doc.setTextColor(...colors.darkGray);
    doc.text(item.value, margin + contentWidth / 2 - 15, configY, { align: 'right' });
    configY += 10;
  });

  // Multi-Year Projection
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('MULTI-YEAR PROJECTION', margin + contentWidth / 2 + 5, y - 8);

  drawBox(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, 55, colors.lightGray);

  const projY = y + 10;
  doc.setFontSize(9);
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.mediumGray);
  doc.text('', margin + contentWidth / 2 + 10, projY);
  doc.text('Year 1', margin + contentWidth / 2 + 35, projY, { align: 'center' });
  doc.text('Year 2', margin + contentWidth / 2 + 55, projY, { align: 'center' });
  doc.text('Year 3', margin + contentWidth / 2 + 75, projY, { align: 'center' });

  // Value row
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);
  doc.text('Value', margin + contentWidth / 2 + 10, projY + 10);
  doc.text(formatCurrencyPdf(data.year1), margin + contentWidth / 2 + 35, projY + 10, { align: 'center' });
  doc.text(formatCurrencyPdf(data.year2), margin + contentWidth / 2 + 55, projY + 10, { align: 'center' });
  doc.text(formatCurrencyPdf(data.year3), margin + contentWidth / 2 + 75, projY + 10, { align: 'center' });

  // Cost row
  doc.text('Cost', margin + contentWidth / 2 + 10, projY + 20);
  doc.setTextColor(...colors.mediumGray);
  doc.text(formatCurrencyPdf(data.annualInvestment), margin + contentWidth / 2 + 35, projY + 20, { align: 'center' });
  doc.text(formatCurrencyPdf(data.annualInvestment), margin + contentWidth / 2 + 55, projY + 20, { align: 'center' });
  doc.text(formatCurrencyPdf(data.annualInvestment), margin + contentWidth / 2 + 75, projY + 20, { align: 'center' });

  // Net row
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.green);
  doc.text('Net', margin + contentWidth / 2 + 10, projY + 30);
  doc.text(formatCurrencyPdf(data.year1 - data.annualInvestment), margin + contentWidth / 2 + 35, projY + 30, { align: 'center' });
  doc.text(formatCurrencyPdf(data.year2 - data.annualInvestment), margin + contentWidth / 2 + 55, projY + 30, { align: 'center' });
  doc.text(formatCurrencyPdf(data.year3 - data.annualInvestment), margin + contentWidth / 2 + 75, projY + 30, { align: 'center' });

  y += 70;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...colors.mediumGray);
  doc.text('* Assumes 10% annual value growth with increased adoption', margin, y);

  // ============================================
  // PAGE 5: KEY ASSUMPTIONS & NEXT STEPS
  // ============================================
  doc.addPage();
  addLogo();
  setTitle('KEY ASSUMPTIONS', 40);
  addPageNumber();

  y = 55;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('The following assumptions underpin this ROI model:', margin, y);
  y += 12;

  const eligibleEncounters = Math.round(data.encounters * (data.utilizationRate / 100));

  const assumptions = [
    `${data.providers} ${data.unitNamePlural} with ${data.encounters.toLocaleString()} total encounters annually`,
    `${data.utilizationRate}% utilization rate = ${eligibleEncounters.toLocaleString()} Abridge-documented encounters`,
    `Investment of ${formatCurrencyPdf(data.annualInvestment)} annually at $${data.costPerUnit}/${data.unitName}/month`,
    `Value scales linearly with ${data.unitNamePlural} and utilization`,
    `10% annual value growth assumed for multi-year projection`,
    `All calculations based on industry benchmarks and Abridge customer data`,
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.darkGray);

  assumptions.forEach((assumption) => {
    doc.setFillColor(...colors.green);
    doc.circle(margin + 3, y - 1, 1.5, 'F');
    const lines = doc.splitTextToSize(assumption, contentWidth - 15);
    doc.text(lines, margin + 10, y);
    y += lines.length * 5 + 5;
  });

  y += 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.darkGray);
  doc.text('NEXT STEPS', margin, y);
  y += 10;

  drawBox(margin, y, contentWidth, 45, colors.greenLight);

  const nextSteps = [
    'Schedule a discovery call with your Abridge representative',
    'Review assumptions with your finance and operations teams',
    'Identify pilot department or care setting',
    'Begin implementation planning',
  ];

  let stepY = y + 10;
  doc.setFontSize(10);
  nextSteps.forEach((step, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.green);
    doc.text(`${i + 1}.`, margin + 5, stepY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkGray);
    doc.text(step, margin + 15, stepY);
    stepY += 8;
  });

  y += 60;

  drawBox(margin, y, contentWidth, 20, colors.lightGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.mediumGray);
  doc.text('Questions? Contact your Abridge representative or visit abridge.com', margin + 5, y + 12);

  // Save
  const date = new Date().toISOString().split('T')[0];
  const filename = `Abridge_ROI_${data.setting.replace(/\s+/g, '_')}_${data.providers}P_${date}.pdf`;
  doc.save(filename);
}
