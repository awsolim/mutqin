import { NotebookTabs } from "lucide-react";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { PageHeader } from "@/components/page-header";

export default function FiqhHalaqahPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Durus" title="Fiqh Halaqah" />
      <LibraryEmptyState
        description="No notes saved yet."
        icon={NotebookTabs}
        title="Fiqh Halaqah"
      />
    </div>
  );
}
