"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export function RealtimeTicker() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const error = useStore((s) => s.error);

  React.useEffect(() => {
    init().catch(() => {});
  }, [init]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  if (ready) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {error ? "Falha ao conectar com o backend" : "Carregando..."}
      </p>
    </div>
  );
}
