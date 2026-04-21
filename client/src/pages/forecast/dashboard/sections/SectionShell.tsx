import { type ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface SectionShellProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
  children: ReactNode;
}

export function SectionShell({
  title,
  icon,
  defaultOpen = false,
  testId,
  children,
}: SectionShellProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${testId ?? title.replace(/\s+/g, "-").toLowerCase()}-panel`;
  return (
    <div
      className="rounded-lg border border-neutral-200 bg-white"
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50 rounded-lg"
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-neutral-500">{icon}</span>
          <span className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide">
            {title}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
