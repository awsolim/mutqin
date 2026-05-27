"use client";

import { usePathname } from "next/navigation";

type AppHeaderProps = {
  subtitle?: string;
};

export function AppHeader({ subtitle = "Hifz with precision" }: AppHeaderProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/app/mushaf")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-mist/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div>
          <p className="text-xl font-bold text-ink">Mutqin</p>
          <p className="text-xs font-medium text-ink/60">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
