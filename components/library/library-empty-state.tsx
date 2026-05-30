import { type LucideIcon } from "lucide-react";

type LibraryEmptyStateProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function LibraryEmptyState({
  description,
  icon: Icon,
  title,
}: LibraryEmptyStateProps) {
  return (
    <div className="rounded-[1.7rem] border border-dashed border-line bg-paper/80 px-5 py-9 text-center shadow-soft">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-palm/10 text-palm">
        <Icon aria-hidden className="size-7" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/60">{description}</p>
    </div>
  );
}
