import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Traduz erros vindos das RPCs/postgres para mensagens em PT-BR amigáveis.
// Os códigos batem com as exceptions levantadas em supabase/migrations/0001_init.sql.
const RPC_ERROR_LABELS: Record<string, string> = {
  out_of_stock: "Sem estoque disponível",
  product_not_found: "Produto não encontrado",
  reservation_not_found: "Reserva não encontrada",
  reservation_not_active: "Reserva não está mais ativa",
  forbidden: "Sem permissão para essa ação",
};

export function formatRpcError(e: unknown, fallback = "Erro inesperado"): string {
  const msg = e instanceof Error ? e.message : "";
  for (const [code, label] of Object.entries(RPC_ERROR_LABELS)) {
    if (msg.includes(code)) return label;
  }
  return msg || fallback;
}
