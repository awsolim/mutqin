import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { PageHeader } from "@/components/page-header";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <PageHeader
        eyebrow="Mutqin"
        title="Create your account"
        description="Start building a quieter, more precise hifz routine."
      />
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}
