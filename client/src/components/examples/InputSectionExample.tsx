import { InputSection, InputField } from "../InputSection";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";

export default function InputSectionExample() {
  return (
    <InputSection title="Commercial Terms" icon={<DollarSign className="h-5 w-5" />}>
      <InputField label="Number of Providers" helperText="Total providers using Abridge">
        <Input type="number" defaultValue={100} data-testid="input-providers" />
      </InputField>
      <InputField label="Monthly Cost per Provider">
        <Input type="number" defaultValue={225} data-testid="input-monthly-cost" />
      </InputField>
      <InputField label="Annual Abridge Cost (Year 1)" readOnly>
        <Input 
          type="text" 
          value="$270,000" 
          readOnly 
          className="bg-muted cursor-not-allowed font-semibold" 
          data-testid="input-annual-cost"
        />
      </InputField>
    </InputSection>
  );
}
