import { KhutbahList } from "@/components/library/khutbah-list";
import { PageBackButton } from "@/components/page-back-button";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemsByType } from "@/lib/library/actions";

export default async function KhutbahsPage() {
  const items = await getLibraryItemsByType("khutbah");

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library" label="Library" />
      <PageHeader eyebrow="Collections" title="Khutbahs" />
      <KhutbahList items={items} />
    </div>
  );
}
