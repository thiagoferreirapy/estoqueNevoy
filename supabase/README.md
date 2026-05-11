# Supabase — NEVOY Reserve AI

Backend Postgres + Realtime + pg_cron para o motor de reservas.

## 1. Criar projeto

1. Acesse https://supabase.com e crie um projeto novo.
2. Em **Project Settings → API** copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Rodar a migração

No **SQL Editor** do Supabase (Dashboard), cole e execute na ordem:

1. `migrations/0001_init.sql` — cria tabelas, enums, RPCs, RLS, Realtime e o cron de expiração.
2. `migrations/0002_improvements.sql` — adiciona `settings`, `price_at_reservation`, `ON DELETE RESTRICT`, `is_admin()` (placeholder), cleanup cron de logs e RPC `set_setting`.
3. `migrations/0003_auth_and_storage.sql` — adiciona `profiles`, trigger de auto-criação no signup, `is_admin()` baseado em profiles, `image_url` em produtos, bucket de Storage `product-images` e gate de admin em `adjust_stock`.
4. `seed.sql` — popula com produtos de demonstração (opcional, só em dev).

### Bootstrap do primeiro admin

Depois de rodar a migration 0003:

1. **Authentication → Users → Add user** no dashboard do Supabase. Marque "Auto Confirm User".
2. No **SQL Editor**, promova o usuário pra admin:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'seu@email.com');
   ```
3. Agora acesse `http://localhost:3002/login` e entre com esse email/senha.

> O `pg_cron` é habilitado automaticamente pela migração. Caso o projeto bloqueie a extensão, habilite manualmente em **Database → Extensions → pg_cron**.

## 3. Configurar os apps

Em cada app (`painel-admin/` e `app-atendente/`) crie um `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Depois:

```bash
npm install
npm run dev
```

- `painel-admin` → http://localhost:3002
- `app-atendente` → http://localhost:3001

## Arquitetura

- **Mutations atômicas** via funções RPC (`create_reservation`, `cancel_reservation`, `confirm_sale`, `adjust_stock`) — todas marcadas `SECURITY DEFINER` e fazem `SELECT ... FOR UPDATE` no produto antes de mexer no estoque. Evita oversell em concorrência WhatsApp/loja.
- **Expiração híbrida**: `pg_cron` chama `expire_reservations()` a cada 1 min (fonte da verdade). O `create_reservation` também chama `expire_reservations()` on-demand quando vê estoque = 0. O cliente usa `useNow()` pra atualizar contadores visuais por segundo.
- **Preço congelado**: cada reserva grava `price_at_reservation` no momento da criação. `confirm_sale` usa esse valor — mudança de preço no catálogo não afeta o cliente.
- **Integridade referencial**: `ON DELETE RESTRICT` em produtos — não dá pra apagar produto com reservas/vendas históricas.
- **Realtime**: `products`, `reservations`, `sales`, `activity_logs` e `settings` estão na publication `supabase_realtime`.
- **Auth (admin)**: tabela `profiles` (1:1 com `auth.users`) com role `admin | atendente`. `is_admin()` lê de lá. Trigger `on_auth_user_created` cria profile com role default `atendente`. Promoção pra admin é manual via SQL (ou pela Edge Function de admin, a fazer).
- **RLS**: leitura de produtos/settings/reservations/sales/logs liberada para `anon` (atendente é dispositivo compartilhado sem login). Mutações de produtos, settings e `adjust_stock` passam pelo gate `is_admin()`. Mutações de inventário (`create_reservation`, `cancel_reservation`, `confirm_sale`) seguem abertas a anon — atendente precisa delas.
- **Storage**: bucket público `product-images`. Upload/delete restritos a `is_admin()`. Leitura pública via `getPublicUrl`.
- **Cleanup**: cron diário às 03h remove `activity_logs` com mais de 30 dias.

## Próximos passos

- Edge Function para o webhook do WhatsApp (Evolution API → OpenAI tools)
- Edge Function de admin para promover/demover usuários sem precisar de SQL
- Mover OpenAI/Evolution keys para Supabase Vault, lidas pela Edge Function (nunca expor no client)
- Auth no app-atendente também (atualmente é anon — dispositivo compartilhado da loja)
