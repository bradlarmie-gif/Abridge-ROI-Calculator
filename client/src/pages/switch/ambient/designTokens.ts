export const DS = {
  bg: '#F7F6F4',
  warmCard: '#F5F0EB',
  warmBorder: '#E8E0D8',
  trackFill: '#EDEAE5',
  black: '#1A1A1A',
  body: '#4B4B4B',
  muted: '#9B9B9B',
  mutedLight: '#888888',
  border: '#E5E7EB',
  red: '#EA2C00',
  redHover: '#D12600',
  white: '#FFFFFF',
  font: 'Manrope, sans-serif',
} as const;

export function formatCurrencyShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}
