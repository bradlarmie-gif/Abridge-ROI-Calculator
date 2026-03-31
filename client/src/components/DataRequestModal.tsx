import { useState } from "react";
import { Copy, Check, Link } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DataRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
}

export default function DataRequestModal({ open, onOpenChange, url }: DataRequestModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md mx-auto p-0 overflow-hidden rounded-xl border border-[#E8E2DA] shadow-xl" data-testid="dialog-data-request-modal">
        <div className="bg-[#1A1A1A] px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-semibold font-abridge tracking-tight">
              Share with Your Partner
            </DialogTitle>
            <p className="text-[#AAAAAA] text-sm mt-1">
              Send this link so your partner can fill out the data request form.
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4 bg-white">
          {[
            { n: 1, text: "Copy the link below" },
            { n: 2, text: "Send it to your partner or internal champion" },
            { n: 3, text: "They fill out the form and send it back to you" },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#EA2C00] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {n}
              </div>
              <p className="text-sm text-[#333333] leading-snug">{text}</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 bg-white border-t border-[#F0EDEA]">
          <div className="flex items-center gap-2 mt-4 bg-[#F5F0EB] border border-[#E0D9D0] rounded-lg p-3 min-w-0">
            <Link className="w-4 h-4 text-[#999999] flex-shrink-0" />
            <span className="text-xs text-[#666666] truncate flex-1 font-mono min-w-0" data-testid="text-data-request-url">
              {url}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
              copied
                ? "bg-green-500 text-white"
                : "bg-[#EA2C00] hover:bg-[#D42800] text-white"
            }`}
            data-testid="button-copy-data-request-link"
          >
            {copied ? (
              <><Check className="w-4 h-4" /> Link Copied!</>
            ) : (
              <><Copy className="w-4 h-4" /> Copy Link</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
