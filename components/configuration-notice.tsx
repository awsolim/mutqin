import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ConfigurationNotice() {
  return (
    <Card className="border-amber-200 bg-amber-50 text-amber-900 shadow-none">
      <div className="flex gap-3">
        <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Supabase is not configured</h2>
          <p className="text-sm leading-6">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            .env.local to use authentication.
          </p>
        </div>
      </div>
    </Card>
  );
}
