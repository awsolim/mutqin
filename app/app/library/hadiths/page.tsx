import { ScrollText } from "lucide-react";
import { LibraryPlaceholderPage } from "@/components/library/library-placeholder-page";
import { PageHeader } from "@/components/page-header";

export default function HadithsPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Collections" title="Hadiths" description="Hadith references and personal benefit notes." />
      <LibraryPlaceholderPage
        description="Hadith logging will support references, source notes, and benefits later."
        icon={ScrollText}
        title="No hadiths saved yet"
      />
    </div>
  );
}
