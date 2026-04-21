import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createShortLink } from "@/lib/shortLinks";
import { encodeStateToUrl } from "@/lib/forecastUrlState";
import type { ForecastState } from "../types";

export function ExportDialog({
  open,
  onOpenChange,
  state,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  state: ForecastState;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"pdf" | "share">("pdf");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      const mod = await import("@/components/forecast/ForecastPDFExport");
      await mod.generateForecastPDF(state);
      toast({
        title: "Forecast PDF saved",
        description: "Your download has started.",
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "PDF export failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleGenerateShareLink = async () => {
    setShareBusy(true);
    try {
      const payload = encodeStateToUrl(state);
      const url = await createShortLink("forecast_state", payload);
      setShareUrl(url);
      setCopied(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Couldn't create share link",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "Copy failed",
        description: "Long-press to copy manually.",
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setShareUrl("");
    setCopied(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md" data-testid="dialog-export">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Forecast
          </DialogTitle>
          <DialogDescription>
            Download a 9-page PDF or generate a private share link (valid 30 days).
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex rounded-md border border-neutral-200 p-0.5 bg-neutral-50 self-start">
          <button
            type="button"
            data-testid="btn-export-tab-pdf"
            onClick={() => setTab("pdf")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === "pdf"
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            PDF
          </button>
          <button
            type="button"
            data-testid="btn-export-tab-share"
            onClick={() => setTab("share")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === "share"
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Share link
          </button>
        </div>

        {tab === "pdf" && (
          <div className="space-y-3 py-2" data-testid="panel-export-pdf">
            <p className="text-sm text-neutral-700">
              Generates a partner-ready PDF including executive summary, baseline,
              forward forecast assumptions, value extrapolation, pricing comparison,
              and recommendations.
            </p>
            <ul className="text-xs text-neutral-500 space-y-1 pl-4 list-disc">
              <li>9 pages (8 if no encounter-mode pricing)</li>
              <li>Embedded charts and methodology footnotes</li>
              <li>Filename includes partner name + date</li>
            </ul>
          </div>
        )}

        {tab === "share" && (
          <div className="space-y-3 py-2" data-testid="panel-export-share">
            <p className="text-sm text-neutral-700">
              Creates a private link anyone with the URL can open. Forecast state
              is stored on Abridge servers for 30 days.
            </p>
            {shareUrl ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="flex-1 font-sans text-xs"
                    data-testid="input-share-url"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    data-testid="btn-copy-share-url"
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  Expires in 30 days · revoke by deleting the link in your records.
                </p>
              </div>
            ) : (
              <Button
                onClick={handleGenerateShareLink}
                disabled={shareBusy}
                variant="outline"
                className="w-full"
                data-testid="btn-generate-share-link"
              >
                {shareBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5 mr-2" /> Generate share link
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="btn-export-cancel"
          >
            Close
          </Button>
          {tab === "pdf" && (
            <Button
              onClick={handlePdf}
              disabled={pdfBusy}
              className="bg-[#EA2C00] hover:bg-[#C92500] text-white"
              data-testid="btn-export-pdf-download"
            >
              {pdfBusy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
