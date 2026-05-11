# NEVOY Reserve AI

MVP de reservas inteligentes para o canal WhatsApp com loja física. Dois apps Next.js independentes + backend Supabase.

- `painel-admin/` — dashboard web da loja (porta 3002, **requer login**)
- `app-atendente/` — PWA mobile-first para atendentes (porta 3001, **anon**, dispositivo compartilhado)
- `supabase/` — schema, RPCs, RLS, Storage, Auth, pg_cron e seed

## Stack

- **Frontend**: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Zustand · next-pwa (atendente)
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime + pg_cron)
- **Concorrência**: RPCs `SECURITY DEFINER` com `SELECT ... FOR UPDATE` — evita oversell WhatsApp × loja
- **Expiração**: híbrida — `pg_cron` a cada 1 min é a fonte da verdade, `useNow()` no client atualiza o contador visual
- **Auth (admin)**: Supabase Auth via email/senha. `is_admin()` lê de `profiles.role`. Atendente fica anon (dispositivo compartilhado da loja).
- **Storage**: bucket `product-images` com upload restrito a admins.

## Setup

### 1. Backend

1. Crie um projeto em https://supabase.com.
2. No **SQL Editor**, rode em ordem:
   - `supabase/migrations/0001_init.sql` — tabelas, RPCs, RLS, Realtime e pg_cron.
   - `supabase/migrations/0002_improvements.sql` — settings, preço congelado, ON DELETE RESTRICT, cleanup cron.
   - `supabase/migrations/0003_auth_and_storage.sql` — profiles, is_admin via DB, bucket de fotos.
   - `supabase/seed.sql` *(opcional)* — produtos de demonstração.
3. Crie o primeiro admin: **Authentication → Users → Add user** (auto-confirm), depois SQL:
   ```sql
   update public.profiles set role='admin'
   where id=(select id from auth.users where email='seu@email.com');
   ```

Detalhes em [supabase/README.md](supabase/README.md).

### 2. Apps

Em cada app, copie `.env.local.example` → `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

```bash
# painel admin
cd painel-admin && npm install && npm run dev
# → http://localhost:3002 (redireciona pra /login)

# app do atendente (outro terminal)
cd app-atendente && npm install && npm run dev
# → http://localhost:3001 (PWA — em prod, instalável)
```

## Painel admin (`painel-admin/`)

Login obrigatório, role `admin`. Conta sem essa role vê tela de "acesso restrito" com instrução de promoção.

- `/login` — email + senha
- `/` Dashboard — cards de faturamento, reservas ativas, estoque baixo, vendas + lista realtime + log
- `/produtos` — CRUD com upload de **foto** (Supabase Storage) ou fallback emoji; ConfirmDialog na exclusão
- `/reservas` — filtros por status, timer regressivo, confirmar venda / cancelar — mostra **preço congelado**
- `/estoque` — tabela com ajuste rápido de quantidade (`adjust_stock` RPC, gated por admin)
- `/configuracoes` — nome da loja, TTL de reserva, número WhatsApp — salvos via `set_setting` RPC

Sidebar mostra nome do admin logado e botão de logout.

## App atendente (`app-atendente/`)

PWA mobile-first com **service worker** (next-pwa) — assets e fotos de produto ficam em cache. Mutations sempre online (sem reserva offline). Anon (dispositivo da loja, sem login individual).

- `/` Buscar produto → bottom sheet com **Reservar** ou **Vender agora**
- `/reservas` — suas reservas + as do WhatsApp, com timer ao vivo
- `/perfil` — nome do atendente (localStorage), contador pessoal, tema

## Motor de reservas

Toda mutação de estoque/reserva passa por RPC atômica no Postgres:

| RPC | Faz | Quem pode |
|---|---|---|
| `create_reservation` | `FOR UPDATE` no produto, decrementa estoque, insere reserva com `price_at_reservation`. Se estoque = 0, tenta `expire_reservations()` antes. | `anon` + `authenticated` |
| `cancel_reservation` | Marca `cancelled` e devolve `stock + 1`. | `anon` + `authenticated` |
| `confirm_sale` | Marca `sold`, insere `sales` com o preço congelado. | `anon` + `authenticated` |
| `adjust_stock` | Ajuste manual do dashboard. | `is_admin()` apenas |
| `set_setting` | Upsert de settings. | `is_admin()` apenas |
| `expire_reservations` | Cron a cada 1 min. | (interno) |

## Roadmap

- [ ] Edge Function: webhook Evolution API → OpenAI tools (`check_stock`, `create_reservation`)
- [ ] Edge Function de admin para promover usuários sem precisar de SQL
- [ ] Auth no atendente (opcional — turnos por atendente individual)
- [ ] Optimistic updates nas mutations mais usadas
- [ ] Monorepo (pnpm/turborepo) para extrair `lib/` e `components/ui` compartilhados
# estoqueNevoy
