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
