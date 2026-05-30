"use client";

import {
  BookMarked,
  BookOpenText,
  ChevronDown,
  Feather,
  Library,
  ScrollText,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

type LibrarySubsection = {
  countLabel?: string;
  description: string;
  href: string;
  title: string;
};

type LibrarySectionConfig = {
  accent: string;
  description: string;
  icon: typeof Library;
  items: LibrarySubsection[];
  title: string;
};

const sections: LibrarySectionConfig[] = [
  {
    accent: "from-palm/12 to-palm/4",
    description: "Verse reflections, surah notes, bookmarks, and memorization links.",
    icon: BookOpenText,
    title: "Qur'an Notes",
    items: [
      {
        countLabel: "Live",
        description: "Personal reflections and hifz cues saved from selected ayat.",
        href: "/app/library/ayah-insights",
        title: "Ayah Insights",
      },
      {
        description: "Surah-level themes, reminders, and review anchors.",
        href: "/app/library/surah-notes",
        title: "Surah Notes",
      },
      {
        countLabel: "Live",
        description: "Saved ayat you want to revisit quickly.",
        href: "/app/library/bookmarks",
        title: "Bookmarks",
      },
      {
        description: "A future notebook for mutashabihat and related ayat.",
        href: "/app/library/similar-verses",
        title: "Similar Verses",
      },
    ],
  },
  {
    accent: "from-gold/20 to-gold/5",
    description: "Collected texts, drafts, and references for study and teaching.",
    icon: ScrollText,
    title: "Collections",
    items: [
      {
        description: "Duas you discover, memorize, and return to.",
        href: "/app/library/duas",
        title: "Duas",
      },
      {
        description: "Hadith references and personal benefit notes.",
        href: "/app/library/hadiths",
        title: "Hadiths",
      },
      {
        description: "Khutbah drafts, outlines, and source notes.",
        href: "/app/library/khutbahs",
        title: "Khutbahs",
      },
    ],
  },
  {
    accent: "from-ink/10 to-ink/3",
    description: "Lives, lessons, and timelines from the earliest generations.",
    icon: UserRound,
    title: "Biographies",
    items: [
      {
        description: "Seerah notes arranged for reflection and teaching.",
        href: "/app/library/seerah",
        title: "Prophetic Seerah",
      },
      {
        description: "Companion biographies, virtues, and key narrations.",
        href: "/app/library/companions",
        title: "Companions Biographies",
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
                <span className="mt-1 block text-sm leading-5 text-ink/60">
                  {section.description}
                </span>
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
                  {section.items.map((item) => (
                    <Link
                      className="group flex items-center gap-3 rounded-2xl border border-line/80 bg-mist/55 px-3 py-3 transition hover:border-palm/25 hover:bg-palm/5"
                      href={item.href}
                      key={item.href}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-paper text-palm ring-1 ring-line/80">
                        {item.title === "Bookmarks" ? (
                          <BookMarked aria-hidden className="size-5" />
                        ) : item.title.includes("Dua") ? (
                          <Feather aria-hidden className="size-5" />
                        ) : (
                          <Library aria-hidden className="size-5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-extrabold text-ink">
                            {item.title}
                          </span>
                          {item.countLabel ? (
                            <span className="rounded-full bg-palm/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-palm">
                              {item.countLabel}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink/55">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
