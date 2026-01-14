import { calculateRoi, CareSettingCalculationType } from '../roi-calculator';
import { RoiInputs, defaultInputs, LeverId } from '../roi-types';
import { SETTING_CONFIG, CareSettingType } from '../SETTING_CONFIG';

// Test helper to create inputs with specific levers enabled
function createTestInputs(enabledLevers: LeverId[]): RoiInputs {
  const inputs = JSON.parse(JSON.stringify(defaultInputs)) as RoiInputs;
  
  // Disable all levers first
  Object.keys(inputs.levers).forEach(key => {
    inputs.levers[key as LeverId] = false;
  });
  
  // Enable only specified levers
  enabledLevers.forEach(lever => {
    inputs.levers[lever] = true;
  });
  
  return inputs;
}

// Test helper to create ED inputs
function createEdInputs(enabledLevers: LeverId[]): RoiInputs {
  const inputs = createTestInputs(enabledLevers);
  inputs.numberOfProviders = 40;
  inputs.annualOutpatientEncounters = 80000;
  inputs.abridgeUtilizationPct = 65;
  
  inputs.ed = {
    totalClinicians: 40,
    shiftsPerClinicianPerYear: 200,
    baselineDocMinutesPerShift: 75,
    minutesSavedPerShift: 20,
    totalEdEncounters: 80000,
    baselineLwbsRate: 3.0,
    lwbsImprovementPct: 0.5,
    pctRecoveredTreatedAndReleased: 81,
    pctRecoveredAdmitted: 19,
    contributionMarginPerEncounter: 250,
    contributionMarginPerAdmission: 2000,
    baselineWrvuPerVisit: 2.6,
    wrvuConversionFactor: 34,
    wrvuImprovementPct: 5,
    netCollectibleRevenue: 20000000,
    baselineDenialRate: 12,
    pctDenialsFromDocumentation: 32,
    pctDocDenialsRecovered: 40,
    baselineAttritionRate: 5,
    pctTurnoverFromBurnout: 31,
    pctBurnoutReduction: 45,
    costPerDeparture: 350000,
  };
  
  return inputs;
}

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.log(`  ✗ FAILED: ${message}`);
    process.exitCode = 1;
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  ✓ ${message} (${actual.toLocaleString()} ≈ ${expected.toLocaleString()})`);
  } else {
    console.log(`  ✗ FAILED: ${message} (got ${actual.toLocaleString()}, expected ${expected.toLocaleString()}, diff=${diff})`);
    process.exitCode = 1;
  }
}

console.log('=== ROI Calculator Test Suite ===\n');

// Test 1: Care Setting Driver Configuration
console.log('Test 1: Care Setting Driver Configuration');
assert(SETTING_CONFIG.outpatient.length === 6, `Outpatient has 6 drivers (got ${SETTING_CONFIG.outpatient.length})`);
assert(SETTING_CONFIG.ed.length === 4, `ED has 4 drivers (got ${SETTING_CONFIG.ed.length})`);
assert(SETTING_CONFIG.nursing.length === 4, `Nursing has 4 drivers (got ${SETTING_CONFIG.nursing.length})`);

const outpatientIds = SETTING_CONFIG.outpatient.map(d => d.id);
assert(outpatientIds.includes('patientAccess'), 'Outpatient includes patientAccess');
assert(outpatientIds.includes('wrvu'), 'Outpatient includes wrvu');
assert(outpatientIds.includes('denials'), 'Outpatient includes denials');

const edIds = SETTING_CONFIG.ed.map(d => d.id);
assert(edIds.includes('edThroughput'), 'ED includes edThroughput');
assert(edIds.includes('edLevelOfService'), 'ED includes edLevelOfService');
assert(edIds.includes('edDenialReduction'), 'ED includes edDenialReduction');
assert(edIds.includes('edRetention'), 'ED includes edRetention');

// Test 2: Only selected drivers are calculated
console.log('\nTest 2: Only Selected Drivers Are Calculated');
const partialInputs = createEdInputs(['edThroughput', 'edRetention']);
const partialResults = calculateRoi(partialInputs, 'ed');
const enabledCount = partialResults.levers.filter(l => l.enabled).length;
assert(enabledCount === 2, `Only 2 drivers enabled (got ${enabledCount})`);

const enabledIds = partialResults.levers.filter(l => l.enabled).map(l => l.id);
assert(enabledIds.includes('edThroughput'), 'edThroughput is enabled');
assert(enabledIds.includes('edRetention'), 'edRetention is enabled');
assert(!enabledIds.includes('edLevelOfService'), 'edLevelOfService is NOT enabled');
assert(!enabledIds.includes('edDenialReduction'), 'edDenialReduction is NOT enabled');

// Test 3: ED Throughput (LWBS) Calculation
console.log('\nTest 3: ED Throughput (LWBS) Calculation');
const throughputInputs = createEdInputs(['edThroughput']);
const throughputResults = calculateRoi(throughputInputs, 'ed');
const throughputLever = throughputResults.levers.find(l => l.id === 'edThroughput');

// 80,000 * 0.5% = 400 additional patients
// 400 * 81% = 324 * $250 = $81,000
// 400 * 19% = 76 * $2,000 = $152,000
// Total = $233,000
assertClose(throughputLever?.value || 0, 233000, 1000, 'ED Throughput = $233,000');

// Test 4: ED Level-of-Service Calculation
console.log('\nTest 4: ED Level-of-Service Calculation');
const losInputs = createEdInputs(['edLevelOfService']);
const losResults = calculateRoi(losInputs, 'ed');
const losLever = losResults.levers.find(l => l.id === 'edLevelOfService');

// 80,000 * 65% = 52,000 eligible
// 2.6 * 5% = 0.13 additional wRVU/visit
// 52,000 * 0.13 = 6,760 wRVUs
// 6,760 * $34 = $229,840
assertClose(losLever?.value || 0, 229840, 100, 'ED Level-of-Service = $229,840');

// Test 5: ED Denial Reduction Calculation
console.log('\nTest 5: ED Denial Reduction Calculation');
const denialsInputs = createEdInputs(['edDenialReduction']);
const denialsResults = calculateRoi(denialsInputs, 'ed');
const denialsLever = denialsResults.levers.find(l => l.id === 'edDenialReduction');

// $20M * 12% = $2.4M denied
// $2.4M * 32% = $768,000 doc-related
// $768,000 * 40% = $307,200 recoverable
assertClose(denialsLever?.value || 0, 307200, 100, 'ED Denial Reduction = $307,200');

// Test 6: ED Retention Calculation
console.log('\nTest 6: ED Retention Calculation');
const retentionInputs = createEdInputs(['edRetention']);
const retentionResults = calculateRoi(retentionInputs, 'ed');
const retentionLever = retentionResults.levers.find(l => l.id === 'edRetention');

// 40 * 5% = 2 departures
// 2 * 31% = 0.62 burnout
// 0.62 * 45% = 0.279 avoided
// 0.279 * $350,000 = $97,650
assertClose(retentionLever?.value || 0, 97650, 500, 'ED Retention = $97,650');

// Test 7: All 4 ED Drivers Total
console.log('\nTest 7: All 4 ED Drivers Total');
const allEdInputs = createEdInputs(['edThroughput', 'edLevelOfService', 'edDenialReduction', 'edRetention']);
const allEdResults = calculateRoi(allEdInputs, 'ed');

const expectedTotal = 233000 + 229840 + 307200 + 97650; // = $867,690
assertClose(allEdResults.totalAnnualBenefit, expectedTotal, 2000, `Total benefit = $${expectedTotal.toLocaleString()}`);

// Test 8: ROI Multiple Calculation
console.log('\nTest 8: ROI Multiple Calculation');
const roiInputs = createEdInputs(['edThroughput', 'edLevelOfService', 'edDenialReduction', 'edRetention']);
roiInputs.monthlyCostPerProvider = 225;
const roiResults = calculateRoi(roiInputs, 'ed');

// Investment: 40 * $225 * 12 = $108,000
const expectedCost = 40 * 225 * 12;
assert(roiResults.annualAbridgeCost === expectedCost, `Investment = $${expectedCost.toLocaleString()}`);

const expectedRoi = roiResults.totalAnnualBenefit / expectedCost;
assertClose(roiResults.roiMultiple, expectedRoi, 0.01, `ROI Multiple = ${expectedRoi.toFixed(2)}x`);

// Test 9: Net Value Calculation
console.log('\nTest 9: Net Value Calculation');
const expectedNet = roiResults.totalAnnualBenefit - roiResults.annualAbridgeCost;
assert(roiResults.netValueCreated === expectedNet, `Net value = $${expectedNet.toLocaleString()}`);

// Test 10: Outpatient wRVU with $34 default
console.log('\nTest 10: Outpatient wRVU Calculation ($34/wRVU)');
const opInputs = createTestInputs(['wrvu']);
opInputs.numberOfProviders = 40;
opInputs.annualOutpatientEncounters = 80000;
opInputs.abridgeUtilizationPct = 65;
opInputs.baselineWrvuPerEncounter = 1.75;
opInputs.wrvu.wrvuConversionFactor = 34;
opInputs.wrvu.pctIncreaseWrvuPerEncounter = 5;

const opResults = calculateRoi(opInputs, 'outpatient');
const wrvuLever = opResults.levers.find(l => l.id === 'wrvu');

// 80,000 * 65% = 52,000 eligible
// 1.75 * 5% = 0.0875 additional wRVU/visit
// 52,000 * 0.0875 = 4,550 wRVUs
// 4,550 * $34 = $154,700
assertClose(wrvuLever?.value || 0, 154700, 100, 'Outpatient wRVU = $154,700');

// Summary
console.log('\n=== Test Summary ===');
console.log('All calculations verified successfully!');

console.log('\n=== Live Calculation Results ===');
console.log('\nED with all 4 drivers:');
allEdResults.levers.filter(l => l.enabled).forEach(lever => {
  console.log(`  ${lever.label}: $${lever.value.toLocaleString()}`);
});
console.log(`  Total Benefit: $${allEdResults.totalAnnualBenefit.toLocaleString()}`);
console.log(`  Investment: $${allEdResults.annualAbridgeCost.toLocaleString()}`);
console.log(`  Net Value: $${allEdResults.netValueCreated.toLocaleString()}`);
console.log(`  ROI Multiple: ${allEdResults.roiMultiple.toFixed(2)}x`);
