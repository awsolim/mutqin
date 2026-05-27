import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { PageHeader } from "@/components/page-header";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <PageHeader
        eyebrow="Mutqin"
        title="Welcome back"
        description="Log in to continue your hifz journey."
      />
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
