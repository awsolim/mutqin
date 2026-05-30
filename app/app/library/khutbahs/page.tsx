import { NotebookPen } from "lucide-react";
import { LibraryPlaceholderPage } from "@/components/library/library-placeholder-page";
import { PageHeader } from "@/components/page-header";

export default function KhutbahsPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Collections" title="Khutbahs" description="Drafts, outlines, and source notes for talks." />
      <LibraryPlaceholderPage
        description="Khutbah drafting will become a dedicated writing shelf."
        icon={NotebookPen}
        title="No khutbah drafts yet"
      />
    </div>
  );
}
