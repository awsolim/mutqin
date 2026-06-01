"use client";

import {
  BookHeart,
  BookMarked,
  BookOpenText,
  ChevronDown,
  Feather,
  GraduationCap,
  HandHeart,
  Landmark,
  Library,
  Link2,
  Mic2,
  NotebookTabs,
  ScrollText,
  Scroll,
  Sigma,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

type LibrarySubsection = {
  href: string;
  icon: typeof Library;
  title: string;
};

type LibrarySectionConfig = {
  accent: string;
  icon: typeof Library;
  items: LibrarySubsection[];
  title: string;
};

const sections: LibrarySectionConfig[] = [
  {
    accent: "from-palm/12 to-palm/4",
    icon: BookOpenText,
    title: "Qur'an Notes",
    items: [
      {
        href: "/app/library/ayah-insights",
        icon: BookHeart,
        title: "Ayah Insights",
      },
      {
        href: "/app/library/surah-notes",
        icon: Scroll,
        title: "Surah Notes",
      },
      {
        href: "/app/library/bookmarks",
        icon: BookMarked,
        title: "Bookmarks",
      },
      {
        href: "/app/library/similar-verses",
        icon: Link2,
        title: "Similar Verses",
      },
    ],
  },
  {
    accent: "from-gold/20 to-gold/5",
    icon: ScrollText,
    title: "Collections",
    items: [
      {
        href: "/app/library/duas",
        icon: HandHeart,
        title: "Duas",
      },
      {
        href: "/app/library/hadiths",
        icon: Feather,
        title: "Hadiths",
      },
      {
        href: "/app/library/khutbahs",
        icon: Mic2,
        title: "Khutbahs",
      },
    ],
  },
  {
    accent: "from-ink/10 to-ink/3",
    icon: UserRound,
    title: "Biographies",
    items: [
      {
        href: "/app/library/seerah",
        icon: Landmark,
        title: "Prophetic Seerah",
      },
      {
        href: "/app/library/companions",
        icon: UsersRound,
        title: "Companions Biographies",
      },
    ],
  },
  {
    accent: "from-sage/15 to-sage/4",
    icon: GraduationCap,
    title: "Durus",
    items: [
      {
        href: "/app/library/khutabaa-halaqah",
        icon: Mic2,
        title: "Khutabaa Halaqah",
      },
      {
        href: "/app/library/fiqh-halaqah",
        icon: NotebookTabs,
        title: "Fiqh Halaqah",
      },
      {
        href: "/app/library/nahw-halaqah",
        icon: Sigma,
        title: "Nahw Halaqah",
      },
    ],
  },
];

export function LibraryHome() {
  const [openSections, setOpenSections] = useState(() => new Set(["Qur'an Notes"]));

  function toggleSection(title: string) {
    setOpenSections((current) => {
      const next = new Set(current);

      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }

      return next;
    });
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const Icon = section.icon;
        const isOpen = openSections.has(section.title);

        return (
          <section
            className="overflow-hidden rounded-[1.6rem] border border-line bg-paper shadow-soft"
            key={section.title}
          >
            <button
              aria-expanded={isOpen}
              className={cn(
                "flex w-full items-center gap-3 bg-gradient-to-br px-4 py-4 text-left transition",
                section.accent,
              )}
              onClick={() => toggleSection(section.title)}
              type="button"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-paper/85 text-palm shadow-soft">
                <Icon aria-hidden className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold text-ink">{section.title}</span>
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-5 shrink-0 text-ink/45 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="grid gap-2 p-3">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;

                    return (
                      <Link
                        className="group flex min-h-14 items-center gap-3 rounded-2xl border border-line/80 bg-mist/55 px-3 py-2.5 transition hover:border-palm/25 hover:bg-palm/5"
                        href={item.href}
                        key={item.href}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-paper text-palm ring-1 ring-line/80">
                          <ItemIcon aria-hidden className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                          {item.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
