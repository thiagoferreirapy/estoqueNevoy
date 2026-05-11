"use client";

import * as React from "react";
import { Minus, Plus, AlertTriangle, Search } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { formatBRL, formatRpcError } from "@/lib/utils";
import { ProductAvatar } from "@/components/product-avatar";
import { toast } from "sonner";

export default function EstoquePage() {
  const products = useStore((s) => s.products);
  const reservations = useStore((s) => s.reservations);
  const adjustStock = useStore((s) => s.adjustStock);
  const [query, setQuery] = React.useState("");

  const onAdjust = (id: string, delta: number) =>
    adjustStock(id, delta).catch((err) =>
      toast.error(formatRpcError(err, "Erro ao ajustar estoque")),
    );

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const reservedByProduct = (id: string) =>
    reservations.filter((r) => r.productId === id && r.status === "active")
      .length;

  return (
    <>
      <Topbar
        title="Estoque"
        subtitle="Controle de inventário e reservas ativas"
      />
      <main className="space-y-6 p-4 lg:p-8">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Inventário ({products.length} itens)</CardTitle>
              <CardDescription>
                Ajuste rápido de quantidades disponíveis
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-9 sm:w-64"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Produto</th>
                    <th className="py-3 pr-4">Preço</th>
                    <th className="py-3 pr-4">Disponível</th>
                    <th className="py-3 pr-4">Reservas</th>
                    <th className="py-3 pr-4 text-right">Ajustar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const reserved = reservedByProduct(p.id);
                    const low = p.stock > 0 && p.stock <= 2;
                    const out = p.stock === 0;
                    return (
                      <tr
                        key={p.id}
                        className="border-b transition-colors hover:bg-accent/30"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <ProductAvatar
                              imageUrl={p.imageUrl}
                              emoji={p.image}
                              alt={p.name}
                              className="h-10 w-10 shrink-0"
                              emojiClassName="text-2xl"
                            />
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {formatBRL(p.price)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold">
                              {p.stock}
                            </span>
                            {out && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Esgotado
                              </Badge>
                            )}
                            {low && (
                              <Badge variant="warning" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Baixo
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-muted-foreground">
                            {reserved}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => onAdjust(p.id, -1)}
                              disabled={p.stock === 0}
                              aria-label="Diminuir"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => onAdjust(p.id, 1)}
                              aria-label="Aumentar"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Nenhum produto encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
