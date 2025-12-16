import { useState } from "react";
import { LeverAccordion } from "../LeverAccordion";
import { defaultInputs, type RoiInputs } from "@/lib/roi-types";

export default function LeverAccordionExample() {
  const [inputs, setInputs] = useState<RoiInputs>(defaultInputs);

  const handleInputChange = (path: string, value: number | boolean) => {
    setInputs((prev) => {
      const newInputs = { ...prev };
      const keys = path.split(".");
      let current: Record<string, unknown> = newInputs;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      
      return newInputs;
    });
  };

  return (
    <div className="max-w-md">
      <LeverAccordion inputs={inputs} onInputChange={handleInputChange} />
    </div>
  );
}
