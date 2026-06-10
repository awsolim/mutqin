"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Library, Settings } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { AyahVaultIcon } from "@/components/icons/ayahvault-icon";
import { cn } from "@/lib/utils";

const AYAHVAULT_URL = process.env.NEXT_PUBLIC_AYAHVAULT_URL ?? "https://ayahvault.com";

type BottomNavItem =
  | {
      href: string;
      label: string;
      icon: ComponentType<SVGProps<SVGSVGElement>>;
      external: false;
    }
  | {
      href: string;
      label: string;
      icon: ComponentType<SVGProps<SVGSVGElement>>;
      external: true;
    };

const navItems: BottomNavItem[] = [
  { href: "/app/quran", label: "Qur'an", icon: BookOpen, external: false },
  { href: "/app/library", label: "Library", icon: Library, external: false },
  {
    href: AYAHVAULT_URL,
    label: "AyahVault",
    icon: AyahVaultIcon,
    external: true,
  },
  { href: "/app/settings", label: "Settings", icon: Settings, external: false },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/app/mushaf")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-14px_30px_rgba(31,39,33,0.08)] backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive = item.external
            ? false
            : item.href === "/app/quran"
              ? pathname.startsWith("/app/quran") || pathname.startsWith("/app/mushaf")
              : pathname.startsWith(item.href);

          const className = cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-ink/55 transition",
            isActive && "bg-palm/10 text-palm",
          );

          const children = (
            <>
              <item.icon aria-hidden className="size-5" />
              <span className="w-full truncate text-center">{item.label}</span>
            </>
          );

          return item.external ? (
            <a className={className} href={item.href} key={item.href}>
              {children}
            </a>
          ) : (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={className}
              href={item.href}
              key={item.href}
            >
              {children}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
