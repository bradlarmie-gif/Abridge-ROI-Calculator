import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, Building2, User, Share2, ExternalLink, Smartphone } from "lucide-react";

interface PDFExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (clientName: string, preparedBy: string) => Promise<void>;
  isExporting: boolean;
  documentType?: string;
}

export function PDFExportModal({ open, onClose, onExport, isExporting, documentType = "assessment" }: PDFExportModalProps) {
  const [clientName, setClientName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleExport = async () => {
    try {
      await onExport(clientName || "Your Organization", preparedBy || "Abridge");
      if (isMobile) {
        setShowMobileHint(true);
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleClose = () => {
    setShowMobileHint(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-[#EA2C00]" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Personalize your PDF report with partner and preparer details.
          </DialogDescription>
        </DialogHeader>

        {showMobileHint ? (
          <div className="py-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Share2 className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-center text-lg font-semibold text-[#111827] mb-2">PDF Ready!</h3>
            <p className="text-center text-sm text-[#6B7280] mb-4">
              Your PDF should open in a new tab. From there you can:
            </p>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Share2 className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-[#111827] text-sm">Share</div>
                  <div className="text-xs text-[#6B7280]">Tap the share button to email, message, or save</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-[#111827] text-sm">Open in Files</div>
                  <div className="text-xs text-[#6B7280]">Save to your device to share later</div>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleClose}
              className="w-full mt-4 bg-[#EA2C00] hover:bg-[#d12700] text-white"
              data-testid="button-close-mobile-hint"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Hospital / Health System Name
                </Label>
                <Input
                  id="clientName"
                  placeholder="e.g., ABC Hospital"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  data-testid="input-client-name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="preparedBy" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Prepared By
                </Label>
                <Input
                  id="preparedBy"
                  placeholder="e.g., Sarah Johnson, Sales Director"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  data-testid="input-prepared-by"
                />
              </div>

              {isMobile && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    On mobile, the PDF will open in a new tab. Use your browser's share button to email or save it.
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isExporting}
                className="w-full sm:w-auto"
                data-testid="button-cancel-export"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full sm:w-auto bg-[#EA2C00] hover:bg-[#d12700] text-white"
                data-testid="button-generate-pdf"
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Generate PDF
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
