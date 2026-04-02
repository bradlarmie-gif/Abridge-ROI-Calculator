import { useState, useCallback } from "react";
import { Copy, Check, Loader2, ArrowRight, Stethoscope, Zap, ClipboardList, HeartPulse, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export interface CareSettingOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CARE_SETTINGS: CareSettingOption[] = [
  { id: 'outpatient', label: 'Outpatient', desc: 'Primary care & specialty', icon: Stethoscope },
  { id: 'ed', label: 'Emergency', desc: 'Emergency department', icon: Zap },
  { id: 'inpatient', label: 'Inpatient', desc: 'Hospital medicine', icon: ClipboardList },
  { id: 'nursing', label: 'Nursing', desc: 'Inpatient nursing', icon: HeartPulse },
];

interface DataRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generateUrl: (settings: string[], repName: string, orgName: string) => Promise<string>;
  careSettingOptions?: CareSettingOption[];
  singleSelect?: boolean;
  defaultOrgName?: string;
}

export function DataRequestDialog({ open, onOpenChange, generateUrl, careSettingOptions, singleSelect = false, defaultOrgName = "" }: DataRequestDialogProps) {
  const visibleSettings = careSettingOptions ?? CARE_SETTINGS;
  const [phase, setPhase] = useState<'pick' | 'guide'>('pick');
  const [selected, setSelected] = useState<string[]>([]);
  const [repName, setRepName] = useState("");
  const [orgName, setOrgName] = useState(defaultOrgName);
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setPhase('pick');
    setSelected([]);
    setRepName("");
    setOrgName(defaultOrgName);
    setUrl('');
    setCopied(false);
    setCopyFailed(false);
    setGenerating(false);
  }, [defaultOrgName]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  }, [onOpenChange, reset]);

  const toggleSetting = (id: string) => {
    if (singleSelect) {
      setSelected(prev => prev.includes(id) ? [] : [id]);
    } else {
      setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    }
  };

  const handleContinue = async () => {
    if (selected.length === 0 || !repName.trim() || generating) return;
    setGenerating(true);
    try {
      const generatedUrl = await generateUrl(selected, repName.trim(), orgName.trim());
      setUrl(generatedUrl);
      setPhase('guide');
    } catch {
      toast({ title: "Could not generate link", description: "Something went wrong. Please try again.", variant: "destructive" });
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

  const settingLabels = selected.map(id => visibleSettings.find(s => s.id === id)?.label).filter(Boolean).join(' & ');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 bg-white border-0 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto" data-testid="dialog-data-request">

        {phase === 'pick' ? (
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
              <DialogDescription className="text-[#888888] text-[13px] mt-1.5 leading-relaxed">
                We'll personalize the link so the partner knows who sent it and why.
              </DialogDescription>
            </DialogHeader>

            <div className="px-7 pt-4 pb-7 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#777777] uppercase tracking-wider mb-1.5">Your name at Abridge</label>
                  <input
                    type="text"
                    value={repName}
                    onChange={e => setRepName(e.target.value)}
                    placeholder="e.g. Sarah"
                    autoFocus
                    className="w-full bg-[#FAFAF8] border border-[#E8E2DA] rounded-xl px-3.5 h-10 text-sm text-[#1A1A1A] placeholder:text-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] transition-colors"
                    data-testid="input-rep-name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#777777] uppercase tracking-wider mb-1.5">Organization</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="e.g. Valley Health"
                    className="w-full bg-[#FAFAF8] border border-[#E8E2DA] rounded-xl px-3.5 h-10 text-sm text-[#1A1A1A] placeholder:text-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] transition-colors"
                    data-testid="input-org-name"
                  />
                </div>
              </div>
              <div className="border-t border-[#F0EEEC] pt-4">
                <p className="text-[11px] font-medium text-[#777777] uppercase tracking-wider mb-2.5">{singleSelect ? 'Care Setting' : 'Care Settings'}</p>
              </div>
              <div className={`grid gap-2.5 ${visibleSettings.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {visibleSettings.map(setting => {
                  const Icon = setting.icon;
                  const isSelected = selected.includes(setting.id);
                  return (
                    <button
                      key={setting.id}
                      onClick={() => toggleSetting(setting.id)}
                      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-[1.5px] text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-[#EA2C00] bg-[#FFF8F5] shadow-[0_0_0_1px_rgba(234,44,0,0.08)]'
                          : 'border-[#E8E2DA] bg-[#FAFAF8] hover:border-[#D0C8BF] hover:bg-[#F7F4F0]'
                      }`}
                      data-testid={`pick-setting-${setting.id}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
                        isSelected ? 'bg-[#EA2C00]' : 'bg-white border border-[#E8E2DA]'
                      }`}>
                        <Icon className={`w-[18px] h-[18px] ${isSelected ? 'text-white' : 'text-[#999999]'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-semibold leading-tight ${isSelected ? 'text-[#1A1A1A]' : 'text-[#555555]'}`}>{setting.label}</p>
                        <p className="text-[11px] text-[#AAAAAA] leading-tight mt-0.5">{setting.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#EA2C00] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleContinue}
                disabled={selected.length === 0 || !repName.trim() || generating}
                className={`w-full h-11 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  selected.length > 0 && repName.trim()
                    ? 'bg-[#1A1A1A] text-white hover:bg-[#333333] shadow-sm'
                    : 'bg-[#F0EEEC] text-[#BBBBBB] cursor-not-allowed'
                }`}
                data-testid="button-continue-data-request"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating link…
                  </>
                ) : (
                  <>
                    Generate Link
                    {selected.length > 0 && <ArrowRight className="w-4 h-4" />}
                  </>
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
                Send this link to whoever at {orgName || "the health system"} has access to deployment data for {settingLabels}.
              </DialogDescription>
            </DialogHeader>

            <div className="px-7 pt-5 pb-7 space-y-0">
              <div className="flex items-start gap-3.5">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-[#EA2C00] text-white flex items-center justify-center text-[11px] font-bold">1</div>
                  <div className="w-px h-full bg-[#E8E2DA] mt-1.5" />
                </div>
                <div className="flex-1 min-w-0 pb-5">
                  <p className="text-[13px] font-semibold text-[#1A1A1A] mb-2.5">Copy and share this link</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 min-w-0 bg-[#FAF8F5] border border-[#E8E2DA] rounded-lg px-3.5 py-2.5 font-mono text-[11px] text-[#666666] break-all select-all" data-testid="text-data-request-url">
                      {url}
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                        copied ? "bg-emerald-600 text-white" : "bg-[#1A1A1A] text-white hover:bg-[#333333]"
                      }`}
                      data-testid="button-copy-link"
                    >
                      {copied ? (<><Check className="w-3.5 h-3.5" />Copied!</>) : (<><Copy className="w-3.5 h-3.5" />Copy</>)}
                    </button>
                  </div>
                  {copyFailed && (
                    <p className="text-[11px] text-red-500 mt-1.5">Couldn't copy — select the link above and copy manually.</p>
                  )}
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
                  data-testid="button-close-dialog"
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
