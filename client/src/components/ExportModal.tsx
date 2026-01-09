import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, Loader2, Check, Download, X } from "lucide-react";
import type { RoiInputs, LeverId } from "@/lib/roi-types";
import { calculateRoi } from "@/lib/roi-calculator";
import { 
  createPdfDocument, 
  generateFilename,
  type ModelSnapshot, 
  type ScenarioSnapshot,
  type ExportConfig 
} from "@/lib/pdf";

export type ExportType = 'baseline' | 'scenario' | 'comparison';

export interface ScenarioData {
  id: string;
  name: string;
  type: 'expand_providers' | 'add_drivers' | 'new_care_setting';
  description: string;
  inputs: RoiInputs;
  results: ReturnType<typeof calculateRoi>;
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: ExportType;
  inputs: RoiInputs;
  results: ReturnType<typeof calculateRoi>;
  enabledDrivers: LeverId[];
  driverValues: Record<LeverId, number>;
  careSettingLabel: string;
  scenario?: ScenarioData;
  scenarios?: ScenarioData[];
}

export function ExportModal({
  open,
  onOpenChange,
  exportType,
  inputs,
  results,
  enabledDrivers,
  driverValues,
  careSettingLabel,
  scenario,
  scenarios = [],
}: ExportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [preparedFor, setPreparedFor] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [includeSections, setIncludeSections] = useState({
    executiveSummary: true,
    valueBreakdown: true,
    detailedCalculations: true,
    methodology: true,
  });
  const [includeBaselineComparison, setIncludeBaselineComparison] = useState(true);

  const createModelSnapshot = (): ModelSnapshot => ({
    inputs,
    results,
    enabledDrivers,
    driverValues,
    careSettingLabel,
    organizationName: organizationName || undefined,
    preparedFor: preparedFor || undefined,
    preparedBy: preparedBy || undefined,
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  });

  const createScenarioSnapshot = (scenarioData: ScenarioData): ScenarioSnapshot => {
    const scenarioDriverValues: Record<LeverId, number> = {} as Record<LeverId, number>;
    const scenarioEnabledDrivers: LeverId[] = [];
    
    scenarioData.results.levers.forEach(lever => {
      scenarioDriverValues[lever.id] = lever.value;
      if (lever.enabled) {
        scenarioEnabledDrivers.push(lever.id);
      }
    });
    
    return {
      id: scenarioData.id,
      name: scenarioData.name,
      type: scenarioData.type,
      description: scenarioData.description,
      inputs: scenarioData.inputs,
      results: scenarioData.results,
      enabledDrivers: scenarioEnabledDrivers,
      driverValues: scenarioDriverValues,
      careSettingLabel,
      organizationName: organizationName || undefined,
      preparedFor: preparedFor || undefined,
      preparedBy: preparedBy || undefined,
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsSuccess(false);

    try {
      const model = createModelSnapshot();
      
      const config: ExportConfig = {
        exportType,
        includeSections,
        includeBaselineComparison,
        scenario: scenario ? createScenarioSnapshot(scenario) : undefined,
        scenarios: scenarios.map(s => createScenarioSnapshot(s)),
      };

      let pdfDocument: JSX.Element;
      let filename: string;

      if (exportType === 'baseline') {
        pdfDocument = createPdfDocument(model, config);
        filename = generateFilename('baseline', organizationName);
      } else if (exportType === 'scenario' && scenario) {
        const scenarioSnapshot = createScenarioSnapshot(scenario);
        pdfDocument = createPdfDocument(
          scenarioSnapshot, 
          config, 
          scenarioSnapshot, 
          undefined, 
          includeBaselineComparison ? model : undefined
        );
        filename = generateFilename('scenario', organizationName, scenario.name);
      } else if (exportType === 'comparison' && scenarios.length > 0) {
        const scenarioSnapshots = scenarios.map(s => createScenarioSnapshot(s));
        pdfDocument = createPdfDocument(
          model, 
          config, 
          undefined, 
          scenarioSnapshots, 
          model
        );
        filename = generateFilename('comparison', organizationName);
      } else {
        throw new Error('Invalid export configuration');
      }

      const blob = await pdf(pdfDocument).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsSuccess(true);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    onOpenChange(false);
  };

  const getExportTitle = () => {
    switch (exportType) {
      case 'baseline':
        return 'Export Baseline Model';
      case 'scenario':
        return `Export Scenario: ${scenario?.name || 'Scenario'}`;
      case 'comparison':
        return 'Export Scenario Comparison';
      default:
        return 'Generate PDF Export';
    }
  };

  const getExportDescription = () => {
    switch (exportType) {
      case 'baseline':
        return 'Generate a professional multi-page PDF with detailed analysis and explanations.';
      case 'scenario':
        return 'Generate a PDF comparing this scenario to your baseline model.';
      case 'comparison':
        return `Generate a side-by-side comparison of ${scenarios.length} scenarios.`;
      default:
        return 'Choose options for your PDF export.';
    }
  };

  const getEstimatedPages = () => {
    let pages = 2;
    if (includeSections.executiveSummary) pages += 1;
    if (includeSections.valueBreakdown) pages += 1;
    if (includeSections.detailedCalculations) pages += enabledDrivers.length;
    if (includeSections.methodology) pages += 1;
    if (exportType === 'scenario') pages += 1;
    if (exportType === 'comparison') pages += scenarios.length + 1;
    return `${pages}-${pages + 1} pages`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#E8532F]" />
            {getExportTitle()}
          </DialogTitle>
          <DialogDescription>
            {getExportDescription()}
          </DialogDescription>
        </DialogHeader>

        {!isSuccess ? (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                What would you like to include in this PDF?
              </Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="exec-summary"
                    checked={includeSections.executiveSummary}
                    onCheckedChange={(checked) =>
                      setIncludeSections((prev) => ({
                        ...prev,
                        executiveSummary: checked === true,
                      }))
                    }
                    data-testid="checkbox-exec-summary"
                  />
                  <Label htmlFor="exec-summary" className="text-sm font-normal cursor-pointer">
                    Executive Summary
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="value-breakdown"
                    checked={includeSections.valueBreakdown}
                    onCheckedChange={(checked) =>
                      setIncludeSections((prev) => ({
                        ...prev,
                        valueBreakdown: checked === true,
                      }))
                    }
                    data-testid="checkbox-value-breakdown"
                  />
                  <Label htmlFor="value-breakdown" className="text-sm font-normal cursor-pointer">
                    Value Breakdown
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="detailed-calc"
                    checked={includeSections.detailedCalculations}
                    onCheckedChange={(checked) =>
                      setIncludeSections((prev) => ({
                        ...prev,
                        detailedCalculations: checked === true,
                      }))
                    }
                    data-testid="checkbox-detailed-calc"
                  />
                  <Label htmlFor="detailed-calc" className="text-sm font-normal cursor-pointer">
                    Detailed Calculations (step-by-step math for each driver)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="methodology"
                    checked={includeSections.methodology}
                    onCheckedChange={(checked) =>
                      setIncludeSections((prev) => ({
                        ...prev,
                        methodology: checked === true,
                      }))
                    }
                    data-testid="checkbox-methodology"
                  />
                  <Label htmlFor="methodology" className="text-sm font-normal cursor-pointer">
                    Assumptions & Methodology
                  </Label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name" className="text-sm font-medium">
                  Organization name (optional)
                </Label>
                <Input
                  id="org-name"
                  placeholder="e.g., Memorial Health System"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  data-testid="input-org-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prepared-for" className="text-sm font-medium">
                  Prepared for (optional)
                </Label>
                <Input
                  id="prepared-for"
                  placeholder="e.g., CFO Review or Board Presentation"
                  value={preparedFor}
                  onChange={(e) => setPreparedFor(e.target.value)}
                  data-testid="input-prepared-for"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prepared-by" className="text-sm font-medium">
                  Prepared by (optional)
                </Label>
                <Input
                  id="prepared-by"
                  placeholder="e.g., Finance Team"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  data-testid="input-prepared-by"
                />
              </div>
            </div>

            {exportType === 'scenario' && (
              <div className="border-t pt-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="include-baseline"
                    checked={includeBaselineComparison}
                    onCheckedChange={(checked) =>
                      setIncludeBaselineComparison(checked === true)
                    }
                    data-testid="checkbox-include-baseline"
                  />
                  <Label htmlFor="include-baseline" className="text-sm font-normal cursor-pointer">
                    Include baseline comparison
                  </Label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-neutral-500 border-t pt-4">
              <span>Estimated length: <span className="font-medium">{getEstimatedPages()}</span></span>
              <span>Format: <span className="font-medium">PDF</span></span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                data-testid="button-cancel-export"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#E8532F] hover:bg-[#d14a2a]"
                onClick={handleGenerate}
                disabled={isGenerating}
                data-testid="button-generate-pdf"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">PDF Generated Successfully</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Check your downloads folder for the file.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleGenerate}
                data-testid="button-download-again"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Again
              </Button>
              <Button
                className="flex-1"
                onClick={handleClose}
                data-testid="button-close-export"
              >
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
