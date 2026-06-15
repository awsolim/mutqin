import { notFound } from "next/navigation";
import { KhutbahDetail } from "@/components/library/khutbah-detail";
import { getLibraryItemById } from "@/lib/library/actions";

type KhutbahDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function KhutbahDetailPage({ params }: KhutbahDetailPageProps) {
  const { id } = await params;
  const item = await getLibraryItemById(id, "khutbah");

  if (!item) {
    notFound();
  }

  return <KhutbahDetail item={item} />;
}
