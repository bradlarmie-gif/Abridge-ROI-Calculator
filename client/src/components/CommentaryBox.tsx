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
          Scenario Notes & Decisions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Use this space to capture scenario notes, assumptions, decisions, and follow-ups."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="resize-y rounded-lg"
          style={{ 
            minHeight: '220px',
            backgroundColor: '#F7F7F5',
            padding: '16px'
          }}
          data-testid="textarea-commentary"
        />
      </CardContent>
    </Card>
  );
}
