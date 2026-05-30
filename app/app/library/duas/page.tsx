import { Feather } from "lucide-react";
import { LibraryPlaceholderPage } from "@/components/library/library-placeholder-page";
import { PageHeader } from "@/components/page-header";

export default function DuasPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Collections" title="Duas" description="A personal dua collection for memorization and return." />
      <LibraryPlaceholderPage
        description="Dua saving and organization will be added in a later Library phase."
        icon={Feather}
        title="No duas saved yet"
      />
    </div>
  );
}
