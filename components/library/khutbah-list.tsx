"use client";

import { Edit3, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { formatLibraryDate } from "@/lib/library/format";
import { type LibraryItem } from "@/lib/library/types";
import { LibraryEmptyState } from "./library-empty-state";
import { getKhutbahReferences, getStringMeta, getTags } from "./collection-utils";
import { KhutbahKindBadge } from "./khutbah-builder";

export function KhutbahList({ items }: { items: LibraryItem[] }) {
  const [localItems, setLocalItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  function removeItem(itemId: string) {
    if (!window.confirm("Delete this khutbah item?")) return;

    startTransition(async () => {
      const response = await fetch(`/api/library/collections/${itemId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (result.ok) {
        setLocalItems((current) => current.filter((item) => item.id !== itemId));
      } else {
        window.alert(result.message ?? "Could not delete this item.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Link
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-palm text-sm font-extrabold text-paper shadow-soft"
        href="/app/library/khutbahs/new"
      >
        <Plus aria-hidden className="size-4" />
        New Khutbah
      </Link>

      {localItems.length ? (
        <div className="grid gap-3">
          {localItems.map((item) => {
            const kind = getStringMeta(item, "khutbahKind") || "draft";
            const references = getKhutbahReferences(item);
            const tags = getTags(item);

            return (
              <article
                className="rounded-[1.35rem] border border-line bg-paper p-4 shadow-soft"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link className="min-w-0 flex-1" href={`/app/library/khutbahs/${item.id}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 break-words text-base font-extrabold leading-6 text-ink">
                        {item.title}
                      </h2>
                      <KhutbahKindBadge kind={kind} />
                    </div>
                    {item.body ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/62">
                        {item.body}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs font-semibold text-ink/40">
                      {references.length} references · {formatLibraryDate(item.updatedAt)}
                    </p>
                  </Link>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      aria-label="Edit"
                      className="flex size-9 items-center justify-center rounded-full bg-mist text-ink/50 transition hover:text-palm"
                      href={`/app/library/khutbahs/${item.id}/edit`}
                    >
                      <Edit3 aria-hidden className="size-4" />
                    </Link>
                    <button
                      aria-label="Delete"
                      className="flex size-9 items-center justify-center rounded-full bg-mist text-ink/45 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      disabled={isPending}
                      onClick={() => removeItem(item.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                </div>
                {tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        className="rounded-full bg-mist px-2.5 py-1 text-xs font-bold text-ink/55"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <LibraryEmptyState
          description="Create drafts, templates, and reusable pieces for talks."
          icon={FileText}
          title="No khutbahs saved yet"
        />
      )}
    </div>
  );
}
