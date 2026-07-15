interface ArSetupStepProps {
  orgName: string;
  termYears: number;
  onChange: (patch: { orgName?: string; termYears?: number }) => void;
  onContinue: () => void;
}

const TERMS = [1, 2, 3, 5];

export default function ArSetupStep({ orgName, termYears, onChange, onContinue }: ArSetupStepProps) {
  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <h1 className="font-abridge text-4xl uppercase tracking-tight text-[#1A1A1A]" data-testid="ar-setup-title">
        Set up
      </h1>
      <p className="text-sm text-[#6B6B6B] mt-3 mb-10">
        Who are we building this for, and over how long a contract.
      </p>

      <div className="text-left">
        <label className="block text-[11px] font-semibold text-[#8C7E6E] uppercase tracking-wide mb-2">Organization</label>
        <input
          value={orgName}
          onChange={(e) => onChange({ orgName: e.target.value })}
          placeholder="Organization name"
          className="w-full h-12 bg-white border border-[#E8E2DA] rounded-xl px-4 text-[15px] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition-colors placeholder-[#B4A99B]"
          data-testid="ar-setup-org"
        />

        <label className="block text-[11px] font-semibold text-[#8C7E6E] uppercase tracking-wide mt-7 mb-2">Contract term</label>
        <div className="inline-flex bg-[#F5F0EB] rounded-full p-1 gap-1">
          {TERMS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => onChange({ termYears: y })}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                y === termYears ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#6B6B6B] hover:text-[#1A1A1A]"
              }`}
              data-testid={`ar-setup-term-${y}`}
            >
              {y} {y === 1 ? "year" : "years"}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="mt-12 w-full h-12 rounded-xl bg-[#EA2C00] text-white text-[15px] font-semibold"
        data-testid="ar-setup-continue"
      >
        Add their applications →
      </button>
    </div>
  );
}
