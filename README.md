# 💎 Crystal Pool

Concepção e desenvolvimento end-to-end de aplicativo mobile para manutenção de piscinas, utilizando React Native, Firebase e OpenAI Vision. Construído com auxílio de agentes de IA e ferramentas no-code, com foco em validação de problema, UX para uso ao ar livre e três personas distintas (homeowner, profissional, usuário em emergência).

## Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS + shadcn/ui
- **Estado**: React Query + React Hook Form
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Autenticação**: Lovable Cloud Auth (Google, Apple, e-mail)
- **Rotas**: React Router DOM
- **Validação**: Zod
- **IA**: Google Gemini 2.5 Flash via Lovable AI Gateway

---

## ✨ Funcionalidades Principais

### 🚨 Modo Emergência (Save My Pool)

- **Análise de imagem por IA**: foto da água → diagnóstico instantâneo
- **Checklist inteligente**: Verde, turva, espuma, cheiro → o app identifica o problema
- **Prescrição personalizada**: Dosagem exata de produtos baseada no volume da piscina
- **Timeline de recuperação**: Estimativa de quando a piscina ficará cristalina

### 📊 Modo Acompanhamento (Track Pool)

- **Quick Logs**: Registro de ações com um toque ("Adicionei cloro", "Liguei filtro")
- **Leituras manuais**: pH, cloro, alcalinidade, temperatura
- **Timeline histórica**: Atividade recente por piscina
- **Status em tempo real**: Crystal Blue / Precisa de atenção / Crítico

---

## 👤 Perfis de Usuário

| Modo              | Descrição                                            | Ideal para                 |
| ----------------- | ---------------------------------------------------- | -------------------------- |
| **🎫 Guest**      | Acesso imediato, dados locais no dispositivo         | Usuários em emergência     |
| **🏠 Homeowner**  | 1 piscina, histórico sincronizado, login obrigatório | Proprietários residenciais |
| **🧢 Pro Keeper** | 2+ piscinas, seletor de piscinas, login obrigatório  | Profissionais de limpeza   |

Dados de convidados são migrados automaticamente para a nuvem ao fazer login.

---

## 🧠 Decisões de Produto

- **Guest Mode sem login**: Reduz atrito em emergências.
  Dados migram para nuvem depois, convertendo usuário sem perder contexto.
- **Volume como input obrigatório**: Sem saber litragem, qualquer dosagem de IA
  seria perigosa. Isso bloqueia o SOS Mode até o usuário preencher.
- **Escolha por PWA primeiro**: Validar hipótese antes de investir na publicação do app.
  Capacitor entra só após Product-Market Fit inicial.

---

## 🚀 Setup Local

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com)
- Conta no [Lovable](https://lovable.dev) (para a AI Gateway)

### Instalação

```bash
npm install
```

### Variáveis de ambiente

Crie `.env` na raiz:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ Certifique-se de que o nome da variável no `.env` bate com o que está em `src/integrations/supabase/client.ts`.

### Banco de dados

Execute a migration em `supabase/migrations/` no seu projeto Supabase, ou use o Supabase CLI:

```bash
supabase db push
```

### Desenvolvimento

```bash
npm run dev        # Inicia em http://localhost:8080
npm run build      # Build de produção
npm run test       # Testes (vitest)
```

---

## 🗂️ Estrutura do Projeto

```
src/
├── components/
│   ├── Layout.tsx         # Header + nav inferior fixo
│   ├── PoolCard.tsx       # Card de status da piscina
│   └── ui/                # Componentes shadcn/ui
├── hooks/
│   ├── useAuth.tsx        # Contexto de autenticação Supabase
│   └── use-toast.ts
├── integrations/
│   ├── lovable/           # Auth OAuth (Google/Apple)
│   └── supabase/          # Client + tipos gerados
├── lib/
│   ├── chemistry.ts       # Constantes e targets químicos
│   ├── cloudStorage.ts    # CRUD Supabase (pools + logs)
│   ├── storage.ts         # CRUD localStorage (guest mode)
│   └── utils.ts
└── pages/
    ├── Index.tsx          # Dashboard / lista de piscinas
    ├── Rescue.tsx         # Diagnóstico por IA
    ├── Track.tsx          # Registro de manutenção
    └── Auth.tsx           # Login / cadastro

supabase/
├── functions/
│   └── diagnose-pool/     # Edge function: IA via Gemini
└── migrations/            # Schema SQL
```

---

## 🗄️ Schema do Banco

**`pools`** — uma por usuário (Homeowner) ou múltiplas (Pro Keeper)

- pH, cloro, alcalinidade, temperatura, status, volume

**`pool_logs`** — histórico de ações e leituras

- tipo: `chemical | filter | reading | rescue | note`

Ambas as tabelas têm Row Level Security (RLS) ativado — cada usuário acessa apenas seus próprios dados.

---

## 🚦 Status

- [x] MVP funcional (rescue + track + auth)
- [x] Deploy em produção (Vercel/Netlify)
- [ ] Testes com 5+ usuários reais (pool owners)
- [ ] Publicação App Store / Play Store (Capacitor)
- [ ] Monetização (Stripe para Pro Keeper)
