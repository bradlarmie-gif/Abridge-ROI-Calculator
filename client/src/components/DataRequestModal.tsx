import { useState } from "react";
import { Copy, Check, Send, Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DataRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generateUrl: (repName: string, orgName: string) => Promise<string>;
  orgName?: string;
}

export default function DataRequestModal({ open, onOpenChange, generateUrl, orgName: initialOrgName = "" }: DataRequestModalProps) {
  const [phase, setPhase] = useState<'setup' | 'guide'>('setup');
  const [repName, setRepName] = useState("");
  const [orgName, setOrgName] = useState(initialOrgName);
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [genError, setGenError] = useState(false);

  const reset = () => {
    setPhase('setup');
    setRepName("");
    setOrgName(initialOrgName);
    setUrl("");
    setGenerating(false);
    setCopied(false);
    setCopyFailed(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleGenerate = async () => {
    if (!repName.trim() || generating) return;
    setGenerating(true);
    setGenError(false);
    try {
      const generatedUrl = await generateUrl(repName.trim(), orgName.trim());
      setUrl(generatedUrl);
      setPhase('guide');
    } catch {
      setGenError(true);
    } finally {
      setGenerating(false);
    }
  };

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 bg-white border-0 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto" data-testid="dialog-data-request-modal">

        {phase === 'setup' ? (
          <>
            <DialogHeader className="px-7 pt-7 pb-1">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-[#FFF3EE] flex items-center justify-center">
                  <Send className="w-4 h-4 text-[#EA2C00]" />
                </div>
                <DialogTitle className="text-[#1A1A1A] text-[17px] font-semibold tracking-[-0.01em]">
                  Send a Data Request
                </DialogTitle>
              </div>
              <DialogDescription className="text-[#888888] text-[13px] mt-1 leading-relaxed">
                We'll personalize the link with your name so the partner knows who sent it.
              </DialogDescription>
            </DialogHeader>

            <div className="px-7 pt-5 pb-7 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#777777] uppercase tracking-wider mb-1.5">Your name at Abridge</label>
                <input
                  type="text"
                  value={repName}
                  onChange={e => setRepName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
                  placeholder="e.g. Sarah"
                  autoFocus
                  className="w-full bg-[#FAFAF8] border border-[#E8E2DA] rounded-xl px-4 h-11 text-sm text-[#1A1A1A] placeholder:text-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] transition-colors"
                  data-testid="input-rep-name"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#777777] uppercase tracking-wider mb-1.5">Organization name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Valley Health System"
                  className="w-full bg-[#FAFAF8] border border-[#E8E2DA] rounded-xl px-4 h-11 text-sm text-[#1A1A1A] placeholder:text-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] transition-colors"
                  data-testid="input-org-name"
                />
              </div>
              {genError && (
                <p className="text-[11px] text-red-500 -mb-2">Could not generate link — check your connection and try again.</p>
              )}
              <button
                onClick={handleGenerate}
                disabled={!repName.trim() || generating}
                className={`w-full h-11 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  repName.trim()
                    ? 'bg-[#1A1A1A] text-white hover:bg-[#333333]'
                    : 'bg-[#F0EEEC] text-[#BBBBBB] cursor-not-allowed'
                }`}
                data-testid="button-generate-link"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                ) : (
                  <>Generate Link<ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-7 pt-7 pb-1">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-[#FFF3EE] flex items-center justify-center">
                  <Send className="w-4 h-4 text-[#EA2C00]" />
                </div>
                <DialogTitle className="text-[#1A1A1A] text-[17px] font-semibold tracking-[-0.01em]">
                  Share with {orgName || "Your Partner"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-[#888888] text-[13px] mt-1 leading-relaxed">
                Send this link to whoever at {orgName || "the health system"} has access to Abridge utilization and deployment data.
              </DialogDescription>
            </DialogHeader>

            <div className="px-7 pt-5 pb-7 space-y-0">
              <div className="flex items-start gap-3.5">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-[#EA2C00] text-white flex items-center justify-center text-[11px] font-bold">1</div>
                  <div className="w-px h-full bg-[#E8E2DA] mt-1.5" />
                </div>
                <div className="flex-1 min-w-0 pb-5">
                  <p className="text-[13px] font-semibold text-[#1A1A1A] mb-2.5">Copy and send this link</p>
                  <p className="text-[12px] text-[#999999] mb-2.5 leading-relaxed">Usually the IT contact, clinical informatics lead, or whoever pulls Abridge utilization reports.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 min-w-0 bg-[#FAF8F5] border border-[#E8E2DA] rounded-lg px-3.5 py-2.5 font-mono text-[11px] text-[#666666] break-all select-all" data-testid="text-data-request-url">
                      {url}
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                        copied ? "bg-emerald-600 text-white" : "bg-[#1A1A1A] text-white hover:bg-[#333333]"
                      }`}
                      data-testid="button-copy-data-request-link"
                    >
                      {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                    </button>
                  </div>
                  {copyFailed && <p className="text-[11px] text-red-500 mt-1.5">Couldn't copy — select the link above and copy manually.</p>}
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[11px] font-bold">2</div>
                  <div className="w-px h-full bg-[#E8E2DA] mt-1.5" />
                </div>
                <div className="pb-5">
                  <p className="text-[13px] font-semibold text-[#1A1A1A]">They fill in ~10 minutes of data</p>
                  <p className="text-[12px] text-[#999999] mt-1 leading-relaxed">The link opens a form with their name pre-filled. They enter deployment details and the metrics they track — before/after values where available.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[11px] font-bold">3</div>
                </div>
                <div className="pb-1">
                  <p className="text-[13px] font-semibold text-[#1A1A1A]">They download a PDF and send it back</p>
                  <p className="text-[12px] text-[#999999] mt-1 leading-relaxed">The form generates a summary PDF of their answers. They email it back to you — you use it to finish the analysis.</p>
                </div>
              </div>

              <div className="pt-5">
                <button
                  onClick={() => handleOpenChange(false)}
                  className="w-full h-10 rounded-xl text-[13px] font-medium bg-[#F5F3F0] text-[#666666] hover:bg-[#ECEAE6] hover:text-[#1A1A1A] transition-all duration-200"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
