-- NEVOY Reserve AI — schema inicial
-- Estoque + reservas sincronizadas, motor de expiração via pg_cron.

-- Extensões
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type reservation_status as enum ('active','expired','sold','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_source as enum ('whatsapp','atendente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum (
    'reservation_created',
    'reservation_cancelled',
    'reservation_expired',
    'sale_confirmed',
    'stock_updated',
    'product_created'
  );
exception when duplicate_object then null; end $$;

-- Tabelas
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  image text not null default '📦',
  category text not null default 'Geral',
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  source reservation_source not null,
  status reservation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists reservations_status_expires_idx
  on public.reservations(status, expires_at);
create index if not exists reservations_product_idx
  on public.reservations(product_id);
create index if not exists reservations_created_idx
  on public.reservations(created_at desc);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  amount numeric(10,2) not null,
  sold_at timestamptz not null default now()
);

create index if not exists sales_sold_at_idx on public.sales(sold_at desc);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  type activity_type not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_idx
  on public.activity_logs(created_at desc);

-- TTL configurável da reserva
create or replace function public.reservation_ttl_minutes()
returns int language sql immutable as $$ select 10 $$;

-- RPC: criar reserva (atômica)
create or replace function public.create_reservation(
  p_product_id uuid,
  p_customer_name text,
  p_source reservation_source
) returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product products;
  v_reservation reservations;
begin
  select * into v_product from products where id = p_product_id for update;
  if not found then
    raise exception 'product_not_found' using errcode = 'P0001';
  end if;
  if v_product.stock <= 0 then
    raise exception 'out_of_stock' using errcode = 'P0001';
  end if;

  update products set stock = stock - 1 where id = p_product_id;

  insert into reservations (product_id, customer_name, source, expires_at)
  values (
    p_product_id,
    p_customer_name,
    p_source,
    now() + (reservation_ttl_minutes() || ' minutes')::interval
  )
  returning * into v_reservation;

  insert into activity_logs (type, message)
  values (
    'reservation_created',
    p_customer_name || ' reservou ' || v_product.name || ' via ' ||
    case when p_source = 'whatsapp' then 'WhatsApp' else 'atendente' end
  );

  return v_reservation;
end;
$$;

-- RPC: cancelar reserva (devolve estoque)
create or replace function public.cancel_reservation(p_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation reservations;
  v_product products;
begin
  select * into v_reservation from reservations where id = p_id for update;
  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0001';
  end if;
  if v_reservation.status <> 'active' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;

  update reservations set status = 'cancelled' where id = p_id
    returning * into v_reservation;
  update products set stock = stock + 1 where id = v_reservation.product_id
    returning * into v_product;

  insert into activity_logs (type, message)
  values (
    'reservation_cancelled',
    'Reserva de ' || v_reservation.customer_name || ' cancelada (' || v_product.name || ')'
  );

  return v_reservation;
end;
$$;

-- RPC: confirmar venda
create or replace function public.confirm_sale(p_id uuid)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
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

  insert into sales (reservation_id, amount)
  values (p_id, v_product.price)
  returning * into v_sale;

  insert into activity_logs (type, message)
  values (
    'sale_confirmed',
    v_reservation.customer_name || ' confirmou compra de ' || v_product.name
  );

  return v_sale;
end;
$$;

-- RPC: expirar reservas vencidas (chamada pelo cron)
create or replace function public.expire_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_row reservations;
  v_product products;
begin
  for v_row in
    select * from reservations
    where status = 'active' and expires_at <= now()
    for update skip locked
  loop
    update reservations set status = 'expired' where id = v_row.id;
    update products set stock = stock + 1 where id = v_row.product_id
      returning * into v_product;
    insert into activity_logs (type, message)
    values (
      'reservation_expired',
      'Reserva de ' || v_row.customer_name || ' expirou (' || v_product.name || ')'
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- RPC: ajustar estoque manualmente (dashboard)
create or replace function public.adjust_stock(p_id uuid, p_delta int)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product products;
  v_new int;
begin
  select * into v_product from products where id = p_id for update;
  if not found then
    raise exception 'product_not_found' using errcode = 'P0001';
  end if;
  v_new := greatest(0, v_product.stock + p_delta);
  update products set stock = v_new where id = p_id returning * into v_product;
  insert into activity_logs (type, message)
  values (
    'stock_updated',
    'Estoque ' || case when p_delta > 0 then '+' else '' end || p_delta::text ||
    ' em ' || v_product.name || ' (agora ' || v_new::text || ')'
  );
  return v_product;
end;
$$;

-- Log automático ao criar produto
create or replace function public.products_after_insert()
returns trigger language plpgsql as $$
begin
  insert into activity_logs (type, message)
  values ('product_created', 'Produto criado: ' || new.name);
  return new;
end;
$$;

drop trigger if exists products_after_insert_trg on public.products;
create trigger products_after_insert_trg
  after insert on public.products
  for each row execute function public.products_after_insert();

-- Permissões: anon pode ler tudo, mutações de inventário via RPCs.
-- (sem auth no MVP — apertar quando entrar dashboard com login)
alter table public.products enable row level security;
alter table public.reservations enable row level security;
alter table public.sales enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "anon read products" on public.products;
drop policy if exists "anon read reservations" on public.reservations;
drop policy if exists "anon read sales" on public.sales;
drop policy if exists "anon read logs" on public.activity_logs;
drop policy if exists "anon write products" on public.products;

create policy "anon read products" on public.products
  for select using (true);
create policy "anon read reservations" on public.reservations
  for select using (true);
create policy "anon read sales" on public.sales
  for select using (true);
create policy "anon read logs" on public.activity_logs
  for select using (true);

-- CRUD direto de produtos (admin). MVP: anon liberado.
create policy "anon write products" on public.products
  for all using (true) with check (true);

grant execute on function public.create_reservation(uuid, text, reservation_source) to anon, authenticated;
grant execute on function public.cancel_reservation(uuid) to anon, authenticated;
grant execute on function public.confirm_sale(uuid) to anon, authenticated;
grant execute on function public.adjust_stock(uuid, int) to anon, authenticated;
grant execute on function public.expire_reservations() to anon, authenticated;

-- Realtime: publicar mudanças nas 4 tabelas
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.reservations;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.sales;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.activity_logs;
exception when duplicate_object then null; end $$;

-- Cron: expira reservas a cada 1 minuto
create extension if not exists pg_cron;

do $$ begin
  perform cron.unschedule('expire-reservations');
exception when others then null; end $$;

select cron.schedule(
  'expire-reservations',
  '* * * * *',
  $$select public.expire_reservations()$$
);
