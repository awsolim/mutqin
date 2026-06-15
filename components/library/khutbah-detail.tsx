"use client";

import { Edit3, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PageBackButton } from "@/components/page-back-button";
import { formatLibraryDate } from "@/lib/library/format";
import { type LibraryItem } from "@/lib/library/types";
import { getKhutbahReferences, getStringMeta, getTags } from "./collection-utils";
import { KhutbahKindBadge } from "./khutbah-builder";

export function KhutbahDetail({ item }: { item: LibraryItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const kind = getStringMeta(item, "khutbahKind") || "draft";
  const references = getKhutbahReferences(item);
  const tags = getTags(item);

  function removeItem() {
    if (!window.confirm("Delete this khutbah item?")) return;

    startTransition(async () => {
      const response = await fetch(`/api/library/collections/${item.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (result.ok) {
        router.push("/app/library/khutbahs");
        router.refresh();
      } else {
        window.alert(result.message ?? "Could not delete this item.");
      }
    });
  }

  return (
    <article className="space-y-4">
      <PageBackButton href="/app/library/khutbahs" label="Khutbahs" />
      <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-extrabold text-ink">{item.title}</h1>
              <KhutbahKindBadge kind={kind} />
            </div>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-palm">
              {formatLibraryDate(item.updatedAt)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              aria-label="Edit"
              className="flex size-10 items-center justify-center rounded-full bg-mist text-ink/50 transition hover:text-palm"
              href={`/app/library/khutbahs/${item.id}/edit`}
            >
              <Edit3 aria-hidden className="size-4" />
            </Link>
            <button
              aria-label="Delete"
              className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              disabled={isPending}
              onClick={removeItem}
              type="button"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        </div>
        {tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
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
      </section>

      <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
        {item.body ? (
          <div className="whitespace-pre-wrap text-base leading-8 text-ink">{item.body}</div>
        ) : (
          <p className="text-sm font-semibold text-ink/45">No content yet.</p>
        )}
      </section>

      {references.length ? (
        <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
          <h2 className="text-sm font-extrabold text-ink">References</h2>
          <div className="mt-3 grid gap-2">
            {references.map((reference) => (
              <div className="rounded-2xl bg-mist px-3 py-3" key={reference.id}>
                <p className="text-sm font-extrabold text-ink">{reference.label}</p>
                {reference.reference ? (
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-palm">
                    {reference.reference}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
