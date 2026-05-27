import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type FeaturePlaceholderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  items?: string[];
};

export function FeaturePlaceholder({
  icon: Icon,
  title,
  description,
  items = [],
}: FeaturePlaceholderProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-palm/10 text-palm">
          <Icon aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="text-sm leading-6 text-ink/70">{description}</p>
        </div>
      </div>
      {items.length > 0 ? (
        <ul className="grid gap-2 text-sm text-ink/75">
          {items.map((item) => (
            <li className="rounded-xl border border-line bg-mist px-3 py-2" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
