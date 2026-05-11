"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/sidebar";
import { toast } from "sonner";

const PUBLIC_PATHS = new Set(["/login"]);

// Boot da aplicação:
// 1. Resolve auth (initAuth).
// 2. Se não logado → redireciona p/ /login (e renderiza essa rota livremente).
// 3. Se logado → dispara init() de dados e mostra spinner até ready.
// 4. Bloqueia acesso de não-admin com aviso.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.has(pathname);

  const initAuth = useStore((s) => s.initAuth);
  const init = useStore((s) => s.init);
  const authReady = useStore((s) => s.authReady);
  const session = useStore((s) => s.session);
  const profile = useStore((s) => s.profile);
  const ready = useStore((s) => s.ready);
  const error = useStore((s) => s.error);

  React.useEffect(() => {
    initAuth().catch(() => {});
  }, [initAuth]);

  // Inicia carga de dados após autenticado
  React.useEffect(() => {
    if (session && !ready) init().catch(() => {});
  }, [session, ready, init]);

  // Redireciona quando muda o estado de auth
  React.useEffect(() => {
    if (!authReady) return;
    if (!session && !isPublic) router.replace("/login");
    if (session && isPublic) router.replace("/");
  }, [authReady, session, isPublic, router]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // /login renderiza livremente, sem chrome
  if (isPublic) return <>{children}</>;

  if (!authReady || (session && !ready)) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {error ? "Falha ao conectar com o backend" : "Carregando..."}
        </p>
      </div>
    );
  }

  if (!session) {
    // Aguardando redirect — não pisca conteúdo protegido
    return null;
  }

  if (profile && profile.role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ({profile.name ?? session.user.email}) ainda não tem perfil
            de <strong>admin</strong>. Peça pra um administrador atual te promover
            no SQL Editor:
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-left text-xs">
            {`update public.profiles
set role='admin'
where id='${session.user.id}';`}
          </pre>
          <button
            onClick={() => useStore.getState().signOut()}
            className="text-sm text-primary hover:underline"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="lg:pl-64">{children}</div>
    </>
  );
}
