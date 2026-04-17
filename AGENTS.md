# Crystal Pool - Agent Instructions

## Quick Start
```bash
npm run dev      # Start dev server (port 8080)
npm run build    # Production build
npm run test     # Run tests (vitest)
```

## Key Facts

- **Stack**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Supabase
- **Auth**: Lovable Cloud Auth (`@lovable.dev/cloud-auth-js`)
- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Routes**: `/` (Home), `/rescue` (AI Diagnosis), `/track` (Logging), `/auth` (Login)
- **Storage**: LocalStorage for guests, Supabase for authenticated users

## Architecture

- **Homeowner mode** (default): 0-1 pool, "My Pool" UI, no pool selector
- **Pro Keeper mode**: 2+ pools (requires login), "Your Pools" UI with selectors
- Pool data stored in `src/lib/storage.ts` (local) and Supabase `pools` table
- Logs stored in `pool_logs` table

## Env Setup
Create `.env` with:
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
```

## Tests
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
```

## Ignored Files (do not commit)
- `.env` - contains secrets
- `bun.lockb` - Bun lockfile
- `supabase/config.toml` - Supabase config

## Known Issues

### Capacitor Camera iOS Build Fixed
- Use `@capacitor/camera@^7.0.0` to avoid Swift concurrency bug in v8.x
- Build now works with native camera enabled