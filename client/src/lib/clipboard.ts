export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;border:none;padding:0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export async function shareOrCopy(text: string, title?: string): Promise<'shared' | 'copied' | 'fallback'> {
  if (navigator.share) {
    try {
      await navigator.share({ title: title || 'My Abridge Data', text });
      return 'shared';
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') throw e;
    }
  }
  const ok = await copyToClipboard(text);
  return ok ? 'copied' : 'fallback';
}
