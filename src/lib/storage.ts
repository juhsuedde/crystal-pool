// Local storage persistence for Crystal Pool (guest/offline-first)
export type PoolStatus = "crystal" | "warning" | "critical" | "algae" | "cloudy" | "offline";

export interface Pool {
  id: string;
  name: string;
  volumeLiters: number;
  type: "outdoor" | "indoor" | "spa";
  createdAt: string;
  lastReadingAt?: string;
  status: PoolStatus;
  ph?: number;
  chlorine?: number;
  alkalinity?: number;
  temperature?: number;
}

export interface LogEntry {
  id: string;
  poolId: string;
  type: "chemical" | "filter" | "reading" | "rescue" | "note";
  action: string;
  detail?: string;
  values?: Partial<Pick<Pool, "ph" | "chlorine" | "alkalinity" | "temperature">>;
  createdAt: string;
}

const POOLS_KEY = "cp.pools";
const LOGS_KEY = "cp.logs";

export const loadPools = (): Pool[] => {
  try { return JSON.parse(localStorage.getItem(POOLS_KEY) || "[]"); } catch { return []; }
};
export const savePools = (pools: Pool[]) => {
  localStorage.setItem(POOLS_KEY, JSON.stringify(pools));
};
export const loadLogs = (): LogEntry[] => {
  try { return JSON.parse(localStorage.getItem(LOGS_KEY) || "[]"); } catch { return []; }
};
export const saveLogs = (logs: LogEntry[]) => {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

export const upsertPool = (pool: Pool) => {
  const pools = loadPools();
  const idx = pools.findIndex(p => p.id === pool.id);
  if (idx >= 0) pools[idx] = pool; else pools.push(pool);
  savePools(pools);
};

export const addLog = (log: LogEntry) => {
  const logs = loadLogs();
  logs.unshift(log);
  saveLogs(logs.slice(0, 500));
};

export const getPool = (id: string) => loadPools().find(p => p.id === id);

export const computeStatus = (pool: Pool): PoolStatus => {
  const { ph, chlorine } = pool;
  if (ph == null && chlorine == null) return "offline";
  if (ph != null && (ph < 6.8 || ph > 8.0)) return "critical";
  if (chlorine != null && chlorine < 0.5) return "warning";
  if (chlorine != null && chlorine > 5) return "warning";
  if (ph != null && (ph < 7.2 || ph > 7.6)) return "warning";
  return "crystal";
};

export const seedDemoIfEmpty = () => {
  if (loadPools().length > 0) return;
  const now = new Date().toISOString();
  const demo: Pool[] = [
    { id: crypto.randomUUID(), name: "Backyard Oasis", volumeLiters: 50000, type: "outdoor", createdAt: now, lastReadingAt: now, status: "crystal", ph: 7.4, chlorine: 2.0, alkalinity: 110, temperature: 28 },
  ];
  savePools(demo);
};
