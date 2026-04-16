import { Pool } from "@/lib/storage";
import { STATUS_LABEL } from "@/lib/chemistry";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const dotColor: Record<string, string> = {
  crystal: "bg-status-crystal shadow-[0_0_20px_hsl(var(--status-crystal)/0.7)]",
  warning: "bg-status-warning shadow-[0_0_20px_hsl(var(--status-warning)/0.7)]",
  critical: "bg-status-critical shadow-[0_0_20px_hsl(var(--status-critical)/0.7)]",
  algae: "bg-status-algae shadow-[0_0_20px_hsl(var(--status-algae)/0.7)]",
  cloudy: "bg-status-cloudy",
  offline: "bg-muted-foreground/40",
};

const ringColor: Record<string, string> = {
  crystal: "ring-status-crystal/30",
  warning: "ring-status-warning/30",
  critical: "ring-status-critical/40",
  algae: "ring-status-algae/30",
  cloudy: "ring-status-cloudy/30",
  offline: "ring-border",
};

interface Props {
  pool: Pool;
  onClick?: () => void;
}

const PoolCard = ({ pool, onClick }: Props) => {
  const last = pool.lastReadingAt
    ? new Date(pool.lastReadingAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "No readings yet";
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left glass-card rounded-2xl p-5 ring-1 transition-all hover:scale-[1.01] hover:shadow-elevated",
        ringColor[pool.status]
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold truncate">{pool.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{last}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("w-2.5 h-2.5 rounded-full", dotColor[pool.status])} />
          <span className="text-xs font-medium text-foreground/90">{STATUS_LABEL[pool.status]}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Metric label="pH" value={pool.ph} />
        <Metric label="Chlorine" value={pool.chlorine} unit="ppm" />
        <Metric label="Alkalinity" value={pool.alkalinity} unit="ppm" />
        <Metric label="Temp" value={pool.temperature} unit="°C" />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">{(pool.volumeLiters / 1000).toFixed(1)}k L · {pool.type}</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
};

const Metric = ({ label, value, unit }: { label: string; value?: number; unit?: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-base font-semibold tabular-nums mt-0.5">
      {value != null ? value : "—"}
      {value != null && unit && <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>}
    </span>
  </div>
);

export default PoolCard;
