import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/library/collection-detail";
import { getLibraryItemById } from "@/lib/library/actions";

type DuaDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DuaDetailPage({ params }: DuaDetailPageProps) {
  const { id } = await params;
  const item = await getLibraryItemById(id, "dua");

  if (!item) {
    notFound();
  }

  return <CollectionDetail item={item} type="dua" />;
}
