import { BookOpen, LogIn, UserPlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <section className="space-y-8">
        <div className="space-y-5">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-palm text-white shadow-soft">
            <BookOpen aria-hidden className="size-7" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sage">
              Mutqin
            </p>
            <h1 className="text-4xl font-bold leading-tight text-ink">
              Make your hifz stronger and more exact.
            </h1>
            <p className="text-base leading-7 text-ink/70">
              A hifz companion for repetition, i&apos;rab, and mutashabihat.
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <ButtonLink href="/login">
            <LogIn aria-hidden className="size-4" />
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" variant="secondary">
            <UserPlus aria-hidden className="size-4" />
            Sign up
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
