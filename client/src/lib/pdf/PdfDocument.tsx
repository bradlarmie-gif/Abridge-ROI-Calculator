import { Document } from '@react-pdf/renderer';
import { CoverPage, ExecutiveSummary, ValueBreakdown, DriverDetail, TotalImpact, Assumptions } from './pages';
import { generateDriverExplanation } from './pdfContent';
import type { ModelSnapshot, ExportConfig, ScenarioSnapshot } from './pdfTypes';
import type { LeverId } from '../roi-types';

interface PdfDocumentProps {
  model: ModelSnapshot;
  config: ExportConfig;
}

export function BaselinePdfDocument({ model, config }: PdfDocumentProps) {
  const { enabledDrivers, driverValues, inputs } = model;
  
  let pageNumber = 4;
  
  return (
    <Document>
      <CoverPage model={model} config={config} />
      
      {config.includeSections.executiveSummary && (
        <ExecutiveSummary model={model} config={config} />
      )}
      
      {config.includeSections.valueBreakdown && (
        <ValueBreakdown model={model} config={config} />
      )}
      
      {config.includeSections.detailedCalculations && (
        enabledDrivers.map((driverId, index) => {
          const driverValue = driverValues[driverId] || 0;
          const explanation = generateDriverExplanation(driverId, inputs, driverValue);
          const currentPage = pageNumber + index;
          return (
            <DriverDetail
              key={driverId}
              model={model}
              config={config}
              driverId={driverId}
              driverValue={driverValue}
              explanation={explanation}
              pageNumber={currentPage}
            />
          );
        })
      )}
      
      <TotalImpact 
        model={model} 
        config={config} 
        pageNumber={pageNumber + (config.includeSections.detailedCalculations ? enabledDrivers.length : 0)} 
      />
      
      {config.includeSections.methodology && (
        <Assumptions 
          model={model} 
          config={config} 
          pageNumber={pageNumber + (config.includeSections.detailedCalculations ? enabledDrivers.length : 0) + 1} 
        />
      )}
    </Document>
  );
}

interface ScenarioPdfDocumentProps extends PdfDocumentProps {
  scenario: ScenarioSnapshot;
  baselineModel?: ModelSnapshot;
}

export function ScenarioPdfDocument({ model, config, scenario, baselineModel }: ScenarioPdfDocumentProps) {
  const { enabledDrivers, driverValues, inputs } = model;
  
  let pageNumber = 4;
  
  return (
    <Document>
      <CoverPage model={model} config={config} />
      
      {config.includeSections.executiveSummary && (
        <ExecutiveSummary model={model} config={config} />
      )}
      
      {config.includeSections.valueBreakdown && (
        <ValueBreakdown model={model} config={config} />
      )}
      
      {config.includeSections.detailedCalculations && (
        enabledDrivers.map((driverId, index) => {
          const driverValue = driverValues[driverId] || 0;
          const explanation = generateDriverExplanation(driverId, inputs, driverValue);
          const currentPage = pageNumber + index;
          return (
            <DriverDetail
              key={driverId}
              model={model}
              config={config}
              driverId={driverId}
              driverValue={driverValue}
              explanation={explanation}
              pageNumber={currentPage}
            />
          );
        })
      )}
      
      <TotalImpact 
        model={model} 
        config={config} 
        pageNumber={pageNumber + (config.includeSections.detailedCalculations ? enabledDrivers.length : 0)} 
      />
      
      {config.includeSections.methodology && (
        <Assumptions 
          model={model} 
          config={config} 
          pageNumber={pageNumber + (config.includeSections.detailedCalculations ? enabledDrivers.length : 0) + 1} 
        />
      )}
    </Document>
  );
}

interface ComparisonPdfDocumentProps extends PdfDocumentProps {
  scenarios: ScenarioSnapshot[];
  baselineModel: ModelSnapshot;
}

export function ComparisonPdfDocument({ model, config, scenarios, baselineModel }: ComparisonPdfDocumentProps) {
  return (
    <Document>
      <CoverPage model={baselineModel} config={config} />
      
      {config.includeSections.executiveSummary && (
        <ExecutiveSummary model={baselineModel} config={config} />
      )}
      
      {config.includeSections.valueBreakdown && (
        <ValueBreakdown model={baselineModel} config={config} />
      )}
      
      <TotalImpact model={baselineModel} config={config} pageNumber={4} />
      
      {config.includeSections.methodology && (
        <Assumptions model={baselineModel} config={config} pageNumber={5} />
      )}
    </Document>
  );
}

export function createPdfDocument(
  model: ModelSnapshot,
  config: ExportConfig,
  scenario?: ScenarioSnapshot,
  scenarios?: ScenarioSnapshot[],
  baselineModel?: ModelSnapshot
): JSX.Element {
  switch (config.exportType) {
    case 'baseline':
      return <BaselinePdfDocument model={model} config={config} />;
    case 'scenario':
      if (!scenario) {
        throw new Error('Scenario is required for scenario export');
      }
      return <ScenarioPdfDocument model={model} config={config} scenario={scenario} baselineModel={baselineModel} />;
    case 'comparison':
      if (!scenarios || scenarios.length === 0) {
        throw new Error('Scenarios are required for comparison export');
      }
      if (!baselineModel) {
        throw new Error('Baseline model is required for comparison export');
      }
      return <ComparisonPdfDocument model={model} config={config} scenarios={scenarios} baselineModel={baselineModel} />;
    default:
      return <BaselinePdfDocument model={model} config={config} />;
  }
}
