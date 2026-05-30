import { Route } from "lucide-react";
import { LibraryPlaceholderPage } from "@/components/library/library-placeholder-page";
import { PageHeader } from "@/components/page-header";

export default function SeerahPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Biographies" title="Prophetic Seerah" description="Notes and timelines from the life of the Prophet ﷺ." />
      <LibraryPlaceholderPage
        description="Seerah entries will support timelines, lessons, and references later."
        icon={Route}
        title="No seerah notes yet"
      />
    </div>
  );
}
