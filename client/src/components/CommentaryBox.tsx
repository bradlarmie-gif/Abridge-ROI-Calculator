import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

interface CommentaryBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function CommentaryBox({ value, onChange }: CommentaryBoxProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Additional Commentary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Add notes about assumptions, methodology, or key discussion points..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-32 resize-y"
          data-testid="textarea-commentary"
        />
      </CardContent>
    </Card>
  );
}
