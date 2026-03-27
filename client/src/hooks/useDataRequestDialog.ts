import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export function useDataRequestDialog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogUrl, setDialogUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const generatingRef = useRef(false);
  const { toast } = useToast();

  const openWithUrl = useCallback(async (generateUrl: () => Promise<string>) => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);
    try {
      const url = await generateUrl();
      setDialogUrl(url);
      setDialogOpen(true);
    } catch {
      toast({
        title: "Could not generate link",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }, [toast]);

  return {
    dialogOpen,
    setDialogOpen,
    dialogUrl,
    isGenerating,
    openWithUrl,
  };
}
