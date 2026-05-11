"use client";

import { Bell, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TopbarProps = {
  title: string;
  subtitle?: string;
};

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur lg:px-8">
      <div className="ml-12 flex-1 lg:ml-0">
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 pl-9"
          />
        </div>
      </div>

      <Button variant="ghost" size="icon" aria-label="Notificações">
        <Bell className="h-5 w-5" />
      </Button>
      <ThemeToggle />
    </header>
  );
}
