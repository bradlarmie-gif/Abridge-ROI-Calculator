import html2pdf from 'html2pdf.js';

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

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return Math.round(num / 1000).toLocaleString() + 'K';
  return num.toLocaleString();
};

const generateHTML = (data: PremiumPDFData): string => {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const modelId = `${data.setting.substring(0, 2).toUpperCase()}-${data.providers}-${data.utilization}UTL-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const eligibleEncounters = Math.round(data.encounters * (data.utilization / 100));

  const laborDriversHTML = data.laborDrivers
    .map(
      (d) => `
      <div class="value-item">
        <div class="value-item-header">
          <span class="value-item-name">${d.name}</span>
          <span class="value-item-amount">$${formatNumber(d.value)}</span>
        </div>
        <div class="value-item-desc">→ ${d.description || 'Reduces administrative burden and improves efficiency'}</div>
      </div>
    `
    )
    .join('');

  const revenueDriversHTML = data.revenueDrivers
    .map(
      (d) => `
      <div class="value-item">
        <div class="value-item-header">
          <span class="value-item-name">${d.name}</span>
          <span class="value-item-amount">$${formatNumber(d.value)}</span>
        </div>
        <div class="value-item-desc">→ ${d.description || 'Improves revenue capture and quality outcomes'}</div>
      </div>
    `
    )
    .join('');

  const yearsData = [
    { year: 'Year 1', value: data.year1, cost: data.investment, net: data.year1 - data.investment, roi: (data.year1 / data.investment).toFixed(1) },
    { year: 'Year 2', value: data.year2, cost: data.investment, net: data.year2 - data.investment, roi: (data.year2 / data.investment).toFixed(1) },
    { year: 'Year 3', value: data.year3, cost: data.investment, net: data.year3 - data.investment, roi: (data.year3 / data.investment).toFixed(1) },
  ];

  const yearsHTML = yearsData
    .map(
      (y) => `
      <tr>
        <td>${y.year}</td>
        <td>$${formatNumber(y.value)}</td>
        <td>$${formatNumber(y.cost)}</td>
        <td>+$${formatNumber(y.net)}</td>
        <td>${y.roi}×</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #111827;
      font-size: 10pt;
      line-height: 1.4;
    }
    
    .cover-page {
      width: 210mm;
      height: 297mm;
      background: linear-gradient(135deg, #111827 0%, #1F2937 100%);
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }
    
    .cover-logo {
      position: absolute;
      top: 30px;
      left: 30px;
      font-size: 18pt;
      font-weight: 700;
      color: #EA2C00;
      letter-spacing: -0.5px;
    }
    
    .cover-giant-a {
      position: absolute;
      right: -80px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 400pt;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.03);
      line-height: 1;
      font-family: Arial, sans-serif;
    }
    
    .cover-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      width: 100%;
      padding: 0 40px;
    }
    
    .cover-kicker {
      font-size: 11pt;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 15px;
    }
    
    .cover-title {
      font-size: 42pt;
      font-weight: 700;
      color: white;
      margin-bottom: 10px;
      letter-spacing: -1px;
    }
    
    .cover-subtitle {
      font-size: 16pt;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 60px;
    }
    
    .cover-roi-box {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      border: 2px solid #10B981;
      border-radius: 12px;
      padding: 30px 50px;
    }
    
    .cover-roi-label {
      font-size: 10pt;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .cover-roi-value {
      font-size: 56pt;
      font-weight: 700;
      color: #10B981;
      line-height: 1;
      margin-bottom: 8px;
    }
    
    .cover-roi-secondary {
      font-size: 14pt;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .cover-meta {
      position: absolute;
      bottom: 30px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9pt;
      color: rgba(255, 255, 255, 0.4);
    }
    
    .content-page {
      width: 210mm;
      height: 297mm;
      padding: 40px;
      position: relative;
      page-break-after: always;
      background: white;
    }
    
    .page-logo {
      position: absolute;
      top: 20px;
      left: 40px;
      font-size: 12pt;
      font-weight: 700;
      color: #EA2C00;
    }
    
    .page-number {
      position: absolute;
      bottom: 20px;
      right: 40px;
      font-size: 9pt;
      color: #9CA3AF;
    }
    
    .page-title {
      font-size: 28pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 5px;
      margin-top: 40px;
    }
    
    .page-title::after {
      content: '';
      display: block;
      width: 60px;
      height: 4px;
      background: #EA2C00;
      margin-top: 8px;
    }
    
    .page-subtitle {
      font-size: 11pt;
      color: #6B7280;
      margin-bottom: 30px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: #F9FAFB;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #E5E7EB;
    }
    
    .metric-card.highlight {
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      border-left-color: #10B981;
    }
    
    .metric-label {
      font-size: 9pt;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .metric-value {
      font-size: 28pt;
      font-weight: 700;
      color: #111827;
      line-height: 1;
    }
    
    .metric-card.highlight .metric-value {
      color: #10B981;
    }
    
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-bottom: 25px;
    }
    
    .card {
      background: #F9FAFB;
      border-radius: 10px;
      padding: 25px;
      border: 1px solid #E5E7EB;
    }
    
    .card-title {
      font-size: 11pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .card-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
    }
    
    .card-row:last-child {
      border-bottom: none;
      padding-top: 8px;
      border-top: 2px solid #10B981;
      font-weight: 700;
    }
    
    .card-label {
      font-size: 10pt;
      color: #6B7280;
    }
    
    .card-value {
      font-size: 11pt;
      font-weight: 600;
      color: #111827;
    }
    
    .card-row:last-child .card-value {
      color: #10B981;
      font-size: 14pt;
    }
    
    .value-section {
      margin-bottom: 25px;
    }
    
    .value-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
      border-radius: 8px 8px 0 0;
      border-left: 5px solid #3B82F6;
    }
    
    .value-header.revenue {
      background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
      border-left-color: #10B981;
    }
    
    .value-category {
      font-size: 12pt;
      font-weight: 700;
      color: #111827;
    }
    
    .value-total {
      font-size: 16pt;
      font-weight: 700;
      color: #3B82F6;
    }
    
    .value-header.revenue .value-total {
      color: #10B981;
    }
    
    .value-items {
      background: white;
      border: 1px solid #E5E7EB;
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 20px;
    }
    
    .value-item {
      margin-bottom: 15px;
    }
    
    .value-item:last-child {
      margin-bottom: 0;
    }
    
    .value-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    
    .value-item-name {
      font-size: 11pt;
      font-weight: 600;
      color: #111827;
    }
    
    .value-item-amount {
      font-size: 12pt;
      font-weight: 700;
      color: #10B981;
    }
    
    .value-item-desc {
      font-size: 9pt;
      color: #6B7280;
      line-height: 1.5;
    }
    
    .bar-chart {
      margin: 25px 0;
    }
    
    .bar-chart-title {
      font-size: 10pt;
      font-weight: 600;
      color: #6B7280;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .bar-container {
      display: flex;
      height: 50px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .bar-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12pt;
      font-weight: 700;
      color: white;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    
    .bar-segment.labor {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
    }
    
    .bar-segment.revenue {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10pt;
    }
    
    .data-table thead {
      background: #F3F4F6;
    }
    
    .data-table th {
      padding: 12px;
      text-align: left;
      font-weight: 700;
      color: #374151;
      border-bottom: 2px solid #E5E7EB;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #E5E7EB;
    }
    
    .data-table tbody tr:last-child {
      background: #ECFDF5;
      font-weight: 700;
    }
    
    .data-table tbody tr:last-child td {
      color: #10B981;
      border-bottom: none;
    }
    
    .callout {
      background: #EFF6FF;
      border-left: 4px solid #3B82F6;
      border-radius: 6px;
      padding: 15px 20px;
      margin: 20px 0;
      font-size: 9.5pt;
      line-height: 1.6;
    }
    
    .callout.success {
      background: #ECFDF5;
      border-left-color: #10B981;
    }
    
    .callout.warning {
      background: #FEF3C7;
      border-left-color: #F59E0B;
    }
    
    .callout-title {
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    .scenario-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 20px;
      align-items: center;
      margin: 25px 0;
    }
    
    .scenario-box {
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
      border-radius: 10px;
      padding: 25px;
    }
    
    .scenario-box.highlight {
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      border-color: #10B981;
    }
    
    .scenario-label {
      font-size: 8pt;
      color: #EA2C00;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .scenario-box.highlight .scenario-label {
      color: #10B981;
    }
    
    .scenario-title {
      font-size: 13pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 15px;
    }
    
    .scenario-stat {
      font-size: 9pt;
      color: #6B7280;
      margin-bottom: 5px;
    }
    
    .scenario-result {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #E5E7EB;
    }
    
    .scenario-result-value {
      font-size: 20pt;
      font-weight: 700;
      color: #10B981;
      line-height: 1;
    }
    
    .scenario-result-label {
      font-size: 8pt;
      color: #6B7280;
      text-transform: uppercase;
      margin-top: 5px;
    }
    
    .scenario-arrow {
      font-size: 32pt;
      color: #EA2C00;
      text-align: center;
    }
    
    .assumptions-list {
      list-style: none;
      padding: 0;
    }
    
    .assumptions-list li {
      padding: 12px 15px;
      margin-bottom: 8px;
      background: #F9FAFB;
      border-left: 3px solid #10B981;
      border-radius: 4px;
      font-size: 10pt;
    }
    
    .steps-list {
      counter-reset: step-counter;
      list-style: none;
      padding: 0;
    }
    
    .steps-list li {
      counter-increment: step-counter;
      position: relative;
      padding-left: 50px;
      margin-bottom: 20px;
    }
    
    .steps-list li::before {
      content: counter(step-counter);
      position: absolute;
      left: 0;
      top: 0;
      width: 35px;
      height: 35px;
      background: #EA2C00;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14pt;
    }
    
    .step-title {
      font-size: 12pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 5px;
    }
    
    .step-desc {
      font-size: 10pt;
      color: #6B7280;
      line-height: 1.5;
    }
    
    .contact-box {
      background: #F3F4F6;
      border-radius: 10px;
      padding: 25px;
      margin-top: 30px;
    }
    
    .contact-title {
      font-size: 12pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 15px;
    }
    
    .contact-info {
      font-size: 10pt;
      line-height: 1.8;
      color: #374151;
    }
    
    .contact-website {
      color: #EA2C00;
      font-weight: 700;
      font-size: 11pt;
      margin-top: 10px;
      display: block;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div class="cover-logo">ABRIDGE</div>
  <div class="cover-giant-a">A</div>
  <div class="cover-content">
    <div class="cover-kicker">ROI Business Case</div>
    <h1 class="cover-title">Ambient AI<br>ROI Model</h1>
    <p class="cover-subtitle">${data.setting} • ${data.providers} ${data.unitNamePlural}</p>
    <div class="cover-roi-box">
      <div class="cover-roi-label">Net Annual Gain</div>
      <div class="cover-roi-value">+$${formatNumber(data.netGain)}</div>
      <div class="cover-roi-secondary">${data.roi.toFixed(1)}× Return on Investment</div>
    </div>
  </div>
  <div class="cover-meta">
    Generated ${date} • Model ID: ${modelId}
  </div>
</div>

<!-- PAGE 2: EXECUTIVE SUMMARY -->
<div class="content-page">
  <div class="page-logo">ABRIDGE</div>
  <h1 class="page-title">Executive Summary</h1>
  <p class="page-subtitle">Your opportunity at a glance</p>
  
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Total Value</div>
      <div class="metric-value">$${formatNumber(data.totalValue)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Investment</div>
      <div class="metric-value">$${formatNumber(data.investment)}</div>
    </div>
    <div class="metric-card highlight">
      <div class="metric-label">Net Gain</div>
      <div class="metric-value">+$${formatNumber(data.netGain)}</div>
    </div>
    <div class="metric-card highlight">
      <div class="metric-label">ROI</div>
      <div class="metric-value">${data.roi.toFixed(1)}×</div>
    </div>
  </div>
  
  <div class="callout success">
    <div class="callout-title">What this means</div>
    <p>This ${data.setting} deployment with ${data.providers} ${data.unitNamePlural} generates <strong>$${formatNumber(data.totalValue)}</strong> in annual value. At an investment of <strong>$${formatNumber(data.investment)}</strong>, you'll realize a net gain of <strong>+$${formatNumber(data.netGain)}</strong> per year.</p>
  </div>
  
  <div class="two-col">
    <div class="card">
      <div class="card-title">Key Outcomes</div>
      <div class="card-row">
        <span class="card-label">Hours Returned</span>
        <span class="card-value">${formatNumber(data.hoursReturned)}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Additional Visits</span>
        <span class="card-value">${formatNumber(data.additionalVisits)}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Time per Encounter</span>
        <span class="card-value">${data.timeSaved} min</span>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">Deployment Scope</div>
      <div class="card-row">
        <span class="card-label">Care Setting</span>
        <span class="card-value">${data.setting}</span>
      </div>
      <div class="card-row">
        <span class="card-label">${data.unitNamePlural.charAt(0).toUpperCase() + data.unitNamePlural.slice(1)}</span>
        <span class="card-value">${data.providers}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Utilization</span>
        <span class="card-value">${data.utilization}%</span>
      </div>
    </div>
  </div>
  
  <div class="page-number">1 of 5</div>
</div>

<!-- PAGE 3: VALUE BREAKDOWN -->
<div class="content-page">
  <div class="page-logo">ABRIDGE</div>
  <h1 class="page-title">Value Breakdown</h1>
  <p class="page-subtitle">Where your ROI comes from</p>
  
  ${data.laborDrivers.length > 0 ? `
  <div class="value-section">
    <div class="value-header">
      <span class="value-category">LABOR & EFFICIENCY</span>
      <span class="value-total">$${formatNumber(data.laborTotal)} (${data.laborPct}%)</span>
    </div>
    <div class="value-items">
      ${laborDriversHTML}
    </div>
  </div>
  ` : ''}
  
  ${data.revenueDrivers.length > 0 ? `
  <div class="value-section">
    <div class="value-header revenue">
      <span class="value-category">REVENUE & QUALITY</span>
      <span class="value-total">$${formatNumber(data.revenueTotal)} (${data.revenuePct}%)</span>
    </div>
    <div class="value-items">
      ${revenueDriversHTML}
    </div>
  </div>
  ` : ''}
  
  <div class="bar-chart">
    <div class="bar-chart-title">Value Distribution</div>
    <div class="bar-container">
      ${data.laborPct > 0 ? `<div class="bar-segment labor" style="width: ${data.laborPct}%">Labor ${data.laborPct}%</div>` : ''}
      ${data.revenuePct > 0 ? `<div class="bar-segment revenue" style="width: ${data.revenuePct}%">Revenue ${data.revenuePct}%</div>` : ''}
    </div>
  </div>
  
  <div class="page-number">2 of 5</div>
</div>

<!-- PAGE 4: INVESTMENT DETAILS -->
<div class="content-page">
  <div class="page-logo">ABRIDGE</div>
  <h1 class="page-title">Investment Details</h1>
  
  <div class="two-col">
    <div class="card">
      <div class="card-title">Your Configuration</div>
      <div class="card-row">
        <span class="card-label">Setting</span>
        <span class="card-value">${data.setting}</span>
      </div>
      <div class="card-row">
        <span class="card-label">${data.unitNamePlural.charAt(0).toUpperCase() + data.unitNamePlural.slice(1)}</span>
        <span class="card-value">${data.providers}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Price/${data.unitName}</span>
        <span class="card-value">$${data.costPerProvider}/mo</span>
      </div>
      <div class="card-row">
        <span class="card-label">Annual Investment</span>
        <span class="card-value">$${formatNumber(data.investment)}</span>
      </div>
    </div>
    
    <div class="card">
      <div class="card-title">3-Year Impact</div>
      <div class="card-row">
        <span class="card-label">Total Value</span>
        <span class="card-value">$${formatNumber(data.threeYearValue)}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Total Investment</span>
        <span class="card-value">$${formatNumber(data.threeYearCost)}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Net Benefit</span>
        <span class="card-value">+$${formatNumber(data.threeYearNet)}</span>
      </div>
    </div>
  </div>
  
  <table class="data-table">
    <thead>
      <tr>
        <th>Year</th>
        <th>Value</th>
        <th>Cost</th>
        <th>Net Gain</th>
        <th>ROI</th>
      </tr>
    </thead>
    <tbody>
      ${yearsHTML}
      <tr>
        <td>3-Year Total</td>
        <td>$${formatNumber(data.threeYearValue)}</td>
        <td>$${formatNumber(data.threeYearCost)}</td>
        <td>+$${formatNumber(data.threeYearNet)}</td>
        <td>${(data.threeYearValue / data.threeYearCost).toFixed(1)}×</td>
      </tr>
    </tbody>
  </table>
  
  <div class="callout">
    <p style="font-style: italic; font-size: 9pt;">* Assumes 10% annual value growth from increased adoption and workflow optimization</p>
  </div>
  
  <div class="page-number">3 of 5</div>
</div>

<!-- PAGE 5: SCENARIO MODEL -->
<div class="content-page">
  <div class="page-logo">ABRIDGE</div>
  <h1 class="page-title">Growth Scenario</h1>
  <p class="page-subtitle">From pilot to full scale</p>
  
  <div class="scenario-grid">
    <div class="scenario-box">
      <div class="scenario-label">Your Pilot</div>
      <div class="scenario-title">Current State</div>
      <div class="scenario-stat">${data.providers} ${data.unitNamePlural}</div>
      <div class="scenario-stat">${data.utilization}% utilization</div>
      <div class="scenario-result">
        <div class="scenario-result-value">$${formatNumber(data.totalValue)}</div>
        <div class="scenario-result-label">Annual Value • ${data.roi.toFixed(1)}× ROI</div>
      </div>
    </div>
    
    <div class="scenario-arrow">→</div>
    
    <div class="scenario-box highlight">
      <div class="scenario-label">Your Opportunity</div>
      <div class="scenario-title">Full Scale</div>
      <div class="scenario-stat">${data.fullScaleProviders} ${data.unitNamePlural}</div>
      <div class="scenario-stat">${data.fullScaleUtil}% utilization</div>
      <div class="scenario-result">
        <div class="scenario-result-value">$${formatNumber(data.fullScaleValue)}</div>
        <div class="scenario-result-label">Annual Value • ${data.fullScaleROI.toFixed(1)}× ROI</div>
      </div>
    </div>
  </div>
  
  <div class="callout success">
    <div class="callout-title">Network Effect</div>
    <p><strong>+$${formatNumber(data.networkEffect)}</strong> compounding value beyond linear projection. Utilization typically increases as adoption matures. Most organizations reach 70-80% at full scale.</p>
  </div>
  
  <div class="callout warning" style="margin-top: 20px;">
    <div class="callout-title">Why ROI is Multiplicative</div>
    <p><strong>Utilization × Efficiency × Quality = Total Value</strong></p>
    <p style="margin-top: 8px; font-size: 9pt;">Small gaps in each dimension compound into large gaps overall. If your utilization is 77% of potential and your efficiency is 50% of potential, you're capturing roughly 63% of the value you could be.</p>
  </div>
  
  <div class="page-number">4 of 5</div>
</div>

<!-- PAGE 6: ASSUMPTIONS & NEXT STEPS -->
<div class="content-page">
  <div class="page-logo">ABRIDGE</div>
  <h1 class="page-title">Key Assumptions</h1>
  <p class="page-subtitle">Evidence-based methodology</p>
  
  <ul class="assumptions-list">
    <li><strong>${data.providers} ${data.unitNamePlural}</strong> with ${formatNumber(data.encounters)} total encounters annually</li>
    <li><strong>${data.utilization}% utilization</strong> = ${formatNumber(eligibleEncounters)} Abridge-documented encounters</li>
    <li><strong>${data.timeSaved} min/encounter</strong> time savings (industry range: 2-4 min)</li>
    <li><strong>$${data.costPerProvider}/${data.unitName}/month</strong> pricing model</li>
    <li><strong>10% annual value growth</strong> from increased adoption and optimization</li>
    <li><strong>Conservative conversion rates</strong> account for operational constraints</li>
  </ul>
  
  <h2 style="font-size: 16pt; font-weight: 700; margin-top: 40px; margin-bottom: 20px;">Next Steps</h2>
  
  <ol class="steps-list">
    <li>
      <div class="step-title">Validate Assumptions</div>
      <div class="step-desc">Review this model with your finance and operations teams. We can schedule a working session to refine based on your data.</div>
    </li>
    <li>
      <div class="step-title">Start with a Pilot</div>
      <div class="step-desc">Most organizations begin with 10-20 ${data.unitNamePlural} to prove value before scaling.</div>
    </li>
    <li>
      <div class="step-title">Build Your Business Case</div>
      <div class="step-desc">We'll help you present this to stakeholders with case studies and reference calls.</div>
    </li>
  </ol>
  
  <div class="contact-box">
    <div class="contact-title">Contact</div>
    <div class="contact-info">
      <strong>Your Abridge Representative</strong><br>
      sales@abridge.com
    </div>
    <span class="contact-website">abridge.com</span>
  </div>
  
  <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #E5E7EB; font-size: 8pt; color: #9CA3AF;">
    Model ID: ${modelId} • Generated ${date} • Based on 200+ health system deployments
  </div>
  
  <div class="page-number">5 of 5</div>
</div>

</body>
</html>
  `;
};

export async function generatePremiumPDF(data: PremiumPDFData): Promise<void> {
  const html = generateHTML(data);

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  document.body.appendChild(container);

  // Wait for fonts and styles to load
  await new Promise(resolve => setTimeout(resolve, 100));

  const filename = `Abridge_ROI_${data.setting.replace(/\s+/g, '_')}_${data.providers}P_${new Date().toISOString().split('T')[0]}.pdf`;

  const options = {
    margin: 0,
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: true,
      letterRendering: true,
      windowWidth: 794, // A4 width in pixels at 96dpi
      windowHeight: 1123, // A4 height in pixels at 96dpi
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const,
      compress: true,
    },
    pagebreak: { mode: ['css', 'legacy'] as const, before: '.content-page', avoid: ['tr', 'td'] },
  };

  try {
    console.log('Generating PDF with data:', data);
    await html2pdf().set(options).from(container).save();
    console.log('PDF generated successfully');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
}
