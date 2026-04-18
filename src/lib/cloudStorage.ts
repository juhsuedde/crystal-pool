import { supabase } from "@/integrations/supabase/client";
import type { Pool, LogEntry, PoolStatus, UserMode } from "./storage";
import { computeStatus, loadPools as loadLocal, loadLogs as loadLocalLogs, savePools, saveLogs, getUserMode } from "./storage";

const rowToPool = (r: any): Pool => ({
  id: r.id,
  name: r.name,
  volumeLiters: r.volume_liters,
  type: r.type,
  status: r.status as PoolStatus,
  ph: r.ph ?? undefined,
  chlorine: r.chlorine ?? undefined,
  alkalinity: r.alkalinity ?? undefined,
  temperature: r.temperature ?? undefined,
  lastReadingAt: r.last_reading_at ?? undefined,
  createdAt: r.created_at,
  // Pro mode fields
  tags: r.tags ?? [],
  address: r.address ?? undefined,
  clientName: r.client_name ?? undefined,
});

const poolToRow = (p: Pool, userId: string) => ({
  id: p.id,
  user_id: userId,
  name: p.name,
  volume_liters: p.volumeLiters,
  type: p.type,
  status: p.status,
  ph: p.ph ?? null,
  chlorine: p.chlorine ?? null,
  alkalinity: p.alkalinity ?? null,
  temperature: p.temperature ?? null,
  last_reading_at: p.lastReadingAt ?? null,
});

const rowToLog = (r: any): LogEntry => ({
  id: r.id,
  poolId: r.pool_id,
  type: r.type,
  action: r.action,
  detail: r.detail ?? undefined,
  values: r.values ?? undefined,
  createdAt: r.created_at,
});

export const fetchPoolsCloud = async (): Promise<Pool[]> => {
  const { data, error } = await supabase.from("pools").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToPool);
};

export const fetchPoolCloud = async (): Promise<Pool | null> => {
  const { data, error } = await supabase.from("pools").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data ? rowToPool(data) : null;
};

export const upsertPoolCloud = async (pool: Pool, userId: string): Promise<void> => {
  const { error } = await supabase.from("pools").upsert(poolToRow(pool, userId));
  if (error) throw error;
};

export const deletePoolCloud = async (poolId: string): Promise<void> => {
  const { error } = await supabase.from("pools").delete().eq("id", poolId);
  if (error) throw error;
};

export const fetchLogsCloud = async (): Promise<LogEntry[]> => {
  const { data, error } = await supabase.from("pool_logs").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map(rowToLog);
};

export const addLogCloud = async (log: LogEntry, userId: string): Promise<void> => {
  const { error } = await supabase.from("pool_logs").insert({
    id: log.id,
    pool_id: log.poolId,
    user_id: userId,
    type: log.type,
    action: log.action,
    detail: log.detail ?? null,
    values: log.values ?? null,
  });
  if (error) throw error;
};

const MIGRATED_KEY = "cp.migrated";
export const migrateGuestDataIfNeeded = async (userId: string) => {
  if (localStorage.getItem(MIGRATED_KEY)) return;
  const localPools = loadLocal();
  const localLogs = loadLocalLogs();
  if (localPools.length === 0 && localLogs.length === 0) {
    localStorage.setItem(MIGRATED_KEY, "1");
    return;
  }
  try {
    if (localPools.length > 0) {
      const rows = localPools.map(p => poolToRow(p, userId));
      await supabase.from("pools").upsert(rows);
    }
    if (localLogs.length > 0) {
      const rows = localLogs.map(l => ({
        id: l.id,
        pool_id: l.poolId,
        user_id: userId,
        type: l.type,
        action: l.action,
        detail: l.detail ?? null,
        values: l.values ?? null,
        created_at: l.createdAt,
      }));
      await supabase.from("pool_logs").insert(rows);
    }
    savePools([]);
    saveLogs([]);
    localStorage.setItem(MIGRATED_KEY, "1");
  } catch (e) {
    console.error("Guest data migration failed", e);
  }
};

export { computeStatus };
