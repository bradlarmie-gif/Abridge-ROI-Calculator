import { useState } from "react";
import { CommentaryBox } from "../CommentaryBox";

export default function CommentaryBoxExample() {
  const [commentary, setCommentary] = useState(
    "Key assumptions: 70% utilization based on current pilot data. Workforce retention savings may vary by specialty."
  );

  return <CommentaryBox value={commentary} onChange={setCommentary} />;
}
