"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  User,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { formatBRL, formatCountdown, formatRpcError, cn } from "@/lib/utils";
import { ProductAvatar } from "@/components/product-avatar";
import { toast } from "sonner";
import type { ReservationStatus } from "@/lib/types";

const filters: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "active", label: "Ativas" },
  { value: "sold", label: "Vendidas" },
  { value: "all", label: "Todas" },
];

const statusVariant = {
  active: "warning",
  sold: "success",
  expired: "secondary",
  cancelled: "destructive",
} as const;

const statusLabel = {
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
      <AppHeader title="Reservas" />
      <main className="space-y-4 px-4 py-4">
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              onClick={() => setFilter(f.value)}
              className="flex-1"
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {list.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              <Clock className="mx-auto mb-2 h-8 w-8" />
              Nenhuma reserva por aqui
            </div>
          )}
          {list.map((r) => {
            const product = products.find((p) => p.id === r.productId);
            const ms = new Date(r.expiresAt).getTime() - now;
            const active = r.status === "active";
            const urgent = active && ms < 60_000;
            return (
              <div
                key={r.id}
                className="space-y-3 rounded-xl border bg-card p-4"
              >
                <div className="flex gap-3">
                  <ProductAvatar
                    imageUrl={product?.imageUrl}
                    emoji={product?.image ?? "📦"}
                    alt={product?.name ?? ""}
                    className="h-12 w-12 shrink-0"
                    emojiClassName="text-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-semibold leading-tight">
                        {product?.name ?? "—"}
                      </p>
                      <Badge variant={statusVariant[r.status]}>
                        {statusLabel[r.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.customerName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <Badge
                        variant={r.source === "whatsapp" ? "success" : "secondary"}
                        className="gap-1"
                      >
                        {r.source === "whatsapp" ? (
                          <MessageCircle className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {r.source === "whatsapp" ? "WhatsApp" : "Loja"}
                      </Badge>
                      <span className="font-semibold text-primary">
                        {formatBRL(r.priceAtReservation)}
                      </span>
                    </div>
                  </div>
                  {active && (
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-mono text-sm font-bold tabular-nums",
                        urgent
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning",
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {formatCountdown(ms)}
                    </div>
                  )}
                </div>
                {active && (
                  <div className="grid grid-cols-2 gap-2">
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
            );
          })}
        </div>
      </main>
    </>
  );
}
