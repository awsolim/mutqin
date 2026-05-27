import { Headphones } from "lucide-react";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { PageHeader } from "@/components/page-header";

export default function AudioPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Repetition"
        title="Audio"
        description="Future controls for structured listening and repeat-based memorization."
      />
      <FeaturePlaceholder
        description="Audio is intentionally left out of Phase 0, but this page reserves the workflow."
        icon={Headphones}
        items={[
          "Reciter selection",
          "Verse range setup",
          "Repeat count and loop controls",
        ]}
        title="Audio repetition placeholder"
      />
    </div>
  );
}
