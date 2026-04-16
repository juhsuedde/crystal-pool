import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LifeBuoy, Sparkles } from "lucide-react";
import PoolCard from "@/components/PoolCard";
import { Pool, loadPools, seedDemoIfEmpty, upsertPool, computeStatus } from "@/lib/storage";
import { fetchPoolsCloud, upsertPoolCloud } from "@/lib/cloudStorage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [volume, setVolume] = useState("50000");

  const refresh = async () => {
    if (user) {
      try {
        setPools(await fetchPoolsCloud());
      } catch (e: any) {
        toast.error("Failed to load pools");
      }
    } else {
      seedDemoIfEmpty();
      setPools(loadPools());
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const summary = useMemo(() => {
    const total = pools.length;
    const ok = pools.filter(p => p.status === "crystal").length;
    const attention = pools.filter(p => p.status !== "crystal" && p.status !== "offline").length;
    return { total, ok, attention };
  }, [pools]);

  const addPool = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const v = Math.max(100, parseInt(volume) || 50000);
    const pool: Pool = {
      id: crypto.randomUUID(),
      name: trimmed,
      volumeLiters: v,
      type: "outdoor",
      createdAt: new Date().toISOString(),
      status: "offline",
    };
    pool.status = computeStatus(pool);
    try {
      if (user) {
        await upsertPoolCloud(pool, user.id);
      } else {
        upsertPool(pool);
      }
      await refresh();
      setName(""); setVolume("50000"); setOpen(false);
      toast.success(`${trimmed} added`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add pool");
    }
  };

  return (
    <div className="space-y-6">
      {!user && (
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Guest mode</span> · Sign in to sync across devices
          </p>
          <Button size="sm" variant="secondary" onClick={() => navigate("/auth")} className="rounded-full shrink-0">
            Sign in
          </Button>
        </div>
      )}

      <section>
        <div className="flex items-end justify-between mb-1">
          <h2 className="text-2xl font-semibold tracking-tight">Your Pools</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" className="rounded-full font-medium">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add a pool</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pname">Pool name</Label>
                  <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Backyard Oasis" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pvol">Volume (liters)</Label>
                  <Input id="pvol" type="number" inputMode="numeric" value={volume} onChange={(e) => setVolume(e.target.value)} />
                </div>
                <Button onClick={addPool} className="w-full bg-gradient-cyan text-secondary-foreground hover:opacity-90">
                  Create pool
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">
          {summary.total > 0
            ? `${summary.ok} optimal · ${summary.attention} need attention`
            : "Add your first pool to start tracking"}
        </p>
      </section>

      <section>
        <button
          onClick={() => navigate("/rescue")}
          className="relative w-full overflow-hidden rounded-3xl p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "var(--gradient-cyan)" }}
        >
          <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ background: "radial-gradient(circle at 80% 20%, hsl(215 70% 18%), transparent 60%)" }} />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary-foreground/10 backdrop-blur flex items-center justify-center">
              <LifeBuoy className="w-7 h-7 text-secondary-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-secondary-foreground/80" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-secondary-foreground/80">AI Diagnosis</span>
              </div>
              <h3 className="text-lg font-bold text-secondary-foreground leading-tight">Save My Pool</h3>
              <p className="text-xs text-secondary-foreground/80 mt-0.5">Photo + symptoms → instant recovery plan</p>
            </div>
          </div>
        </button>
      </section>

      <section className="space-y-3">
        {pools.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-secondary/15 flex items-center justify-center mb-3">
              <Plus className="w-5 h-5 text-secondary" />
            </div>
            <p className="text-sm text-muted-foreground">No pools yet — tap "Add" above.</p>
          </div>
        ) : (
          pools.map(pool => (
            <PoolCard key={pool.id} pool={pool} onClick={() => navigate(`/track?pool=${pool.id}`)} />
          ))
        )}
      </section>
    </div>
  );
};

export default Index;
