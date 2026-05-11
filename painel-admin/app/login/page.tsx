"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { formatRpcError } from "@/lib/utils";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const signIn = useStore((s) => s.signIn);
  const session = useStore((s) => s.session);
  const authReady = useStore((s) => s.authReady);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Já logado? Manda pra home.
  React.useEffect(() => {
    if (authReady && session) router.replace("/");
  }, [authReady, session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Informe email e senha");
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      toast.success("Bem-vindo");
      router.replace("/");
    } catch (err) {
      toast.error(formatRpcError(err, "Falha no login"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">NEVOY Reserve AI</h1>
          <p className="text-sm text-muted-foreground">
            Painel administrativo
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@loja.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Primeiro acesso? Crie a conta no Supabase Dashboard em{" "}
          <strong>Authentication → Users → Add user</strong>, depois rode no SQL
          Editor:{" "}
          <code className="rounded bg-muted px-1">
            update profiles set role='admin' where id=...
          </code>
        </p>
      </div>
    </main>
  );
}
