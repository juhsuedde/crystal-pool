import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Sparkles, Loader2, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadPools, addLog, type Pool } from "@/lib/storage";
import { fetchPoolsCloud } from "@/lib/cloudStorage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const SYMPTOMS = [
  { id: "green", label: "Green Water", emoji: "🟢" },
  { id: "cloudy", label: "Cloudy / Milky", emoji: "☁️" },
  { id: "foam", label: "Foaming", emoji: "🫧" },
  { id: "smell", label: "Bad Odor", emoji: "👃" },
  { id: "low", label: "Low Water", emoji: "📉" },
  { id: "debris", label: "Debris", emoji: "🍂" },
];

interface Diagnosis {
  severity: "low" | "medium" | "high" | "critical";
  problem: string;
  cause: string;
  steps: string[];
  chemicals: { name: string; amount: string; note?: string }[];
  timeline: string;
}

const Rescue = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolId, setPoolId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Diagnosis | null>(null);

  const isProKeeper = user && pools.length > 1;

  useEffect(() => {
    const loadPoolsData = async () => {
      if (user) {
        try {
          const ps = await fetchPoolsCloud();
          setPools(ps);
          setPoolId(ps[0]?.id ?? "");
        } catch {
          setPools(loadPools());
          setPoolId(loadPools()[0]?.id ?? "");
        }
      } else {
        setPools(loadPools());
        setPoolId(loadPools()[0]?.id ?? "");
      }
    };
    loadPoolsData();
  }, [user]);

  const pool = pools.find(p => p.id === poolId);

  const togglePhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleSymptom = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const diagnose = async () => {
    if (!photo && selected.size === 0) {
      toast.error("Upload a photo or pick at least one symptom");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("diagnose-pool", {
        body: {
          photo,
          symptoms: Array.from(selected).map(id => SYMPTOMS.find(s => s.id === id)?.label).filter(Boolean),
          volumeLiters: pool?.volumeLiters ?? 50000,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as Diagnosis);
      if (pool) {
        addLog({
          id: crypto.randomUUID(),
          poolId: pool.id,
          type: "rescue",
          action: "AI Diagnosis",
          detail: (data as Diagnosis).problem,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      console.error(e);
      const msg = String(e?.message || e);
      if (msg.includes("429")) toast.error("Rate limited — try again in a moment.");
      else if (msg.includes("402")) toast.error("AI credits exhausted. Add funds in Cloud → Usage.");
      else toast.error("Diagnosis failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setSelected(new Set());
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-secondary" />
          <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-secondary">Emergency Rescue</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Save My Pool</h2>
        <p className="text-sm text-muted-foreground mt-1">Snap your pool, mark symptoms, get an AI recovery plan in seconds.</p>
      </header>

      {!result && (
        <>
          <section className="glass-card rounded-2xl p-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => togglePhoto(e.target.files?.[0])}
            />
            {photo ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photo} alt="Pool" className="w-full h-56 object-cover" />
                <button
                  onClick={() => setPhoto(null)}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur text-xs font-medium border border-border"
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-44 rounded-xl border-2 border-dashed border-secondary/40 bg-secondary/5 flex flex-col items-center justify-center gap-2 hover:border-secondary transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-secondary" />
                </div>
                <p className="text-sm font-medium">Tap to upload pool photo</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> JPG/PNG up to 8MB</p>
              </button>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Visible symptoms</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {SYMPTOMS.map(s => {
                const active = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSymptom(s.id)}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                      active
                        ? "bg-secondary/15 border-secondary text-foreground shadow-glow"
                        : "bg-card/50 border-border text-muted-foreground hover:text-foreground hover:border-secondary/40"
                    )}
                  >
                    <span className="text-lg">{s.emoji}</span>
                    <span className="text-sm font-medium">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {isProKeeper ? (
            <section className="glass-card rounded-2xl p-4">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Pool (for dosage)</label>
              <select
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                className="mt-2 w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm"
              >
                {pools.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {(p.volumeLiters/1000).toFixed(1)}k L</option>
                ))}
              </select>
            </section>
          ) : pool ? (
            <section className="glass-card rounded-2xl p-4">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Pool</label>
              <div className="mt-2 text-sm font-medium">
                {pool.name} — {(pool.volumeLiters/1000).toFixed(1)}k L
              </div>
            </section>
          ) : null}

          {!pool && (
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">Add a pool first to get accurate dosages.</p>
              <Button onClick={() => navigate("/")} className="bg-gradient-cyan text-secondary-foreground">
                Go to Home
              </Button>
            </div>
          )}

          <Button
            onClick={diagnose}
            disabled={loading || !pool}
            className="w-full h-14 text-base font-semibold bg-gradient-cyan text-secondary-foreground hover:opacity-90 rounded-2xl shadow-glow"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing your pool…</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" /> Diagnose Now</>
            )}
          </Button>
        </>
      )}

      {result && (
        <DiagnosisView result={result} onReset={reset} />
      )}
    </div>
  );
};

const severityStyle: Record<Diagnosis["severity"], { dot: string; label: string; ring: string }> = {
  low: { dot: "bg-status-crystal", label: "Low severity", ring: "ring-status-crystal/30" },
  medium: { dot: "bg-status-warning", label: "Moderate", ring: "ring-status-warning/30" },
  high: { dot: "bg-status-critical", label: "High severity", ring: "ring-status-critical/40" },
  critical: { dot: "bg-destructive", label: "Critical", ring: "ring-destructive/40" },
};

const DiagnosisView = ({ result, onReset }: { result: Diagnosis; onReset: () => void }) => {
  const sev = severityStyle[result.severity] ?? severityStyle.medium;
  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className={cn("glass-card rounded-2xl p-5 ring-1", sev.ring)}>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("w-2.5 h-2.5 rounded-full", sev.dot)} />
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">{sev.label}</span>
        </div>
        <h3 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-secondary" /> {result.problem}</h3>
        <p className="text-sm text-muted-foreground mt-2">{result.cause}</p>
      </div>

      <section>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Chemical dosage</h4>
        <div className="space-y-2">
          {result.chemicals.map((c, i) => (
            <div key={i} className="glass-card rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">{c.name}</p>
                {c.note && <p className="text-xs text-muted-foreground mt-1">{c.note}</p>}
              </div>
              <span className="shrink-0 text-secondary font-bold tabular-nums">{c.amount}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recovery steps</h4>
        <ol className="space-y-2.5">
          {result.steps.map((step, i) => (
            <li key={i} className="glass-card rounded-xl p-4 flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-secondary/15 text-secondary text-sm font-bold flex items-center justify-center">{i + 1}</span>
              <span className="text-sm leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-status-crystal shrink-0" />
        <p className="text-sm"><span className="text-muted-foreground">Expected timeline:</span> <span className="font-semibold">{result.timeline}</span></p>
      </div>

      <Button onClick={onReset} variant="outline" className="w-full h-12 rounded-2xl">
        <RefreshCw className="w-4 h-4 mr-2" /> Start a new diagnosis
      </Button>
    </div>
  );
};

export default Rescue;
