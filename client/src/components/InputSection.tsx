import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ReactNode } from "react";

interface InputSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function InputSection({ title, icon, children }: InputSectionProps) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

interface InputFieldProps {
  label: string;
  helperText?: string;
  children: ReactNode;
  readOnly?: boolean;
}

export function InputField({ label, helperText, children, readOnly }: InputFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className={readOnly ? "bg-muted rounded-md" : ""}>{children}</div>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
