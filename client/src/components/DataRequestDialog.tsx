import { useState, useCallback } from "react";
import { Copy, Check, Loader2, ArrowRight, Stethoscope, Zap, ClipboardList, HeartPulse } from "lucide-react";
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
  generateUrl: (settings: string[]) => Promise<string>;
  careSettingOptions?: CareSettingOption[];
  singleSelect?: boolean;
}

export function DataRequestDialog({ open, onOpenChange, generateUrl, careSettingOptions, singleSelect = false }: DataRequestDialogProps) {
  const visibleSettings = careSettingOptions ?? CARE_SETTINGS;
  const [phase, setPhase] = useState<'pick' | 'guide'>('pick');
  const [selected, setSelected] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setPhase('pick');
    setSelected([]);
    setUrl('');
    setCopied(false);
    setCopyFailed(false);
    setGenerating(false);
  }, []);

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
    if (selected.length === 0 || generating) return;
    setGenerating(true);
    try {
      const generatedUrl = await generateUrl(selected);
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
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 bg-white border-0 shadow-2xl rounded-xl overflow-hidden" data-testid="dialog-data-request">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-[#1A1A1A] text-lg font-semibold tracking-tight">
            {phase === 'pick' ? 'Data Request' : 'Send a Data Request'}
          </DialogTitle>
          <DialogDescription className="text-[#888888] text-sm mt-1">
            {phase === 'pick'
              ? 'Select the care settings you need data for.'
              : `Share this link with your partner to collect their deployment data for ${settingLabels}.`}
          </DialogDescription>
        </DialogHeader>

        {phase === 'pick' ? (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              {visibleSettings.map(setting => {
                const Icon = setting.icon;
                const isSelected = selected.includes(setting.id);
                return (
                  <button
                    key={setting.id}
                    onClick={() => toggleSetting(setting.id)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#EA2C00] bg-[#FFF8F5]'
                        : 'border-[#E8E2DA] bg-[#FAF8F5] hover:border-[#D0C8BF]'
                    }`}
                    data-testid={`pick-setting-${setting.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-[#EA2C00]' : 'bg-white shadow-sm'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#999999]'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-[#1A1A1A]' : 'text-[#666666]'}`}>{setting.label}</p>
                      <p className="text-[10px] text-[#AAAAAA] leading-tight">{setting.desc}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#EA2C00] flex-shrink-0 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleContinue}
              disabled={selected.length === 0 || generating}
              className={`w-full h-[42px] rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                selected.length > 0
                  ? 'bg-[#1A1A1A] text-white hover:bg-[#333333]'
                  : 'bg-[#F0F0F0] text-[#BBBBBB] cursor-not-allowed'
              }`}
              data-testid="button-continue-data-request"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating link...
                </>
              ) : (
                <>
                  Continue
                  {selected.length > 0 && <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-5">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-semibold mt-0.5">1</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1A1A1A] mb-2">Copy and share this link with your partner</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 bg-[#F5F5F5] rounded-lg px-3 py-2.5 font-mono text-xs text-[#666666] truncate select-all" data-testid="text-data-request-url">
                      {url}
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        copied ? "bg-green-600 text-white" : "bg-[#1A1A1A] text-white hover:bg-[#333333]"
                      }`}
                      data-testid="button-copy-link"
                    >
                      {copied ? (<><Check className="w-3.5 h-3.5" />Copied</>) : (<><Copy className="w-3.5 h-3.5" />Copy</>)}
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
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-semibold mt-0.5">2</div>
              <div>
                <p className="text-[13px] font-medium text-[#1A1A1A]">Your partner fills out the form</p>
                <p className="text-[12px] text-[#888888] mt-0.5">They'll open the link and enter their deployment data for the selected care settings.</p>
              </div>
            </div>

            <div className="border-t border-[#F0F0F0]" />

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-semibold mt-0.5">3</div>
              <div>
                <p className="text-[13px] font-medium text-[#1A1A1A]">They send the completed data back</p>
                <p className="text-[12px] text-[#888888] mt-0.5">Once submitted, they'll download a PDF with their data to share with you.</p>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => handleOpenChange(false)}
                className="w-full h-[40px] rounded-lg text-sm font-medium bg-[#F5F5F5] text-[#666666] hover:bg-[#EEEEEE] hover:text-[#1A1A1A] transition-all duration-200"
                data-testid="button-close-dialog"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
