import { saveAs } from "file-saver";

export async function savePdfBlob(blob: Blob, filename: string, title?: string): Promise<void> {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: "application/pdf" });
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
