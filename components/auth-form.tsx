"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { safeRedirectPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";

const subscribeHydration = () => () => undefined;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

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
        router.replace(safeRedirectPath(params.get("next")));
      } else {
        const username = String(formData.get("username"));
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: username },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/profile");
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

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#143926] text-2xl text-[var(--success)]">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-bold">Check your inbox</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          We sent you a confirmation link to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_.]+"
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
          required
        />
      </div>
      <div>
        <div className="flex justify-between">
          <label className="label" htmlFor="password">
            Password
          </label>
          {mode === "login" && (
            <Link
              href="/forgot-password"
              className="mb-1 text-xs text-[#aa98ff]"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#5d2931] bg-[#29151a] p-3 text-sm text-[#ff9ca6]"
        >
          {error}
        </p>
      )}
      <button disabled={loading || !hydrated} className="btn-primary w-full">
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
