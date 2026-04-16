import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Beaker, Filter, Droplets, FlaskConical, Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addLog, loadLogs, loadPools, upsertPool, computeStatus, type LogEntry, type Pool } from "@/lib/storage";
import { addLogCloud, fetchLogsCloud, fetchPoolsCloud, upsertPoolCloud } from "@/lib/cloudStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const QUICK_ACTIONS = [
  { id: "chlorine", label: "Added Chlorine", icon: Beaker },
  { id: "filter", label: "Started Filter", icon: Filter },
  { id: "backwash", label: "Backwash", icon: Droplets },
  { id: "ph_up", label: "Added pH+", icon: FlaskConical },
  { id: "ph_down", label: "Added pH−", icon: FlaskConical },
  { id: "shock", label: "Shock Treat", icon: Sparkles },
];

const Track = () => {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolId, setPoolId] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [ph, setPh] = useState("");
  const [chlorine, setChlorine] = useState("");
  const [alkalinity, setAlkalinity] = useState("");
  const [temp, setTemp] = useState("");

  const refresh = async () => {
    if (user) {
      try {
        const [ps, ls] = await Promise.all([fetchPoolsCloud(), fetchLogsCloud()]);
        setPools(ps);
        setLogs(ls);
        setPoolId(prev => params.get("pool") || prev || ps[0]?.id || "");
      } catch {
        toast.error("Failed to load data");
      }
    } else {
      const ps = loadPools();
      setPools(ps);
      setLogs(loadLogs());
      setPoolId(params.get("pool") || ps[0]?.id || "");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, user?.id]);

  const pool = useMemo(() => pools.find(p => p.id === poolId), [pools, poolId]);
  const poolLogs = useMemo(() => logs.filter(l => l.poolId === poolId).slice(0, 30), [logs, poolId]);

  const persistLog = async (entry: LogEntry) => {
    if (user) await addLogCloud(entry, user.id);
    else addLog(entry);
  };

  const persistPool = async (p: Pool) => {
    if (user) await upsertPoolCloud(p, user.id);
    else upsertPool(p);
  };

  const quickLog = async (action: string) => {
    if (!pool) return toast.error("Add a pool first");
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      poolId: pool.id,
      type: action.toLowerCase().includes("filter") || action.toLowerCase().includes("backwash") ? "filter" : "chemical",
      action,
      createdAt: new Date().toISOString(),
    };
    try {
      await persistLog(entry);
      await refresh();
      toast.success(`Logged: ${action}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to log");
    }
  };

  const saveReading = async () => {
    if (!pool) return toast.error("Add a pool first");
    const values = {
      ph: ph ? parseFloat(ph) : pool.ph,
      chlorine: chlorine ? parseFloat(chlorine) : pool.chlorine,
      alkalinity: alkalinity ? parseFloat(alkalinity) : pool.alkalinity,
      temperature: temp ? parseFloat(temp) : pool.temperature,
    };
    const updated: Pool = {
      ...pool,
      ...values,
      lastReadingAt: new Date().toISOString(),
    };
    updated.status = computeStatus(updated);
    try {
      await persistPool(updated);
      await persistLog({
        id: crypto.randomUUID(),
        poolId: pool.id,
        type: "reading",
        action: "Logged reading",
        values,
        createdAt: new Date().toISOString(),
      });
      await refresh();
      setPh(""); setChlorine(""); setAlkalinity(""); setTemp("");
      toast.success("Reading saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  if (pools.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <Activity className="w-8 h-8 text-secondary mx-auto mb-3" />
        <h3 className="font-semibold mb-1">No pools to track</h3>
        <p className="text-sm text-muted-foreground">Add a pool from the Pools tab to start logging.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Track</h2>
        <p className="text-sm text-muted-foreground">Quick-log maintenance and chemistry readings.</p>
      </header>

      <section className="glass-card rounded-2xl p-4">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pool</Label>
        <select
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          className="mt-2 w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm"
        >
          {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Quick log</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_ACTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => quickLog(label)}
              className="glass-card rounded-xl p-4 flex items-center gap-3 hover:bg-secondary/10 hover:border-secondary/40 transition-all active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-secondary" />
              </div>
              <span className="text-sm font-medium text-left leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">New reading</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="pH" value={ph} onChange={setPh} placeholder="7.4" step="0.1" />
          <Field label="Chlorine (ppm)" value={chlorine} onChange={setChlorine} placeholder="2.0" step="0.1" />
          <Field label="Alkalinity (ppm)" value={alkalinity} onChange={setAlkalinity} placeholder="100" />
          <Field label="Temp (°C)" value={temp} onChange={setTemp} placeholder="28" />
        </div>
        <Button onClick={saveReading} className="w-full mt-4 bg-gradient-cyan text-secondary-foreground hover:opacity-90">
          Save reading
        </Button>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recent activity</h3>
        {poolLogs.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No activity yet. Use a quick-log button above.
          </div>
        ) : (
          <ul className="space-y-2">
            {poolLogs.map(log => (
              <li key={log.id} className="glass-card rounded-xl p-3.5 flex items-start gap-3">
                <span className={cn("w-2 h-2 rounded-full mt-2 shrink-0",
                  log.type === "rescue" ? "bg-status-critical" :
                  log.type === "reading" ? "bg-secondary" :
                  log.type === "filter" ? "bg-status-crystal" : "bg-status-warning"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{log.action}</p>
                  {log.values && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.values.ph != null && `pH ${log.values.ph} · `}
                      {log.values.chlorine != null && `Cl ${log.values.chlorine} · `}
                      {log.values.alkalinity != null && `Alk ${log.values.alkalinity} · `}
                      {log.values.temperature != null && `${log.values.temperature}°C`}
                    </p>
                  )}
                  {log.detail && <p className="text-xs text-muted-foreground mt-0.5">{log.detail}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {new Date(log.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, step }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; step?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input type="number" inputMode="decimal" step={step} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export default Track;
