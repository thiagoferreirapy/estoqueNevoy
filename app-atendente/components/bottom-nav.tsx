"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Buscar", icon: Search },
  { href: "/reservas", label: "Reservas", icon: Clock },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur safe-area">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "scale-110 transition-transform")}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
