"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isConfigured } = getSupabaseEnv();
  const isLogin = mode === "login";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      const result = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Authentication could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {!isConfigured ? <ConfigurationNotice /> : null}
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="min-h-12 w-full rounded-xl border border-line bg-white px-3 text-base text-ink outline-none transition focus:border-palm focus:ring-2 focus:ring-palm/15"
              disabled={!isConfigured || isSubmitting}
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="password">
              Password
            </label>
            <input
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="min-h-12 w-full rounded-xl border border-line bg-white px-3 text-base text-ink outline-none transition focus:border-palm focus:ring-2 focus:ring-palm/15"
              disabled={!isConfigured || isSubmitting}
              id="password"
              minLength={6}
              name="password"
              placeholder="At least 6 characters"
              required
              type="password"
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button
            className="w-full"
            disabled={!isConfigured || isSubmitting}
            type="submit"
          >
            {isSubmitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            {isLogin ? "Log in" : "Create account"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-ink/70">
        {isLogin ? "New to Mutqin?" : "Already have an account?"}{" "}
        <Link className="font-semibold text-palm" href={isLogin ? "/signup" : "/login"}>
          {isLogin ? "Sign up" : "Log in"}
        </Link>
      </p>
    </div>
  );
}
