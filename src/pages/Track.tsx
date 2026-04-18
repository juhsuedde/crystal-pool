import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Beaker, Filter, Droplets, FlaskConical, Activity, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { addLog, loadLogs, loadPools, upsertPool, computeStatus, deletePool, type LogEntry, type Pool } from "@/lib/storage";
import { addLogCloud, fetchLogsCloud, fetchPoolsCloud, upsertPoolCloud, deletePoolCloud } from "@/lib/cloudStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import ChemistryChart from "@/components/ChemistryChart";
import PoolCard from "@/components/PoolCard";
import SwipeToDelete from "@/components/SwipeToDelete";

const Track = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolId, setPoolId] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [poolToDelete, setPoolToDelete] = useState<Pool | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [ph, setPh] = useState("");
  const [chlorine, setChlorine] = useState("");
  const [alkalinity, setAlkalinity] = useState("");
  const [temp, setTemp] = useState("");

  const isProKeeper = user && pools.length > 1;

  const QUICK_ACTIONS = [
    { id: "chlorine", label: t("track.actions.chlorine"), icon: Beaker },
    { id: "filter", label: t("track.actions.filter"), icon: Filter },
    { id: "backwash", label: t("track.actions.backwash"), icon: Droplets },
    { id: "ph_up", label: t("track.actions.ph_up"), icon: FlaskConical },
    { id: "ph_down", label: t("track.actions.ph_down"), icon: FlaskConical },
    { id: "shock", label: t("track.actions.shock"), icon: Sparkles },
  ];

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

  const requestDelete = (p: Pool) => {
    setPoolToDelete(p);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!poolToDelete) return;
    try {
      if (user) await deletePoolCloud(poolToDelete.id);
      else deletePool(poolToDelete.id);
      toast.success(t("index.poolRemoved"));
      setDeleteOpen(false);
      setPoolToDelete(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove pool");
    }
  };

  const quickLog = async (action: string) => {
    if (!pool) return toast.error(t("track.addPoolFirst"));
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      poolId: pool.id,
      type: action.toLowerCase().includes("filter") || action.toLowerCase().includes("backwash") || action.toLowerCase().includes("retro") ? "filter" : "chemical",
      action,
      createdAt: new Date().toISOString(),
    };
    try {
      await persistLog(entry);
      await refresh();
      toast.success(t("track.logged", { action }));
    } catch (e: any) {
      toast.error(e.message ?? "Failed to log");
    }
  };

  const saveReading = async () => {
    if (!pool) return toast.error(t("track.addPoolFirst"));
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
      toast.success(t("track.readingSaved"));
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  if (pools.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <Activity className="w-8 h-8 text-secondary mx-auto mb-3" />
        <h3 className="font-semibold mb-1">{t("track.noPools")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("track.noPoolsDesc")}</p>
        <Button onClick={() => navigate("/")} className="bg-gradient-cyan text-secondary-foreground">
          {t("track.goHome")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{t("track.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("track.subtitle")}</p>
      </header>

      {isProKeeper && (
        <section className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("track.pool")}</Label>
          <p className="text-[11px] text-muted-foreground/70 px-1">← {t("common.swipeToDelete")}</p>
          <div className="space-y-2">
            {pools.map(p => (
              <SwipeToDelete key={p.id} onDelete={() => requestDelete(p)}>
                <button
                  type="button"
                  onClick={() => setPoolId(p.id)}
                  className={cn(
                    "w-full text-left rounded-2xl border transition-all",
                    p.id === poolId ? "border-secondary shadow-glow ring-1 ring-secondary/40" : "border-transparent"
                  )}
                >
                  <PoolCard pool={p} />
                </button>
              </SwipeToDelete>
            ))}
          </div>
        </section>
      )}

      {!isProKeeper && pool && (
        <section className="space-y-2">
          <p className="text-[11px] text-muted-foreground/70 px-1">← {t("common.swipeToDelete")}</p>
          <SwipeToDelete onDelete={() => requestDelete(pool)}>
            <PoolCard pool={pool} />
          </SwipeToDelete>
        </section>
      )}

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t("track.quickLog")}</h3>
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
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t("track.newReading")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("track.fields.ph")} value={ph} onChange={setPh} placeholder="7.4" step="0.1" />
          <Field label={t("track.fields.chlorine")} value={chlorine} onChange={setChlorine} placeholder="2.0" step="0.1" />
          <Field label={t("track.fields.alkalinity")} value={alkalinity} onChange={setAlkalinity} placeholder="100" />
          <Field label={t("track.fields.temp")} value={temp} onChange={setTemp} placeholder="28" />
        </div>
        <Button onClick={saveReading} className="w-full mt-4 bg-gradient-cyan text-secondary-foreground hover:opacity-90">
          {t("track.saveReading")}
        </Button>
      </section>

      {pool && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t("track.trends")}</h3>
          <ChemistryChart pool={pool} logs={logs} />
        </section>
      )}

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t("track.recent")}</h3>
        {poolLogs.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
            {t("track.noActivity")}
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("index.deletePool")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("index.deleteConfirm", { name: poolToDelete?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
