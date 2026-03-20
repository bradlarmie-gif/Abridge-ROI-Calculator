import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotebookPen, ChevronDown } from 'lucide-react';
import { type NarrativeOutput } from '@/lib/measureNarrative';

interface NarrativePanelProps {
  narrative: NarrativeOutput | null;
  mode?: 'build' | 'present';
}

export default function NarrativePanel({ narrative, mode = 'build' }: NarrativePanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!narrative) return null;

  if (mode === 'present') {
    return (
      <div className="mb-8" data-testid="narrative-panel-present">
        <p className="text-lg font-bold text-[#1A1A1A] mb-2 leading-snug" data-testid="narrative-headline">
          {narrative.headline}
        </p>
        {narrative.body && (
          <p className="text-sm text-[#555555] leading-[1.7] mb-1.5" data-testid="narrative-body">
            {narrative.body}
          </p>
        )}
        {narrative.handoff && (
          <p className="text-xs italic text-[#EA2C00]" data-testid="narrative-handoff">
            {narrative.handoff}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6" data-testid="narrative-panel-build">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-left group"
        data-testid="narrative-toggle"
      >
        <NotebookPen className="w-3.5 h-3.5 text-[#BBBBBB] group-hover:text-[#999999] transition-colors" />
        <span className="text-[12px] text-[#BBBBBB] group-hover:text-[#999999] transition-colors">
          Presenter Notes
        </span>
        <ChevronDown className={`w-3 h-3 text-[#CCCCCC] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-[#F5F0EB] rounded-lg p-4 space-y-4" data-testid="narrative-content">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#999999] mb-1">Headline</p>
                <p className="text-[13px] font-bold text-[#1A1A1A] leading-snug" data-testid="narrative-headline">
                  {narrative.headline}
                </p>
              </div>

              {narrative.body && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#999999] mb-1">Body</p>
                  <p className="text-xs text-[#444444] leading-[1.7]" data-testid="narrative-body">
                    {narrative.body}
                  </p>
                </div>
              )}

              {narrative.handoff && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#999999] mb-1">Transition</p>
                  <p className="text-[11px] italic text-[#888888]" data-testid="narrative-handoff">
                    {narrative.handoff}
                  </p>
                </div>
              )}

              <p className="text-[10px] text-[#AAAAAA] pt-2 border-t border-[#E5E5E5]">
                This text adapts to your data. Read it, paraphrase it, or use it as a prompt for the conversation.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
