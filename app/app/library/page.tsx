import { LibraryHome } from "@/components/library/library-home";
import { PageHeader } from "@/components/page-header";

export default function LibraryPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Personal archive"
        title="Library"
      />
      <LibraryHome />
    </div>
  );
}
