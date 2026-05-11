"use client";

import * as React from "react";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  ShoppingCart,
  Activity,
  MessageCircle,
  User,
  Package2,
  PackageMinus,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { ProductAvatar } from "@/components/product-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatCountdown } from "@/lib/utils";

const logIcon = {
  reservation_created: { icon: Plus, color: "text-primary" },
  reservation_cancelled: { icon: PackageMinus, color: "text-destructive" },
  reservation_expired: { icon: Clock, color: "text-warning" },
  sale_confirmed: { icon: CheckCircle2, color: "text-success" },
  stock_updated: { icon: Package2, color: "text-muted-foreground" },
  product_created: { icon: Package2, color: "text-primary" },
} as const;

export default function DashboardPage() {
  const products = useStore((s) => s.products);
  const reservations = useStore((s) => s.reservations);
  const sales = useStore((s) => s.sales);
  const logs = useStore((s) => s.logs);
  const now = useNow();

  const today = new Date().toDateString();
  const faturamentoHoje = sales
    .filter((s) => new Date(s.soldAt).toDateString() === today)
    .reduce((acc, s) => acc + s.amount, 0);

  const reservasAtivas = reservations.filter((r) => r.status === "active");
  const estoqueBaixo = products.filter((p) => p.stock > 0 && p.stock <= 2);
  const semEstoque = products.filter((p) => p.stock === 0);
  const vendasHoje = sales.filter(
    (s) => new Date(s.soldAt).toDateString() === today,
  );

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Visão geral em tempo real da operação"
      />
      <main className="space-y-6 p-4 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Faturamento hoje"
            value={formatBRL(faturamentoHoje)}
            hint={`${vendasHoje.length} venda${vendasHoje.length === 1 ? "" : "s"}`}
            icon={DollarSign}
            accent="success"
          />
          <StatCard
            label="Reservas ativas"
            value={String(reservasAtivas.length)}
            hint="aguardando confirmação"
            icon={Clock}
            accent="primary"
          />
          <StatCard
            label="Estoque baixo"
            value={String(estoqueBaixo.length)}
            hint={`${semEstoque.length} sem estoque`}
            icon={AlertTriangle}
            accent="warning"
          />
          <StatCard
            label="Vendas concluídas"
            value={String(sales.length)}
            hint="histórico total"
            icon={ShoppingCart}
            accent="primary"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Reservas ativas</CardTitle>
                <CardDescription>
                  Atualiza em tempo real conforme expira
                </CardDescription>
              </div>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                ao vivo
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {reservasAtivas.length === 0 && (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Nenhuma reserva ativa agora
                </div>
              )}
              {reservasAtivas.map((r) => {
                const product = products.find((p) => p.id === r.productId);
                const ms = new Date(r.expiresAt).getTime() - now;
                const urgent = ms < 60_000;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-accent/40"
                  >
                    <ProductAvatar
                      imageUrl={product?.imageUrl}
                      emoji={product?.image ?? "📦"}
                      alt={product?.name ?? ""}
                      className="h-10 w-10 shrink-0"
                      emojiClassName="text-2xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {product?.name ?? "—"}
                        </p>
                        <Badge
                          variant={
                            r.source === "whatsapp" ? "success" : "secondary"
                          }
                          className="gap-1"
                        >
                          {r.source === "whatsapp" ? (
                            <MessageCircle className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          {r.source === "whatsapp" ? "WhatsApp" : "Loja"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.customerName} ·{" "}
                        {product ? formatBRL(product.price) : ""}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 text-right font-mono text-sm font-semibold tabular-nums ${urgent ? "text-destructive" : "text-foreground"}`}
                    >
                      {formatCountdown(ms)}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" /> Atividade recente
              </CardTitle>
              <CardDescription>Últimos eventos do sistema</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[420px] space-y-3 overflow-y-auto scrollbar-thin">
              {logs.slice(0, 20).map((l) => {
                const meta = logIcon[l.type];
                const Icon = meta.icon;
                return (
                  <div key={l.id} className="flex items-start gap-3">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{l.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
