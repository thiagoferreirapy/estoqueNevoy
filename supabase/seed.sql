-- Dados de demonstração. Idempotente: limpa e repopula.
-- Rode apenas em ambiente de desenvolvimento.

truncate
  public.sales,
  public.reservations,
  public.activity_logs,
  public.products
restart identity cascade;

insert into public.products (id, name, price, stock, image, category, created_at) values
  ('11111111-1111-1111-1111-111111111101', 'iPhone 15 Pro',         7999.00,  4, '📱', 'Smartphones', now() - interval '7 days'),
  ('11111111-1111-1111-1111-111111111102', 'iPhone 15',             5999.00,  2, '📱', 'Smartphones', now() - interval '6 days'),
  ('11111111-1111-1111-1111-111111111103', 'MacBook Air M3',       12499.00,  1, '💻', 'Notebooks',   now() - interval '5 days'),
  ('11111111-1111-1111-1111-111111111104', 'AirPods Pro 2',         2299.00, 12, '🎧', 'Áudio',       now() - interval '4 days'),
  ('11111111-1111-1111-1111-111111111105', 'Apple Watch Series 10', 4799.00,  0, '⌚', 'Wearables',   now() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111106', 'iPad Air',              5299.00,  6, '📲', 'Tablets',     now() - interval '2 days');

-- Limpa logs gerados pelos triggers de seed (visual mais limpo no dashboard)
truncate public.activity_logs;
