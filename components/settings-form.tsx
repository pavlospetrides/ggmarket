"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";

type SettingsFormProps = {
  email: string;
  username: string;
  displayName: string;
  location: string;
  bio: string;
  logoutError?: boolean;
};

export function SettingsForm({
  email,
  username,
  displayName,
  location,
  bio,
  logoutError = false,
}: SettingsFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState(logoutError ? "You could not be logged out. Please try again." : "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLinkNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Discard your unsaved changes?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", confirmLinkNavigation, true);
    };
  }, [dirty]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function save(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.formAction.endsWith("/auth/logout")) return;
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
      setDirty(false);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Profile update failed",
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmLogout(event: ReactMouseEvent<HTMLButtonElement>) {
    if (dirty && !window.confirm("Discard your unsaved changes?")) event.preventDefault();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <nav className="card h-fit p-2 md:sticky md:top-20">
        <a
          className="block rounded-xl bg-[#211a3a] px-3 py-2.5 text-sm font-bold text-[#c8bcff]"
          href="#profile"
        >
          Profile
        </a>
        <span
          className="mt-1 block rounded-xl px-3 py-2.5 text-sm text-[var(--muted)]"
          title="Coming in a later phase"
        >
          Security
        </span>
        <span
          className="mt-1 block rounded-xl px-3 py-2.5 text-sm text-[var(--muted)]"
          title="Coming in a later phase"
        >
          Notifications
        </span>
      </nav>
      <form onSubmit={save} onChange={() => setDirty(true)} id="profile" className="surface-panel p-6 sm:p-8" aria-busy={saving}>
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
              autoComplete="name"
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
              autoComplete="username"
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
              autoComplete="address-level2"
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
              autoComplete="off"
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
              name="email"
              autoComplete="email"
              value={email}
              disabled
            />
          </div>
        </div>
        {error && (
          <p
            ref={errorRef}
            tabIndex={-1}
            className="mt-5 rounded-xl border border-[#5d2931] bg-[#29151a] p-3 text-sm text-[#ff9ca6]"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {status && (
            <span className="badge border-[#28563e] bg-[#123021] text-[var(--success)]" role="status">
              {status}
            </span>
          )}
        </div>
        <div className="my-8 h-2 rounded-full bg-[var(--surface-alt)]" />
        <button
          type="submit"
          formAction="/auth/logout"
          formMethod="post"
          onClick={confirmLogout}
          className="btn-danger"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </form>
    </div>
  );
}
