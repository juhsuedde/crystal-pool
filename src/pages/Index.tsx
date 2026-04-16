import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LifeBuoy, Sparkles, Settings, Trash2 } from "lucide-react";
import PoolCard from "@/components/PoolCard";
import { Pool, loadPools, seedDemoIfEmpty, upsertPool, computeStatus, deletePool } from "@/lib/storage";
import { fetchPoolsCloud, upsertPoolCloud, deletePoolCloud } from "@/lib/cloudStorage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
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

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [open, setOpen] = useState(false);
  const [editPool, setEditPool] = useState<Pool | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [poolToDelete, setPoolToDelete] = useState<Pool | null>(null);
  const [name, setName] = useState("");
  const [volume, setVolume] = useState("50000");

  const isHomeowner = !user || pools.length <= 1;
  const isProKeeper = user && pools.length > 1;

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

  const updatePool = async () => {
    if (!editPool) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const v = Math.max(100, parseInt(volume) || 50000);
    const updated: Pool = {
      ...editPool,
      name: trimmed,
      volumeLiters: v,
    };
    updated.status = computeStatus(updated);
    try {
      if (user) {
        await upsertPoolCloud(updated, user.id);
      } else {
        upsertPool(updated);
      }
      await refresh();
      setName(""); setVolume("50000"); setEditOpen(false); setEditPool(null);
      toast.success("Pool updated!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update pool");
    }
  };

  const confirmDelete = async () => {
    if (!poolToDelete) return;
    try {
      if (user) {
        await deletePoolCloud(poolToDelete.id);
      } else {
        deletePool(poolToDelete.id);
      }
      await refresh();
      setDeleteOpen(false); setPoolToDelete(null);
      toast.success("Pool removed");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove pool");
    }
  };

  const openEdit = (pool: Pool) => {
    setEditPool(pool);
    setName(pool.name);
    setVolume(String(pool.volumeLiters));
    setEditOpen(true);
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

      {isProKeeper && (
        <div className="glass-card rounded-2xl p-3 bg-secondary/10 border-secondary/30">
          <p className="text-xs text-secondary font-medium">Pro Keeper Mode</p>
          <p className="text-xs text-muted-foreground">Managing {pools.length} pools</p>
        </div>
      )}

      <section>
        <div className="flex items-end justify-between mb-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {isProKeeper ? "Your Pools" : isHomeowner ? "My Pool" : "Pools"}
          </h2>
          {isHomeowner && pools.length > 0 && !user && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Edit Pool</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pname">Pool name</Label>
                    <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Pool" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pvol">Volume (liters)</Label>
                    <Input id="pvol" type="number" inputMode="numeric" value={volume} onChange={(e) => setVolume(e.target.value)} />
                  </div>
                  <Button onClick={updatePool} className="w-full bg-gradient-cyan text-secondary-foreground hover:opacity-90">
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isProKeeper && (
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
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isProKeeper
            ? `${summary.ok} optimal · ${summary.attention} need attention`
            : pools.length > 0
              ? pools[0].status === "crystal" ? "✓ Optimal" : pools[0].status === "offline" ? "No readings yet" : "⚠ Needs attention"
              : "Add your pool to start tracking"}
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="w-full glass-card rounded-2xl p-10 text-center hover:bg-secondary/10 transition-colors">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-secondary/15 flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-sm text-muted-foreground">Tap to add your pool</p>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add your pool</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pname">Pool name</Label>
                  <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Pool" />
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
        ) : (
          <>
            {isProKeeper && pools.map(pool => (
              <div key={pool.id} className="relative group">
                <PoolCard pool={pool} onClick={() => navigate(`/track?pool=${pool.id}`)} />
                <button
                  onClick={(e) => { e.stopPropagation(); setPoolToDelete(pool); setDeleteOpen(true); }}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {isHomeowner && pools.map(pool => (
              <PoolCard key={pool.id} pool={pool} onClick={() => navigate("/track")} />
            ))}
          </>
        )}
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{poolToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
