MVP — Sistema de Reservas Inteligentes via WhatsApp

Nome provisório:
NEVOY Reserve AI

Objetivo do MVP

Resolver um problema simples:

impedir conflito de estoque entre WhatsApp e loja física.

O MVP NÃO tenta:

substituir ERP
virar CRM completo
fazer IA super humana

Ele faz UMA coisa MUITO bem:

reserva sincronizada em tempo real.
Stack
Frontend
Next.js
Tailwind CSS
shadcn/ui
Zustand
Backend
Supabase

Usando:

PostgreSQL
Auth
Realtime
Edge Functions
Storage
IA
OpenAI Platform

Modelo:

GPT-4.1 mini

Porque:

barato
rápido
suficiente pro MVP
WhatsApp
Melhor opção MVP:
Evolution API

Porque:

barato
simples
QR Code
integração rápida
Estrutura do sistema
Cliente WhatsApp
↓
Evolution API
↓
Webhook Next.js
↓
OpenAI
↓
Tools
↓
Supabase
↓
Realtime
↓
Dashboard + App atendente
Módulos do MVP

1. Dashboard Admin
   Objetivo

Controle geral da loja.

Funcionalidades
Produtos
cadastrar produto
editar estoque
preço
categoria
foto
Estoque
aumentar quantidade
diminuir quantidade
ver reservas ativas
Reservas
lista reservas
timer
cancelar
confirmar venda
Logs
reservas criadas
cancelamentos
expirações
Layout do dashboard
Sidebar
Dashboard
Produtos
Reservas
Estoque
Configurações
Tela principal
Cards
faturamento hoje
reservas ativas
estoque baixo
vendas concluídas
Lista realtime

Atualiza instantaneamente.

2. App do Atendente
   NÃO será app nativo

Será:

PWA

Abre no celular como app.

Muito mais rápido pra lançar.

Funcionalidades
Buscar produto

Campo:

Buscar produto...
Resultado

Card:

iPhone 15 Pro
256GB
2 unidades disponíveis
Ações
reservar
cancelar reserva
confirmar venda
Fluxo do atendente
Cliente presencial:

“Quero esse iPhone”

Atendente:

busca produto
reserva
produto bloqueado instantaneamente 3. WhatsApp IA

Esse é o canal principal.

Fluxo IA
Cliente

Tem iPhone 15?

IA chama tool
check_stock({
"product": "iPhone 15"
})
Backend responde
{
"available": true,
"quantity": 2,
"price": 5999
}
IA responde
Temos 2 unidades disponíveis por R$ 5.999.
Deseja reservar?
Cliente

sim

IA
Qual seu nome?
Cliente

Thiago

Tool
create_reservation({
"customer_name": "Thiago",
"product_id": "123"
})
IA
Reserva criada ✅

Ela ficará disponível por 2 horas. 4. Motor de Reservas

O coração do sistema.

Regras
Reserva criada
estoque disponível --
item bloqueado
Reserva expira
estoque ++
item liberado
Venda confirmada
baixa definitiva
Timer

MVP:

10 minutos

Produção:

2 horas
Estratégia técnica
Cron Job

Executa:

a cada 1 minuto
Verifica
WHERE expires_at < NOW()
Expira automaticamente
Banco de dados
products
id
name
price
stock
image
category
created_at
reservations
id
product_id
customer_name
source
status
expires_at
created_at

status:

active
expired
sold
cancelled
sales
id
reservation_id
amount
sold_at
activity_logs
id
type
message
created_at
Realtime
Quando algo muda:
dashboard atualiza
app atendente atualiza
WhatsApp respeita novo estoque

Tudo instantâneo.

Regras IMPORTANTES
Nunca confiar no frontend

Toda reserva:

validada no backend
Nunca decrementar estoque duas vezes

Usar:

transaction
Nunca deixar reserva eterna

Toda reserva:

precisa expirar
Roadmap
V1

✅ estoque
✅ reservas
✅ WhatsApp IA
✅ painel
✅ realtime
