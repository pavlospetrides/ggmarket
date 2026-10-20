"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { safeRedirectPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "./use-hydrated";
import { PasswordField } from "./password-field";

const loginErrors: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  invalid_input: "Enter a valid email and password.",
  unavailable: "Login is temporarily unavailable. Please try again.",
  signup_failed: "Account creation failed. The email may already be registered.",
  invalid_callback: "This verification link is invalid or has expired.",
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const next = safeRedirectPath(params.get("next"));
  const visibleError = error || loginErrors[params.get("error") ?? ""] || "";

  useEffect(() => {
    if (visibleError) errorRef.current?.focus();
  }, [visibleError]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      const supabase = createClient();
      const email = String(formData.get("email"));
      const password = String(formData.get("password"));

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw new Error("Invalid email or password.");
        router.replace(next);
        router.refresh();
      } else {
        const username = String(formData.get("username"));
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: username },
            emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent("/settings/verification")}`,
          },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/profile");
          router.refresh();
        } else {
          setSuccess(true);
        }
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success || params.get("status") === "check_email") {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#143926] text-[var(--success)]">
          <CircleCheck className="size-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Check your inbox</h2>
        <p className="mt-2 text-base leading-7 text-[var(--text-secondary)]">
          We sent you a confirmation link to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <form action={mode === "login" ? "/auth/login" : "/auth/register"} method="post" onSubmit={submit} className="space-y-4" aria-busy={loading} data-hydrated={hydrated}>
      {mode === "login" && <input type="hidden" name="next" value={next} />}
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            className="input"
            id="username"
            name="username"
            autoComplete="username"
            spellCheck={false}
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_.]+"
            aria-describedby={visibleError ? "auth-form-error" : undefined}
            required
          />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          aria-describedby={visibleError ? "auth-form-error" : undefined}
          required
        />
      </div>
      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        describedBy={visibleError ? "auth-form-error" : undefined}
        labelAction={mode === "login" ? (
            <Link
              href="/forgot-password"
              className="mb-1 text-xs text-[#aa98ff]"
            >
              Forgot password?
            </Link>
          ) : undefined}
      />
      {visibleError && (
        <p
          id="auth-form-error"
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-[#5d2931] bg-[#29151a] p-3 text-sm text-[#ff9ca6]"
        >
          {visibleError}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading
          ? "Please wait…"
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        {mode === "login" ? "New to GGMarket?" : "Already have an account?"}{" "}
        <Link
          className="font-bold text-[#aa98ff]"
          href={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? "Create account" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
