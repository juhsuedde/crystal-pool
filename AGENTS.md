# Crystal Pool - Agent Instructions

## Quick Start
```bash
npm run dev      # Start dev server (port 8080)
npm run build    # Production build
npm run test     # Run tests (vitest)
```

## Key Facts

- **Stack**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + Supabase
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Routes**: `/` (Home), `/rescue` (AI Diagnosis), `/track` (Logging), `/auth` (Login)
- **Storage**: LocalStorage for guests, Supabase for authenticated users

## User Modes

### 1. GUEST MODE (No account)
- **Access**: Immediate access to SOS Mode (3 free uses)
- **Pools**: 1 temporary pool (in-memory, lost on refresh)
- **Data**: Saved locally for 7 days
- **After 7 days**: User sees warning "Subscribe to save history permanently"
- **Upsell**: "Create account to save history" button after usage
- **Limitation**: No persistent history, no sync across devices

### 2. HOME OWNER (Basic plan account)
- **Access**: Full account with subscription
- **Pools**: Up to 3 pools (configurable by plan)
- **Features**:
  - Complete history + analytics
  - Customizable reminders
  - Full Track mode
  - Unlimited SOS Mode access
- **Data**: Persistent in Supabase, syncs across devices

### 3. PRO POOL KEEPER (Pro plan)
- **Access**: Professional account with unlimited pools
- **Features**:
  - Unlimited pools
  - Clients organized by tags/address
  - PDF maintenance reports (to deliver to end clients)
  - Share access with pool owners (view-only for client)
- **Data**: Full multi-client management in Supabase

## Architecture

### Mode Detection Logic
```typescript
const getUserMode = (user: User | null, poolCount: number): 'guest' | 'homeowner' | 'pro' => {
  if (!user) return 'guest';
  if (poolCount > 3) return 'pro';
  return 'homeowner';
};
```

### Data Storage
- **Guest**: LocalStorage (`cp.pools`, `cp.logs`) with 7-day expiry warning
- **Homeowner**: Supabase `pools` table (user_id limited to 3)
- **Pro**: Supabase `pools` table (unlimited, with client tags)

### Database Schema (Supabase)
```sql
-- pools table needs these columns:
- id: UUID
- user_id: UUID (references auth.users)
- name: TEXT
- volume_liters: INTEGER
- type: TEXT ('outdoor' | 'indoor' | 'spa')
- status: TEXT
- tags: TEXT[] -- for Pro mode (client organization)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

-- pool_logs table:
- id: UUID
- pool_id: UUID
- user_id: UUID
- type: TEXT
- action: TEXT
- detail: TEXT
- values: JSONB
- created_at: TIMESTAMPTZ
```

## Routes & UI by Mode

| Route | Guest | Homeowner | Pro |
|-------|-------|-----------|-----|
| `/` | Show "Create pool" with 7-day warning | My Pool (1) | Your Pools (selector) |
| `/rescue` | 3 free uses, then upsell | Unlimited | Unlimited |
| `/track` | Limited, local only | Full features | Full + client management |

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

### Capacitor Camera iOS Build
- Use `@capacitor/camera@^7.0.0` to avoid Swift concurrency bug in v8.x
- Build works with native camera enabled