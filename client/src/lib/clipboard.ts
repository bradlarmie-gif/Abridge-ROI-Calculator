function execCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (execCopy(text)) return true;

  if (navigator.clipboard?.writeText) {
    try {
      await withTimeout(navigator.clipboard.writeText(text), 2000);
      try {
        const result = await withTimeout(navigator.clipboard.readText(), 1000);
        return result === text;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  return false;
}
