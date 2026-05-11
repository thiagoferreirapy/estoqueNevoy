"use client";

import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useStore } from "@/lib/store";

type Props = { title: string };

export function AppHeader({ title }: Props) {
  const name = useStore((s) => s.attendantName);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">
              {name ? `Atendente · ${name}` : "Atendente"}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
