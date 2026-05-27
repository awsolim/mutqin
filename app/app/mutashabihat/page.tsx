import { Sparkles } from "lucide-react";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { PageHeader } from "@/components/page-header";

export default function MutashabihatPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Precision"
        title="Mutashabihat"
        description="Future tracking for similar ayat and the cues that make recall exact."
      />
      <FeaturePlaceholder
        description="This will become a core memory-strengthening workspace after the reader foundation exists."
        icon={Sparkles}
        items={[
          "Linked similar ayat",
          "Differences and highlights",
          "Memory rules and personal cues",
        ]}
        title="Mutashabihat placeholder"
      />
    </div>
  );
}
