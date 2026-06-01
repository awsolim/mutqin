import { Mic2 } from "lucide-react";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { PageHeader } from "@/components/page-header";

export default function KhutabaaHalaqahPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Durus" title="Khutabaa Halaqah" />
      <LibraryEmptyState
        description="No notes saved yet."
        icon={Mic2}
        title="Khutabaa Halaqah"
      />
    </div>
  );
}
