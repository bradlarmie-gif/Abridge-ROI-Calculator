export async function createShortLink(paramKey: string, payload: string): Promise<string> {
  const res = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paramKey, payload }),
  });
  if (!res.ok) throw new Error('Failed to create short link');
  const { url } = await res.json();
  return window.location.origin + url;
}

export interface ResolvedShortLink {
  paramKey: string;
  payload: string;
}

/** Extracts the short-link code from a full URL like "https://x.com/s/abc123" or a bare code. */
export function extractShortCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/s\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{4,}$/.test(trimmed)) return trimmed;
  return null;
}

export async function resolveShortLink(codeOrUrl: string): Promise<ResolvedShortLink> {
  const code = extractShortCode(codeOrUrl);
  if (!code) throw new Error('Could not parse a short link from the input.');
  const res = await fetch(`/api/short/${encodeURIComponent(code)}`);
  if (res.status === 404) throw new Error('Link expired or not found.');
  if (!res.ok) throw new Error('Failed to resolve short link');
  return (await res.json()) as ResolvedShortLink;
}
