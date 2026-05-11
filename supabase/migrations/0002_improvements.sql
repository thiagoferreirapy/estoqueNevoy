-- 0002 — Melhorias pós-MVP inicial
-- Idempotente: pode rodar em cima do 0001 sem efeitos colaterais.

-- ============================================================
-- 1. Tabela de settings (configurações dinâmicas)
-- ============================================================
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('reservation_ttl_minutes', '10'::jsonb),
  ('store_name',              '"Loja Centro"'::jsonb),
  ('whatsapp_number',         '""'::jsonb)
on conflict (key) do nothing;

-- TTL agora vem do settings (com fallback para 10)
create or replace function public.reservation_ttl_minutes()
returns int language sql stable as $$
  select coalesce(
    (select (value #>> '{}')::int from public.settings where key = 'reservation_ttl_minutes'),
    10
  )
$$;

-- ============================================================
-- 2. is_admin() — scaffold para quando Supabase Auth entrar
-- ============================================================
-- Hoje retorna true (compatibilidade com o MVP sem auth).
-- Quando auth chegar, troque por:
--   select coalesce((auth.jwt() ->> 'role') = 'admin', false)
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select true
$$;

-- ============================================================
-- 3. RLS — substituir policy permissiva por gate de admin
-- ============================================================
drop policy if exists "anon write products" on public.products;
drop policy if exists "admin write products" on public.products;
create policy "admin write products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.settings enable row level security;

drop policy if exists "anon read settings" on public.settings;
create policy "anon read settings" on public.settings
  for select using (true);

drop policy if exists "admin write settings" on public.settings;
create policy "admin write settings" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 4. Preço congelado na reserva
-- ============================================================
alter table public.reservations
  add column if not exists price_at_reservation numeric(10,2);

-- Backfill em reservas pré-existentes
update public.reservations r
set price_at_reservation = p.price
from public.products p
where r.product_id = p.id and r.price_at_reservation is null;

-- Agora pode ser NOT NULL
alter table public.reservations
  alter column price_at_reservation set not null;

-- ============================================================
-- 5. ON DELETE RESTRICT em produtos — evita apagar produto
-- com reservas ativas/históricas silenciosamente
-- ============================================================
alter table public.reservations
  drop constraint if exists reservations_product_id_fkey;
alter table public.reservations
  add constraint reservations_product_id_fkey
  foreign key (product_id) references public.products(id) on delete restrict;

-- ============================================================
-- 6. create_reservation: expiração on-demand + price snapshot
-- ============================================================
create or replace function public.create_reservation(
  p_product_id uuid,
  p_customer_name text,
  p_source reservation_source
) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare
  v_product products;
  v_reservation reservations;
  v_stock int;
begin
  -- Pré-check sem lock pra evitar deadlock com expire_reservations
  select stock into v_stock from products where id = p_product_id;
  if not found then
    raise exception 'product_not_found' using errcode = 'P0001';
  end if;

  -- Se estoque zerado, tenta liberar reservas vencidas ANTES de travar o produto
  if v_stock <= 0 then
    perform expire_reservations();
  end if;

  -- Agora trava o produto e valida com certeza
  select * into v_product from products where id = p_product_id for update;
  if v_product.stock <= 0 then
    raise exception 'out_of_stock' using errcode = 'P0001';
  end if;

  update products set stock = stock - 1 where id = p_product_id;

  insert into reservations (
    product_id, customer_name, source, expires_at, price_at_reservation
  ) values (
    p_product_id,
    p_customer_name,
    p_source,
    now() + (reservation_ttl_minutes() || ' minutes')::interval,
    v_product.price
  )
  returning * into v_reservation;

  insert into activity_logs (type, message) values (
    'reservation_created',
    p_customer_name || ' reservou ' || v_product.name || ' via ' ||
    case when p_source = 'whatsapp' then 'WhatsApp' else 'atendente' end
  );

  return v_reservation;
end;
$$;

-- ============================================================
-- 7. confirm_sale: usa preço congelado, não o atual
-- ============================================================
create or replace function public.confirm_sale(p_id uuid)
returns public.sales
language plpgsql security definer set search_path = public as $$
declare
  v_reservation reservations;
  v_product products;
  v_sale sales;
begin
  select * into v_reservation from reservations where id = p_id for update;
  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0001';
  end if;
  if v_reservation.status <> 'active' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;

  select * into v_product from products where id = v_reservation.product_id;

  update reservations set status = 'sold' where id = p_id;

  -- Pega o preço da reserva (snapshot do momento da reserva)
  insert into sales (reservation_id, amount)
  values (p_id, v_reservation.price_at_reservation)
  returning * into v_sale;

  insert into activity_logs (type, message) values (
    'sale_confirmed',
    v_reservation.customer_name || ' confirmou compra de ' || v_product.name
  );

  return v_sale;
end;
$$;

-- ============================================================
-- 8. RPC para upsert de settings (gated por is_admin)
-- ============================================================
create or replace function public.set_setting(p_key text, p_value jsonb)
returns public.settings
language plpgsql security definer set search_path = public as $$
declare v_row settings;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  insert into settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- 9. Cleanup automático de activity_logs (>30 dias)
-- ============================================================
create or replace function public.cleanup_activity_logs()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with deleted as (
    delete from activity_logs
    where created_at < now() - interval '30 days'
    returning 1
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$$;

do $$ begin
  perform cron.unschedule('cleanup-activity-logs');
exception when others then null; end $$;

select cron.schedule(
  'cleanup-activity-logs',
  '0 3 * * *',
  $$select public.cleanup_activity_logs()$$
);

-- ============================================================
-- 10. Permissões e Realtime
-- ============================================================
grant execute on function public.set_setting(text, jsonb) to anon, authenticated;
grant execute on function public.cleanup_activity_logs() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.settings;
exception when duplicate_object then null; end $$;
