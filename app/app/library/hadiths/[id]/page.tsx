import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/library/collection-detail";
import { getLibraryItemById } from "@/lib/library/actions";

type HadithDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function HadithDetailPage({ params }: HadithDetailPageProps) {
  const { id } = await params;
  const item = await getLibraryItemById(id, "hadith");

  if (!item) {
    notFound();
  }

  return <CollectionDetail item={item} type="hadith" />;
}
