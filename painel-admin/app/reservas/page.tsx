"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  User,
  Filter,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import {
  formatBRL,
  formatCountdown,
  formatDateTime,
  formatRpcError,
} from "@/lib/utils";
import { ProductAvatar } from "@/components/product-avatar";
import type { ReservationStatus } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusFilters: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "sold", label: "Vendidas" },
  { value: "expired", label: "Expiradas" },
  { value: "cancelled", label: "Canceladas" },
];

const statusVariant: Record<
  ReservationStatus,
  "success" | "warning" | "secondary" | "destructive"
> = {
  active: "warning",
  sold: "success",
  expired: "secondary",
  cancelled: "destructive",
};

const statusLabel: Record<ReservationStatus, string> = {
  active: "Ativa",
  sold: "Vendida",
  expired: "Expirada",
  cancelled: "Cancelada",
};

export default function ReservasPage() {
  const reservations = useStore((s) => s.reservations);
  const products = useStore((s) => s.products);
  const cancelReservation = useStore((s) => s.cancelReservation);
  const confirmSale = useStore((s) => s.confirmSale);
  const now = useNow();

  const [filter, setFilter] = React.useState<ReservationStatus | "all">(
    "active",
  );

  const list = reservations.filter((r) =>
    filter === "all" ? true : r.status === filter,
  );

  return (
    <>
      <Topbar
        title="Reservas"
        subtitle="Acompanhamento de todas as reservas"
      />
      <main className="space-y-6 p-4 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Reservas ({list.length})</CardTitle>
                <CardDescription>
                  Timer regressivo em tempo real — expiração automática após 10
                  minutos
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                {statusFilters.map((f) => (
                  <Button
                    key={f.value}
                    variant={filter === f.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {list.length === 0 && (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Nenhuma reserva nesse filtro
                </div>
              )}
              {list.map((r) => {
                const product = products.find((p) => p.id === r.productId);
                const ms = new Date(r.expiresAt).getTime() - now;
                const isActive = r.status === "active";
                const urgent = isActive && ms < 60_000;

                return (
                  <div
                    key={r.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <ProductAvatar
                        imageUrl={product?.imageUrl}
                        emoji={product?.image ?? "📦"}
                        alt={product?.name ?? ""}
                        className="h-12 w-12 shrink-0"
                        emojiClassName="text-3xl"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium leading-tight">
                            {product?.name ?? "Produto removido"}
                          </p>
                          <Badge variant={statusVariant[r.status]}>
                            {statusLabel[r.status]}
                          </Badge>
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
                        <p className="text-sm text-muted-foreground">
                          {r.customerName} · {formatBRL(r.priceAtReservation)}
                          {product && product.price !== r.priceAtReservation && (
                            <span
                              className="ml-1 text-xs"
                              title="Preço do catálogo mudou após a reserva"
                            >
                              (cat. {formatBRL(product.price)})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Criada em {formatDateTime(r.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      {isActive ? (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-sm font-semibold tabular-nums",
                            urgent
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning",
                          )}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {formatCountdown(ms)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(r.expiresAt)}
                        </span>
                      )}

                      {isActive && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                              confirmSale(r.id)
                                .then(() => toast.success("Venda confirmada"))
                                .catch((e) => toast.error(formatRpcError(e)));
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              cancelReservation(r.id)
                                .then(() => toast("Reserva cancelada"))
                                .catch((e) => toast.error(formatRpcError(e)));
                            }}
                          >
                            <XCircle className="h-4 w-4" /> Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
