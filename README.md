# 💎 Crystal Pool

Aplicativo inteligente de manutenção de piscinas que combina **diagnóstico de emergência por IA** com **acompanhamento preventivo de longo prazo**.

## Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS + shadcn/ui
- **Estado**: React Query + React Hook Form
- **Backend**: Supabase
- **Autenticação**: Lovable Cloud Auth
- **Rotas**: React Router DOM
- **Validação**: Zod

## ✨ Funcionalidades Principais

### 🚨 Modo Emergência (Save My Pool)

O recurso estrela para momentos de crise:

- **Análise de imagem por IA**: O usuário tira uma foto da água e recebe diagnóstico instantâneo
- **Checklist inteligente**: Verde, turva, espuma, cheiro → o app identifica o problema
- **Prescrição personalizada**: Dosagem exata de produtos baseada no volume da piscina
- **Timeline de recuperação**: Estimativa de quando a piscina ficará cristalina

### 📊 Modo Acompanhamento (Track Pool)

Manutenção preventiva sem complicação:

- **Scan de medidores**: O usuário envia foto de tiras de teste ou medidores digitais, e nossa IA extrai os valores automaticamente
- **Quick Logs**: Registro de ações com um toque ("Adicionei cloro", "Liguei filtro")
- **Dashboard visual**: Status em tempo real com indicadores de cor (Azul Cristal → Verde Alerta)
- **Timeline histórica**: Visualização de padrões ao longo do tempo (estilo GitHub contributions)

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

### 👤 Múltiplos Perfis de Usuário

| Modo              | Descrição                                                          | Ideal para                 |
| ----------------- | ------------------------------------------------------------------ | -------------------------- |
| **🎫 Guest**      | Acesso imediato ao SOS Mode, dados locais por 7 dias               | Usuários em emergência     |
| **🏠 Homeowner**  | Registro de uma piscina, histórico completo, notificações          | Proprietários residenciais |
| **🧢 Pro Keeper** | Piscinas ilimitadas, relatórios PDF, compartilhamento com clientes | Profissionais de limpeza   |

### 🔔 Sistema Inteligente de Notificações

- Lembrete de início/fim de filtragem
- Alertas de parâmetros químicos críticos
- Previsão meteorológica integrada (chuva prevista = cheque o pH)
