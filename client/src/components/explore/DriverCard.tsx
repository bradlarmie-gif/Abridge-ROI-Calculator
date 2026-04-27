import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";

interface DriverCardProps {
  title: string;
  subtitle: string;
  enabled: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  testId?: string;
  isChild?: boolean;
  children: ReactNode;
}

export default function DriverCard({
  title,
  subtitle,
  enabled,
  expanded,
  onToggle,
  onExpand,
  testId,
  isChild = false,
  children,
}: DriverCardProps) {
  return (
    <div className={isChild ? "ml-6 mt-3" : ""}>
      <div className={`w-full p-4 text-left transition-all ${
        enabled
          ? (expanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
          : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-semibold text-black">{title}</p>
            <p className="text-sm text-[#888888]">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {enabled && (
              <button
                onClick={onExpand}
                className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                data-testid={testId ? `${testId}-expand` : undefined}
              >
                <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`} />
              </button>
            )}
            <button
              onClick={onToggle}
              className={`w-12 h-6 rounded-full relative transition-all ${enabled ? "bg-[#EA2C00]" : "bg-[#D1D5DB]"}`}
              data-testid={testId}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${enabled ? "right-0.5" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {enabled && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-b-lg p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
