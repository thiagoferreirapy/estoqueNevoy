"use client";

import * as React from "react";
import { Search, Package, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { formatBRL, formatCountdown, formatRpcError, cn } from "@/lib/utils";
import { ProductAvatar } from "@/components/product-avatar";
import { toast } from "sonner";
import type { Product, Reservation } from "@/lib/types";

export default function BuscarPage() {
  const products = useStore((s) => s.products);
  const reservations = useStore((s) => s.reservations);
  const createReservation = useStore((s) => s.createReservation);
  const cancelReservation = useStore((s) => s.cancelReservation);
  const confirmSale = useStore((s) => s.confirmSale);
  const attendantName = useStore((s) => s.attendantName);

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Product | null>(null);
  const [customer, setCustomer] = React.useState("");

  const filtered = query
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      )
    : products;

  const activeForProduct = (id: string): Reservation | undefined =>
    reservations.find((r) => r.productId === id && r.status === "active");

  function openProduct(p: Product) {
    setSelected(p);
    setCustomer("");
  }

  async function reserve() {
    if (!selected) return;
    if (!customer.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    try {
      await createReservation(selected.id, customer.trim(), "atendente");
      toast.success(`Reservado para ${customer.trim()}`);
      setSelected(null);
    } catch (e) {
      toast.error(formatRpcError(e, "Erro ao reservar"));
    }
  }

  async function reserveAndSell() {
    if (!selected) return;
    const name = customer.trim() || "Cliente presencial";
    try {
      const res = await createReservation(selected.id, name, "atendente");
      await confirmSale(res.id);
      toast.success("Venda registrada");
      setSelected(null);
    } catch (e) {
      toast.error(formatRpcError(e, "Erro ao vender"));
    }
  }

  return (
    <>
      <AppHeader title="Buscar produto" />

      <main className="space-y-4 px-4 py-4">
        {!attendantName && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="flex-1">
              Defina seu nome em <strong>Perfil</strong> antes de reservar
            </span>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-11"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-8 w-8" />
              Nenhum produto encontrado
            </div>
          )}
          {filtered.map((p) => {
            const reserved = activeForProduct(p.id);
            const out = p.stock === 0;
            const low = p.stock > 0 && p.stock <= 2;
            return (
              <button
                key={p.id}
                onClick={() => openProduct(p)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all active:scale-[0.98]",
                  out && "opacity-60",
                )}
              >
                <ProductAvatar
                  imageUrl={p.imageUrl}
                  emoji={p.image}
                  alt={p.name}
                  className="h-14 w-14 shrink-0"
                  emojiClassName="text-3xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <p className="mt-1 font-bold text-primary">
                    {formatBRL(p.price)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {out ? (
                    <Badge variant="destructive">Esgotado</Badge>
                  ) : low ? (
                    <Badge variant="warning">{p.stock} un.</Badge>
                  ) : (
                    <Badge variant="secondary">{p.stock} un.</Badge>
                  )}
                  {reserved && (
                    <Badge variant="outline" className="text-[10px]">
                      Reserva ativa
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <SelectedProductSheet
            product={selected}
            customer={customer}
            setCustomer={setCustomer}
            attendantName={attendantName}
            reserve={reserve}
            reserveAndSell={reserveAndSell}
            cancelReservation={cancelReservation}
            confirmSale={confirmSale}
            existingReservation={activeForProduct(selected.id)}
            onClose={() => setSelected(null)}
          />
        )}
      </Sheet>
    </>
  );
}

type SheetContentProps = {
  product: Product;
  customer: string;
  setCustomer: (v: string) => void;
  attendantName: string;
  reserve: () => void;
  reserveAndSell: () => void;
  cancelReservation: (id: string) => Promise<void>;
  confirmSale: (id: string) => Promise<void>;
  existingReservation: Reservation | undefined;
  onClose: () => void;
};

function SelectedProductSheet({
  product,
  customer,
  setCustomer,
  reserve,
  reserveAndSell,
  cancelReservation,
  confirmSale,
  existingReservation,
  onClose,
}: SheetContentProps) {
  const now = useNow();
  const ms = existingReservation
    ? new Date(existingReservation.expiresAt).getTime() - now
    : 0;
  const out = product.stock === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ProductAvatar
          imageUrl={product.imageUrl}
          emoji={product.image}
          alt={product.name}
          className="h-16 w-16 shrink-0 rounded-xl"
          emojiClassName="text-4xl"
        />
        <div className="flex-1">
          <h2 className="text-lg font-bold leading-tight">{product.name}</h2>
          <p className="text-xs text-muted-foreground">{product.category}</p>
          <p className="mt-1 text-xl font-bold text-primary">
            {formatBRL(product.price)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Disponível</p>
          <p className="text-2xl font-bold">{product.stock}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-semibold">
            {out
              ? "Esgotado"
              : existingReservation
                ? "Reservado"
                : "Disponível"}
          </p>
        </div>
      </div>

      {existingReservation ? (
        <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Reservado para</p>
              <p className="font-semibold">
                {existingReservation.customerName}
              </p>
            </div>
            <div className="rounded-md bg-background px-2.5 py-1 font-mono text-base font-bold tabular-nums">
              {formatCountdown(ms)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              variant="success"
              onClick={() => {
                confirmSale(existingReservation.id)
                  .then(() => {
                    toast.success("Venda confirmada");
                    onClose();
                  })
                  .catch((e) => toast.error(formatRpcError(e, "Erro")));
              }}
            >
              <CheckCircle2 className="h-5 w-5" /> Confirmar venda
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                cancelReservation(existingReservation.id)
                  .then(() => {
                    toast("Reserva cancelada");
                    onClose();
                  })
                  .catch((e) => toast.error(formatRpcError(e, "Erro")));
              }}
            >
              <XCircle className="h-5 w-5" /> Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Nome do cliente
            </label>
            <Input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Ex: Thiago"
              autoFocus
            />
          </div>
          <Button
            size="lg"
            onClick={reserve}
            disabled={out}
            className="w-full"
          >
            Reservar por 10 min
          </Button>
          <Button
            size="lg"
            variant="success"
            onClick={reserveAndSell}
            disabled={out}
            className="w-full"
          >
            <CheckCircle2 className="h-5 w-5" /> Vender agora
          </Button>
        </div>
      )}
    </div>
  );
}
