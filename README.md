# Crystal Pool

Sistema de gerenciamento e rastreamento para tratamentos de resgate de piscina.

## Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS + shadcn/ui
- **Estado**: React Query + React Hook Form
- **Backend**: Supabase
- **Autenticação**: Lovable Cloud Auth
- **Rotas**: React Router DOM
- **Validação**: Zod

## Estrutura do Projeto

```
src/
├── components/       # Componentes reutilizáveis
│   └── ui/          # Componentes shadcn/ui
├── hooks/           # Hooks personalizados (useAuth)
├── integrations/    # Integrações externas
│   └── supabase/   # Cliente e tipos do Supabase
├── pages/           # Páginas da aplicação
│   ├── Index.tsx    # Home/Dashboard
│   ├── Rescue.tsx  # Gerenciamento de rescues
│   ├── Track.tsx   # Rastreamento
│   ├── Auth.tsx    # Autenticação
│   └── NotFound.tsx
├── App.tsx          # Componente principal
└── main.tsx         # Entry point
```

## Scripts

```bash
npm run dev          # Iniciar servidor de desenvolvimento
npm run build       # Build de produção
npm run lint        # Verificar código
npm run test        # Executar testes
npm run test:watch  # Testes em modo watch
```

## Variáveis de Ambiente

Crie um arquivo `.env` com:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Licença

MIT