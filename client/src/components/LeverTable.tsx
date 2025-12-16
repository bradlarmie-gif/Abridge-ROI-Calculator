import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Lever, type LeverId } from "@/lib/roi-types";
import { formatCurrency } from "@/lib/roi-calculator";

interface LeverTableProps {
  levers: Lever[];
  onToggle: (id: LeverId) => void;
}

export function LeverTable({ levers, onToggle }: LeverTableProps) {
  const totalEnabled = levers
    .filter((l) => l.enabled)
    .reduce((sum, l) => sum + l.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Annual Impact by Lever</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Active</TableHead>
              <TableHead>Lever</TableHead>
              <TableHead className="text-right">Annual Value</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {levers.map((lever) => (
              <TableRow 
                key={lever.id} 
                className={!lever.enabled ? "opacity-50" : ""}
                data-testid={`lever-row-${lever.id}`}
              >
                <TableCell className="text-center">
                  <Checkbox
                    checked={lever.enabled}
                    onCheckedChange={() => onToggle(lever.id)}
                    data-testid={`checkbox-${lever.id}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{lever.label}</TableCell>
                <TableCell className="text-right font-mono">
                  {lever.enabled ? formatCurrency(lever.value) : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {lever.description}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell></TableCell>
              <TableCell>Total Annual Benefit</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(totalEnabled)}
              </TableCell>
              <TableCell className="hidden md:table-cell"></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
