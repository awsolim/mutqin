import { BookOpenText } from "lucide-react";
import Link from "next/link";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { PageHeader } from "@/components/page-header";

export default function LibraryPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Personal archive"
        title="Library"
        description="A future home for Qur'an notes, duas, hadith, companions, khutbahs, seerah, and other saved knowledge."
      />
      <FeaturePlaceholder
        description="Library folders and storage will come in a later phase."
        icon={BookOpenText}
        items={[
          "Qur'an notes",
          "Duas and hadith",
          "Companions, seerah, and khutbah drafts",
        ]}
        title="Library placeholder"
      />
      <Link
        className="block rounded-2xl border border-line bg-paper p-4 text-sm font-bold text-palm shadow-soft transition hover:border-palm/30 hover:bg-white"
        href="/app/notes"
      >
        Open Qur&apos;an notes
      </Link>
    </div>
  );
}
