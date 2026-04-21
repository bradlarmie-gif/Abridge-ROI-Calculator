export function fmtMonthLabel(month: number): string {
  const y = Math.ceil(month / 12);
  const q = Math.ceil(((month - 1) % 12 + 1) / 3);
  return `Y${y} Q${q}`;
}

export function fmtCurrencyShort(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function monthFromContractStart(start: string | null | undefined): number | null {
  if (!start) return null;
  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return null;
  const now = new Date();
  const months =
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth()) +
    1;
  return months > 0 ? months : null;
}
