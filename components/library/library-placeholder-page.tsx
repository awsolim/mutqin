import { type LucideIcon } from "lucide-react";
import { LibraryEmptyState } from "./library-empty-state";

type LibraryPlaceholderPageProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function LibraryPlaceholderPage({
  description,
  icon,
  title,
}: LibraryPlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <LibraryEmptyState
        description={description}
        icon={icon}
        title={title}
      />
      <div className="rounded-[1.4rem] border border-line bg-paper px-4 py-4 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wide text-palm">Planned shelf</p>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          This section is ready in the Library structure. Storage and editing flows will be
          added when this content type becomes active.
        </p>
      </div>
    </div>
  );
}
