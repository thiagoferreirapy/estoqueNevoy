-- 0003 — Auth (Supabase Auth) + Storage de imagens de produto
-- Idempotente: pode rodar em cima dos 0001/0002 sem efeitos colaterais.

-- ============================================================
-- 1. Tabela de profiles (1:1 com auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'atendente'
    check (role in ('admin', 'atendente')),
  name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "admin read all profiles" on public.profiles;
create policy "admin read all profiles" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
-- (impede usuário comum auto-promover; só admin via SQL/Service role)

-- ============================================================
-- 2. Trigger: cria profile automaticamente em signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, name)
  values (new.id, 'atendente', coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. is_admin() agora lê de profiles
-- ============================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  )
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ============================================================
-- 4. adjust_stock agora exige admin (era aberto)
-- ============================================================
create or replace function public.adjust_stock(p_id uuid, p_delta int)
returns public.products
language plpgsql security definer set search_path = public as $$
declare
  v_product products;
  v_new int;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
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

-- ============================================================
-- 5. Coluna image_url em products (URL pública do Storage)
-- ============================================================
alter table public.products
  add column if not exists image_url text;

-- ============================================================
-- 6. Storage: bucket público para imagens de produto
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Leitura pública via getPublicUrl funciona automaticamente em bucket público.

-- ============================================================
-- 7. Bootstrap: promover o primeiro admin
-- ============================================================
-- Após criar a primeira conta pelo /login do painel-admin, rode aqui:
--   update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'seu@email.com');
--
-- A partir do segundo admin, o existente pode promover via SQL ou via a Edge
-- Function de admin (a fazer).
