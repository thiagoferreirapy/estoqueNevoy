"use client";

import * as React from "react";
import { User, LogOut, Smartphone, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { AppHeader } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export default function PerfilPage() {
  const name = useStore((s) => s.attendantName);
  const setName = useStore((s) => s.setAttendantName);
  const reservations = useStore((s) => s.reservations);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [local, setLocal] = React.useState(name);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => setLocal(name), [name]);

  const mine = reservations.filter((r) => r.source === "atendente");
  const myActive = mine.filter((r) => r.status === "active").length;
  const mySold = mine.filter((r) => r.status === "sold").length;

  function save() {
    if (!local.trim()) {
      toast.error("Informe um nome");
      return;
    }
    setName(local.trim());
    toast.success("Perfil atualizado");
  }

  function reset() {
    if (confirm("Limpar dados locais?")) {
      localStorage.removeItem("nevoy-atendente-store");
      location.reload();
    }
  }

  return (
    <>
      <AppHeader title="Perfil" />
      <main className="space-y-4 px-4 py-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
              <User className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">
                {name || "Atendente"}
              </p>
              <p className="text-xs text-muted-foreground">Loja Centro</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Ativas</p>
            <p className="text-2xl font-bold">{myActive}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Vendidas</p>
            <p className="text-2xl font-bold text-success">{mySold}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Seus dados</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <Button onClick={save} className="w-full">
            Salvar
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Aparência</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mounted && theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" /> Claro
            </Button>
            <Button
              variant={mounted && theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" /> Escuro
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="h-4 w-4" /> Instalar como app
          </h3>
          <p className="text-xs text-muted-foreground">
            No celular: abra o menu do navegador e toque em{" "}
            <strong>Adicionar à tela inicial</strong>. O app fica disponível
            como um ícone e abre em tela cheia.
          </p>
        </div>

        <Button variant="outline" onClick={reset} className="w-full">
          <LogOut className="h-4 w-4" /> Limpar dados locais
        </Button>
      </main>
    </>
  );
}
