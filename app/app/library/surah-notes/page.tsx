import { BookOpenText } from "lucide-react";
import { LibraryPlaceholderPage } from "@/components/library/library-placeholder-page";
import { PageHeader } from "@/components/page-header";

export default function SurahNotesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Qur'an Notes"
        title="Surah Notes"
        description="Surah-level reminders, themes, and review anchors."
      />
      <LibraryPlaceholderPage
        description="Surah notes will collect broader reflections and memorization plans for each surah."
        icon={BookOpenText}
        title="No surah notes yet"
      />
    </div>
  );
}
