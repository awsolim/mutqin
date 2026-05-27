"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Library, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app/quran", label: "Qur'an", icon: BookOpen },
  { href: "/app/library", label: "Library", icon: Library },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/app/mushaf")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-14px_30px_rgba(31,39,33,0.08)] backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/app/quran"
              ? pathname.startsWith("/app/quran") || pathname.startsWith("/app/mushaf")
              : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-ink/55 transition",
                isActive && "bg-palm/10 text-palm",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden className="size-5" />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
