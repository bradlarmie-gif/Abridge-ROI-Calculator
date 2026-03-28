import { useState, useCallback } from "react";
import { Copy, Check, Loader2, ArrowRight, Stethoscope, Zap, ClipboardList, HeartPulse, Link2, FileText, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
      <DialogContent
        className={`p-0 gap-0 bg-white border-0 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] rounded-2xl overflow-hidden [&>button]:top-5 [&>button]:right-5 [&>button]:text-[#999] [&>button]:hover:text-[#333] ${
          phase === 'pick' ? 'sm:max-w-[460px]' : 'sm:max-w-[520px]'
        }`}
        data-testid="dialog-data-request"
      >

        {phase === 'pick' ? (
          <div className="flex flex-col">
            <div className="px-8 pt-8 pb-2">
              <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#EA2C00] mb-2">Data Request</p>
              <h2 className="text-[20px] font-bold text-[#1A1A1A] tracking-[-0.02em] leading-tight">
                {singleSelect ? 'Choose a Care Setting' : 'Select Care Settings'}
              </h2>
              <p className="text-[13px] text-[#888888] mt-2 leading-relaxed">
                {singleSelect
                  ? 'Pick the setting you need deployment data for.'
                  : 'Pick the settings you need deployment data for. Select one or more.'}
              </p>
            </div>

            <div className="px-8 pt-4 pb-8">
              <div className={`grid gap-3 ${visibleSettings.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {visibleSettings.map(setting => {
                  const Icon = setting.icon;
                  const isSelected = selected.includes(setting.id);
                  return (
                    <button
                      key={setting.id}
                      onClick={() => toggleSetting(setting.id)}
                      className={`group relative flex flex-col items-center text-center px-4 py-5 rounded-2xl border-[1.5px] transition-all duration-200 ${
                        isSelected
                          ? 'border-[#EA2C00] bg-gradient-to-b from-[#FFF8F5] to-[#FFF3ED] shadow-[0_2px_12px_rgba(234,44,0,0.1)]'
                          : 'border-[#E8E2DA] bg-[#FAFAF8] hover:border-[#CCC5BB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                      }`}
                      data-testid={`pick-setting-${setting.id}`}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-[#EA2C00] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 transition-all duration-200 ${
                        isSelected ? 'bg-[#EA2C00] shadow-[0_2px_8px_rgba(234,44,0,0.25)]' : 'bg-white border border-[#E8E2DA] group-hover:border-[#D0C8BF]'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#888888] group-hover:text-[#666666]'}`} />
                      </div>
                      <p className={`text-[13px] font-semibold leading-tight ${isSelected ? 'text-[#1A1A1A]' : 'text-[#555555]'}`}>{setting.label}</p>
                      <p className={`text-[11px] leading-tight mt-0.5 ${isSelected ? 'text-[#AA5533]' : 'text-[#AAAAAA]'}`}>{setting.desc}</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleContinue}
                disabled={selected.length === 0 || generating}
                className={`w-full h-12 rounded-xl text-[14px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 mt-5 ${
                  selected.length > 0
                    ? 'bg-[#EA2C00] text-white hover:bg-[#D42800] shadow-[0_2px_12px_rgba(234,44,0,0.25)]'
                    : 'bg-[#F0EEEC] text-[#CCCCCC] cursor-not-allowed'
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
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-gradient-to-b from-[#FAFAF8] to-white px-8 pt-8 pb-6 border-b border-[#F0EDE8]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#EA2C00] flex items-center justify-center shadow-[0_2px_8px_rgba(234,44,0,0.2)]">
                  <Link2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#EA2C00]">Link Ready</p>
              </div>
              <h2 className="text-[20px] font-bold text-[#1A1A1A] tracking-[-0.02em] leading-tight">
                Share with Your Partner
              </h2>
              <p className="text-[13px] text-[#888888] mt-1.5 leading-relaxed">
                Send this link to collect {settingLabels} deployment data.
              </p>

              <div className="mt-5 bg-white rounded-xl border border-[#E8E2DA] p-1 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-0">
                  <div className="flex-1 min-w-0 px-4 py-3 font-mono text-[12px] text-[#555555] truncate select-all" data-testid="text-data-request-url">
                    {url}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                      copied
                        ? "bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                        : "bg-[#1A1A1A] text-white hover:bg-[#333333] shadow-sm"
                    }`}
                    data-testid="button-copy-link"
                  >
                    {copied ? (<><Check className="w-4 h-4" />Copied!</>) : (<><Copy className="w-4 h-4" />Copy Link</>)}
                  </button>
                </div>
              </div>
              {copyFailed && (
                <p className="text-[11px] text-red-500 mt-2">Couldn't copy automatically — select the link above and copy manually.</p>
              )}
            </div>

            <div className="px-8 py-6">
              <p className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#BBBBBB] mb-4">What happens next</p>

              <div className="flex gap-4">
                <div className="flex-1 flex items-start gap-3 bg-[#FAFAF8] rounded-xl p-4 border border-[#F0EDE8]">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E2DA] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#999999]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#444444] leading-tight">Partner fills out the form</p>
                    <p className="text-[11px] text-[#999999] mt-1 leading-relaxed">They enter their deployment data for the selected care settings.</p>
                  </div>
                </div>

                <div className="flex-1 flex items-start gap-3 bg-[#FAFAF8] rounded-xl p-4 border border-[#F0EDE8]">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E2DA] flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4 text-[#999999]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#444444] leading-tight">They send you the data</p>
                    <p className="text-[11px] text-[#999999] mt-1 leading-relaxed">Once submitted, they download a PDF to share with you.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenChange(false)}
                className="w-full h-11 rounded-xl text-[13px] font-semibold mt-5 bg-[#F5F3F0] text-[#777777] hover:bg-[#ECEAE6] hover:text-[#1A1A1A] transition-all duration-200"
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
