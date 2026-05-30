import { LogOut, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { HighlightLayerSettings } from "@/components/settings/highlight-layer-settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function logout() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage the account connected to your Mutqin workspace."
      />
      <Card className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-palm/10 text-palm">
            <Settings aria-hidden className="size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold text-ink">Signed in</h2>
            <p className="break-words text-sm leading-6 text-ink/70">
              {user.email ?? "Email unavailable"}
            </p>
          </div>
        </div>
        <form action={logout}>
          <Button className="w-full" type="submit" variant="danger">
            <LogOut aria-hidden className="size-4" />
            Log out
          </Button>
        </form>
      </Card>
      <HighlightLayerSettings />
    </div>
  );
}
