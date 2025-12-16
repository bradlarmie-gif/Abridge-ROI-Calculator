import { KpiCard, KpiGrid } from "../KpiCard";
import { TrendingUp, DollarSign, Clock, Percent } from "lucide-react";

export default function KpiCardExample() {
  return (
    <KpiGrid>
      <KpiCard
        label="ROI Multiple"
        value="4.25x"
        icon={<TrendingUp className="h-8 w-8" />}
        variant="positive"
      />
      <KpiCard
        label="Total Annual Benefit"
        value="$1,148,400"
        icon={<DollarSign className="h-8 w-8" />}
        variant="positive"
      />
      <KpiCard
        label="Investment Cost Year 1"
        value="$270,000"
        icon={<DollarSign className="h-8 w-8" />}
        variant="negative"
      />
      <KpiCard
        label="Net Value Created"
        value="$878,400"
        icon={<TrendingUp className="h-8 w-8" />}
        variant="positive"
      />
      <KpiCard
        label="Provider Hours Reclaimed"
        value="6,400"
        icon={<Clock className="h-8 w-8" />}
        variant="neutral"
      />
      <KpiCard
        label="Post-Abridge wRVU"
        value="2.21"
        icon={<TrendingUp className="h-8 w-8" />}
        variant="neutral"
      />
      <KpiCard
        label="New Effective Denial Rate"
        value="3.9%"
        icon={<Percent className="h-8 w-8" />}
        variant="positive"
      />
    </KpiGrid>
  );
}
