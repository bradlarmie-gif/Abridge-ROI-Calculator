import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
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
}

const COLORS = {
  abridgeRed: [234, 44, 0] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [156, 163, 175] as [number, number, number],
  black: [17, 24, 39] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  cardBg: [243, 244, 246] as [number, number, number],
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return Math.round(num / 1000).toLocaleString() + 'K';
  return Math.round(num).toLocaleString();
};

const formatCurrency = (num: number): string => {
  return '$' + formatNumber(num);
};

export async function generatePremiumPDF(data: PremiumPDFData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  const modelId = `${data.setting.substring(0, 2).toUpperCase()}-${data.providers}-${data.utilization}UTL-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const drawHeader = (pageNum: number) => {
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    doc.text('ABRIDGE', margin, 12);
    doc.setTextColor(...COLORS.lightGray);
    doc.text(`Page ${pageNum}`, pageWidth - margin, 12, { align: 'right' });
  };

  const drawRedUnderline = (x: number, y: number, width: number) => {
    doc.setDrawColor(...COLORS.abridgeRed);
    doc.setLineWidth(1);
    doc.line(x, y, x + width, y);
  };

  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFontSize(20);
  doc.setTextColor(...COLORS.abridgeRed);
  doc.setFont('helvetica', 'bold');
  doc.text('ABRIDGE', margin, 30);

  yPos = 80;
  doc.setFontSize(32);
  doc.setTextColor(...COLORS.white);
  doc.text('ROI Business Case', pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.lightGray);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.setting} • ${data.providers} ${data.unitNamePlural}`, pageWidth / 2, yPos, { align: 'center' });

  yPos = 130;
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.lightGray);
  doc.text('NET ANNUAL GAIN', pageWidth / 2, yPos, { align: 'center' });

  yPos += 20;
  doc.setFontSize(48);
  doc.setTextColor(...COLORS.green);
  doc.setFont('helvetica', 'bold');
  doc.text('+' + formatCurrency(data.netGain), pageWidth / 2, yPos, { align: 'center' });

  yPos += 18;
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.lightGray);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.roi.toFixed(1)}× Return on Investment`, pageWidth / 2, yPos, { align: 'center' });

  yPos = pageHeight - 40;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.text(`Generated: ${today}`, pageWidth / 2, yPos, { align: 'center' });
  doc.text(`Model ID: ${modelId}`, pageWidth / 2, yPos + 6, { align: 'center' });

  doc.addPage();
  drawHeader(2);
  yPos = 30;

  doc.setFontSize(24);
  doc.setTextColor(...COLORS.black);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, yPos);
  drawRedUnderline(margin, yPos + 3, 70);

  yPos += 15;
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'normal');
  doc.text('Your opportunity at a glance', margin, yPos);

  yPos += 20;

  const metrics = [
    { label: 'Total Value', value: formatCurrency(data.totalValue), highlight: false },
    { label: 'Investment', value: formatCurrency(data.investment), highlight: false },
    { label: 'Net Gain', value: '+' + formatCurrency(data.netGain), highlight: true },
    { label: 'ROI', value: data.roi.toFixed(1) + '×', highlight: true },
  ];

  const boxWidth = 82;
  const boxHeight = 22;
  let xPos = margin;
  let row = 0;

  metrics.forEach((metric, i) => {
    if (i === 2) {
      yPos += boxHeight + 8;
      xPos = margin;
      row++;
    }

    doc.setFillColor(...COLORS.cardBg);
    doc.roundedRect(xPos, yPos, boxWidth, boxHeight, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text(metric.label, xPos + 5, yPos + 8);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    if (metric.highlight) {
      doc.setTextColor(...COLORS.green);
    } else {
      doc.setTextColor(...COLORS.black);
    }
    doc.text(metric.value, xPos + 5, yPos + 18);
    doc.setFont('helvetica', 'normal');

    xPos += boxWidth + 6;
  });

  yPos += boxHeight + 20;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('Key Outcomes', margin, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const largestDriver = [...data.laborDrivers, ...data.revenueDrivers].reduce(
    (max, d) => (d.value > max.value ? d : max),
    { name: '', value: 0 }
  );

  const outcomes = [
    `${formatNumber(data.hoursReturned)} hours returned annually`,
    `${formatNumber(data.additionalVisits)} additional patient visits`,
    `${formatCurrency(largestDriver.value)} in ${largestDriver.name.toLowerCase()}`,
  ];

  outcomes.forEach((outcome) => {
    doc.setTextColor(...COLORS.green);
    doc.text('✓', margin + 2, yPos);
    doc.setTextColor(...COLORS.black);
    doc.text(outcome, margin + 10, yPos);
    yPos += 8;
  });

  yPos += 15;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Configuration', margin, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const configItems = [
    ['Setting', data.setting],
    [data.unitNamePlural, String(data.providers)],
    ['Utilization', data.utilization + '%'],
    ['Annual Encounters', formatNumber(data.encounters)],
    [`Price/${data.unitName}`, formatCurrency(data.costPerProvider) + '/mo'],
  ];

  configItems.forEach(([label, value]) => {
    doc.setTextColor(...COLORS.gray);
    doc.text(label, margin + 2, yPos);
    doc.setTextColor(...COLORS.black);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 60, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 7;
  });

  doc.addPage();
  drawHeader(3);
  yPos = 30;

  doc.setFontSize(24);
  doc.setTextColor(...COLORS.black);
  doc.setFont('helvetica', 'bold');
  doc.text('Value Breakdown', margin, yPos);
  drawRedUnderline(margin, yPos + 3, 60);

  yPos += 15;
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.gray);
  doc.setFont('helvetica', 'normal');
  doc.text('Where your ROI comes from', margin, yPos);

  yPos += 20;

  if (data.laborDrivers.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('LABOR & EFFICIENCY', margin, yPos);
    doc.text(formatCurrency(data.laborTotal), pageWidth - margin, yPos, { align: 'right' });

    yPos += 10;

    data.laborDrivers.forEach((driver) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(driver.name, margin + 3, yPos);
      doc.setTextColor(...COLORS.green);
      doc.text(formatCurrency(driver.value), pageWidth - margin, yPos, { align: 'right' });

      yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.gray);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize('→ ' + driver.description, pageWidth - 2 * margin - 10);
      doc.text(descLines, margin + 3, yPos);
      yPos += descLines.length * 4 + 8;
      doc.setTextColor(...COLORS.black);
    });

    yPos += 5;
  }

  if (data.revenueDrivers.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('REVENUE & QUALITY', margin, yPos);
    doc.text(formatCurrency(data.revenueTotal), pageWidth - margin, yPos, { align: 'right' });

    yPos += 10;

    data.revenueDrivers.forEach((driver) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.black);
      doc.text(driver.name, margin + 3, yPos);
      doc.setTextColor(...COLORS.green);
      doc.text(formatCurrency(driver.value), pageWidth - margin, yPos, { align: 'right' });

      yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.gray);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize('→ ' + driver.description, pageWidth - 2 * margin - 10);
      doc.text(descLines, margin + 3, yPos);
      yPos += descLines.length * 4 + 8;
      doc.setTextColor(...COLORS.black);
    });
  }

  doc.addPage();
  drawHeader(4);
  yPos = 30;

  doc.setFontSize(24);
  doc.setTextColor(...COLORS.black);
  doc.setFont('helvetica', 'bold');
  doc.text('Investment Details', margin, yPos);
  drawRedUnderline(margin, yPos + 3, 65);

  yPos += 25;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Multi-Year Projection', margin, yPos);

  yPos += 10;

  const tableData = [
    ['Year 1', formatCurrency(data.year1), formatCurrency(data.investment), '+' + formatCurrency(data.year1 - data.investment), (data.year1 / data.investment).toFixed(1) + '×'],
    ['Year 2', formatCurrency(data.year2), formatCurrency(data.investment), '+' + formatCurrency(data.year2 - data.investment), (data.year2 / data.investment).toFixed(1) + '×'],
    ['Year 3', formatCurrency(data.year3), formatCurrency(data.investment), '+' + formatCurrency(data.year3 - data.investment), (data.year3 / data.investment).toFixed(1) + '×'],
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Year', 'Value', 'Cost', 'Net Gain', 'ROI']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: COLORS.cardBg,
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 40 },
      4: { cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('3-Year Summary', margin, yPos);

  yPos += 12;

  const summaryItems = [
    ['Total Value Generated', formatCurrency(data.threeYearValue)],
    ['Total Investment', formatCurrency(data.threeYearCost)],
    ['Net Value Created', '+' + formatCurrency(data.threeYearNet)],
  ];

  summaryItems.forEach(([label, value], i) => {
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 3, yPos);

    if (i === 2) {
      doc.setTextColor(...COLORS.green);
    } else {
      doc.setTextColor(...COLORS.black);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 80, yPos);
    yPos += 8;
  });

  if (data.fullScaleValue > 0) {
    yPos += 15;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    doc.text('Full Scale Potential', margin, yPos);

    yPos += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(`At ${data.fullScaleProviders} ${data.unitNamePlural.toLowerCase()} with ${data.fullScaleUtil}% utilization:`, margin + 3, yPos);

    yPos += 10;
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.green);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(data.fullScaleValue) + '/year', margin + 3, yPos);

    if (data.fullScaleROI > 0) {
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.gray);
      doc.setFont('helvetica', 'normal');
      doc.text(` (${data.fullScaleROI.toFixed(1)}× ROI)`, margin + 60, yPos);
    }
  }

  doc.addPage();
  drawHeader(5);
  yPos = 30;

  doc.setFontSize(24);
  doc.setTextColor(...COLORS.black);
  doc.setFont('helvetica', 'bold');
  doc.text('Next Steps', margin, yPos);
  drawRedUnderline(margin, yPos + 3, 45);

  yPos += 25;

  const steps = [
    { title: 'Validate Assumptions', desc: 'Review this model with your finance and operations teams to confirm the inputs reflect your organization.' },
    { title: 'Start with a Pilot', desc: 'Most organizations begin with 10-20 providers to prove value before expanding.' },
    { title: 'Build Your Business Case', desc: 'We\'ll help you present this to stakeholders with case studies and implementation support.' },
  ];

  steps.forEach((step, i) => {
    doc.setFillColor(...COLORS.abridgeRed);
    doc.circle(margin + 5, yPos - 1, 5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(String(i + 1), margin + 5, yPos + 1, { align: 'center' });

    doc.setTextColor(...COLORS.black);
    doc.setFontSize(12);
    doc.text(step.title, margin + 15, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    const descLines = doc.splitTextToSize(step.desc, pageWidth - 2 * margin - 20);
    doc.text(descLines, margin + 15, yPos);
    yPos += descLines.length * 5 + 15;
  });

  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.black);
  doc.text('Ready to Get Started?', margin, yPos);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text('Contact your Abridge representative to discuss next steps.', margin, yPos);

  yPos += 15;
  doc.setTextColor(...COLORS.abridgeRed);
  doc.setFont('helvetica', 'bold');
  doc.text('abridge.com', margin, yPos);

  const filename = `Abridge_ROI_${data.setting.replace(/\s+/g, '_')}_${data.providers}P.pdf`;
  doc.save(filename);
}
