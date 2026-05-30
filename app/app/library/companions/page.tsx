import { UsersRound } from "lucide-react";
import { LibraryPlaceholderPage } from "@/components/library/library-placeholder-page";
import { PageHeader } from "@/components/page-header";

export default function CompanionsPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Biographies" title="Companions Biographies" description="Virtues, stories, and lessons from the Sahabah." />
      <LibraryPlaceholderPage
        description="Companion biography notes will become a dedicated shelf."
        icon={UsersRound}
        title="No companion biographies yet"
      />
    </div>
  );
}
