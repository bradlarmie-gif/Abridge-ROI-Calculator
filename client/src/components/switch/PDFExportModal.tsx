import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, Building2, User } from "lucide-react";

interface PDFExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (clientName: string, preparedBy: string) => void;
  isGenerating: boolean;
}

export function PDFExportModal({ open, onOpenChange, onExport, isGenerating }: PDFExportModalProps) {
  const [clientName, setClientName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  const handleExport = () => {
    onExport(clientName || "Your Organization", preparedBy || "Abridge");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-[#EA2C00]" />
            Export Assessment Report
          </DialogTitle>
          <DialogDescription>
            Personalize your PDF report with client and preparer details.
          </DialogDescription>
        </DialogHeader>

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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            data-testid="button-cancel-export"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isGenerating}
            className="bg-[#EA2C00] hover:bg-[#d12700] text-white"
            data-testid="button-generate-pdf"
          >
            {isGenerating ? (
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
      </DialogContent>
    </Dialog>
  );
}
