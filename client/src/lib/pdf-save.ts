import { saveAs } from "file-saver";

/**
 * Save OR share a file blob — the single path every export should use.
 *
 * On mobile, opens the OS share sheet (navigator.share with the actual file) so a
 * rep can send it via Messages / Mail / AirDrop; falls back to opening it in a tab
 * if the browser can't share files. On desktop, downloads it. The MIME type is
 * taken from `blob.type`, so the recipient sees a real PDF / Excel file.
 */
export async function shareOrSaveBlob(blob: Blob, filename: string, title?: string): Promise<void> {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title || filename });
        return;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank");
          setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        }
        return;
      }
    }
  }

  if (isMobile) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } else {
    saveAs(blob, filename);
  }
}

/** Back-compat alias — PDF exports call this; it shares on mobile, downloads on desktop. */
export async function savePdfBlob(blob: Blob, filename: string, title?: string): Promise<void> {
  return shareOrSaveBlob(blob, filename, title);
}
