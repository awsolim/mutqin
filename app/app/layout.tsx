import { AppHeader } from "@/components/app-shell/app-header";
import { BottomNav } from "@/components/app-shell/bottom-nav";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-mist">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}
