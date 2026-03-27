import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DataRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  careSettingLabel?: string;
}

export function DataRequestDialog({ open, onOpenChange, url, careSettingLabel }: DataRequestDialogProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setCopied(false); setCopyFailed(false); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-white border-0 shadow-2xl rounded-xl overflow-hidden" data-testid="dialog-data-request">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-[#1A1A1A] text-lg font-semibold tracking-tight">
            Send a Data Request
          </DialogTitle>
          <DialogDescription className="text-[#888888] text-sm mt-1">
            Share this link with your partner to collect their deployment data{careSettingLabel ? ` for ${careSettingLabel}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-semibold mt-0.5">
                1
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A1A1A] mb-2">Copy and share this link with your partner</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-[#F5F5F5] rounded-lg px-3 py-2.5 font-mono text-xs text-[#666666] truncate select-all" data-testid="text-data-request-url">
                    {url}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      copied
                        ? "bg-green-600 text-white"
                        : "bg-[#1A1A1A] text-white hover:bg-[#333333]"
                    }`}
                    data-testid="button-copy-link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                {copyFailed && (
                  <p className="text-[11px] text-red-500 mt-1">Couldn't copy automatically — select the link above and copy manually.</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#F0F0F0]" />

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-semibold mt-0.5">
              2
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1A1A1A]">Your partner fills out the form</p>
              <p className="text-[12px] text-[#888888] mt-0.5">
                They'll open the link and enter their deployment data for the selected care settings.
              </p>
            </div>
          </div>

          <div className="border-t border-[#F0F0F0]" />

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-semibold mt-0.5">
              3
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1A1A1A]">They send the completed data back</p>
              <p className="text-[12px] text-[#888888] mt-0.5">
                Once submitted, they'll download a PDF with their data to share with you.
              </p>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={() => { setCopied(false); onOpenChange(false); }}
              className="w-full h-[40px] rounded-lg text-sm font-medium bg-[#F5F5F5] text-[#666666] hover:bg-[#EEEEEE] hover:text-[#1A1A1A] transition-all duration-200"
              data-testid="button-close-dialog"
            >
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
