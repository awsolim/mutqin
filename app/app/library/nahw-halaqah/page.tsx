import { Sigma } from "lucide-react";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { PageHeader } from "@/components/page-header";

export default function NahwHalaqahPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Durus" title="Nahw Halaqah" />
      <LibraryEmptyState
        description="No notes saved yet."
        icon={Sigma}
        title="Nahw Halaqah"
      />
    </div>
  );
}
