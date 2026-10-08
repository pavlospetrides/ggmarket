"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type SettingsFormProps = {
  email: string;
  username: string;
  displayName: string;
  location: string;
  bio: string;
};

export function SettingsForm({
  email,
  username,
  displayName,
  location,
  bio,
}: SettingsFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          displayName: formData.get("displayName"),
          location: formData.get("location"),
          bio: formData.get("bio"),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Profile update failed");
      setStatus("Changes saved");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Profile update failed",
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setError("");
    const { error: logoutError } = await createClient().auth.signOut();
    if (logoutError) {
      setError("You could not be logged out. Please try again.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <nav className="card h-fit p-3">
        <a
          className="block rounded-lg bg-[#211a3a] px-3 py-2 text-sm font-bold text-[#c8bcff]"
          href="#profile"
        >
          Profile
        </a>
        <span
          className="mt-1 block rounded-lg px-3 py-2 text-sm text-[var(--muted)]"
          title="Coming in a later phase"
        >
          Security
        </span>
        <span
          className="mt-1 block rounded-lg px-3 py-2 text-sm text-[var(--muted)]"
          title="Coming in a later phase"
        >
          Notifications
        </span>
      </nav>
      <form onSubmit={save} id="profile" className="card p-6 sm:p-8">
        <h2 className="text-xl font-bold">Profile information</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          How other gamers see you on GGMarket.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="displayName">
              Display name
            </label>
            <input
              className="input"
              id="displayName"
              name="displayName"
              defaultValue={displayName}
              minLength={1}
              maxLength={80}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              className="input"
              id="username"
              name="username"
              defaultValue={username}
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_.]+"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="location">
              Location
            </label>
            <input
              className="input"
              id="location"
              name="location"
              defaultValue={location}
              maxLength={120}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="bio">
              Bio
            </label>
            <textarea
              className="input min-h-28"
              id="bio"
              name="bio"
              defaultValue={bio}
              maxLength={500}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              className="input opacity-60"
              id="email"
              value={email}
              disabled
            />
          </div>
        </div>
        {error && (
          <p
            className="mt-5 rounded-xl border border-[#5d2931] bg-[#29151a] p-3 text-sm text-[#ff9ca6]"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex items-center gap-4">
          <button disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {status && (
            <span className="text-sm text-[var(--success)]" role="status">
              {status}
            </span>
          )}
        </div>
        <div className="my-8 h-px bg-[var(--border)]" />
        <button
          type="button"
          onClick={logout}
          className="btn-secondary text-[#ff9ca6]"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </form>
    </div>
  );
}
