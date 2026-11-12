"use client";

import dynamic from "next/dynamic";
import { CreditCard, Eye, Palette } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { GGCardColorControl } from "./gg-card-color-control";
import { DEFAULT_GG_CARD, GG_CARD_THEMES, getGGCardTheme, normalizeHexColor, type GGCardConfig, type GGCardThemeId } from "@/lib/gg-card";

const GGCardExperience = dynamic(() => import("./gg-card-experience"), {
  ssr: false,
  loading: () => <div className="grid h-[min(68svh,620px)] place-items-center rounded-2xl bg-[#0b0e15] text-sm text-[var(--muted)]" role="status">Loading your Lootriva Card…</div>,
});

export function GGCardSection({ own, identity, card }: {
  own: boolean;
  identity: { displayName: string; username: string };
  card: GGCardConfig | null;
}) {
  const [current, setCurrent] = useState(card);
  const [viewOpen, setViewOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draft, setDraft] = useState(card);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!current) return null;

  const draftTheme = draft ? getGGCardTheme(draft.themeId) : null;
  const normalizedTextColor = draft ? normalizeHexColor(draft.textColor) : null;
  const normalizedPatternColor = draft ? normalizeHexColor(draft.frontPatternColor) : null;
  const previewCard = draft ? {
    ...draft,
    textColor: normalizedTextColor ?? current.textColor,
    frontPatternColor: normalizedPatternColor ?? current.frontPatternColor,
  } : null;
  const canSave = Boolean(draft?.slogan.trim() && normalizedTextColor && normalizedPatternColor);

  async function save() {
    if (!draft || !normalizedTextColor || !normalizedPatternColor || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/gg-card", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, textColor: normalizedTextColor, frontPatternColor: normalizedPatternColor }),
      });
      const body = await response.json() as { card?: GGCardConfig; error?: string };
      if (!response.ok || !body.card) throw new Error(body.error || "Your Lootriva Card could not be saved.");
      setCurrent(body.card);
      setDraft(body.card);
      setMessage("Your Lootriva Card was saved.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Your Lootriva Card could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-6 overflow-hidden p-5 sm:p-7" aria-labelledby="gg-card-heading">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#44356f] bg-[#241c3d] text-[#bca6ff]" aria-hidden="true"><CreditCard className="size-6" /></span>
          <div className="min-w-0">
            <p className="eyebrow">Player identity</p>
            <h2 id="gg-card-heading" className="mt-1 text-xl font-[800] tracking-tight">{own ? "My Lootriva Card" : `${identity.displayName}'s Lootriva Card`}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Your gaming identity, your style.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogTrigger asChild><button type="button" className="btn-primary min-h-11"><Eye className="size-4" aria-hidden="true" />{own ? "View My Card" : "View Lootriva Card"}</button></DialogTrigger>
            <DialogContent className="w-[min(calc(100%-1rem),52rem)] overscroll-contain bg-[#111620] p-2 sm:p-4" closeLabel="Close Lootriva Card">
              <DialogTitle className="sr-only">{identity.displayName}&apos;s Lootriva Card</DialogTitle>
              <DialogDescription className="sr-only">Interactive Lootriva identity card. Drag to swing or use the card and flip controls.</DialogDescription>
              {viewOpen ? <GGCardExperience card={current} displayName={identity.displayName} username={identity.username} /> : null}
            </DialogContent>
          </Dialog>
          {own ? (
            <Dialog open={customizeOpen} onOpenChange={(open) => { setCustomizeOpen(open); setMessage(""); if (open) setDraft(current); }}>
              <DialogTrigger asChild><button type="button" className="btn-secondary min-h-11"><Palette className="size-4" aria-hidden="true" />Customize Card</button></DialogTrigger>
              <DialogContent className="w-[min(calc(100%-1rem),72rem)] overscroll-contain bg-[#111620] p-0" closeLabel="Close card customization">
                <div className="p-5 pr-16 sm:p-6 sm:pr-20">
                  <DialogTitle>Customize My Lootriva Card</DialogTitle>
                  <DialogDescription>Choose independent typography and front-pattern colors, then preview them on your live card.</DialogDescription>
                </div>
                {draft && draftTheme && previewCard ? <div className="grid min-w-0 lg:grid-cols-[minmax(22rem,1.1fr)_minmax(20rem,.9fr)]">
                  <div className="grid min-w-0 place-items-center border-y border-[var(--border)] bg-[#0b0e15] lg:border-b-0 lg:border-r" aria-label="Card preview" data-testid="gg-card-live-preview">
                    {customizeOpen ? <GGCardExperience card={previewCard} displayName={identity.displayName} username={identity.username} height="clamp(32rem, 68svh, 620px)" /> : null}
                  </div>
                  <div className="min-w-0 p-5 sm:p-6">
                    <fieldset className="space-y-5" disabled={busy}>
                      <div>
                        <label className="label" htmlFor="gg-card-slogan">Slogan</label>
                        <input id="gg-card-slogan" name="gg-card-slogan" autoComplete="off" className="input" maxLength={80} value={draft.slogan} onChange={(event) => setDraft({ ...draft, slogan: event.target.value })} required />
                        <p className="mt-1 text-right text-xs tabular-nums text-[var(--muted)]">{draft.slogan.length}/80</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="label">Theme</span>
                          <button type="button" className="min-h-11 text-sm font-bold text-[#bca6ff] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)]" onClick={() => setDraft({ ...DEFAULT_GG_CARD })}>Reset to Defaults</button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Lootriva Card theme">
                          {Object.values(GG_CARD_THEMES).map((theme) => <button key={theme.id} type="button" role="radio" aria-checked={draft.themeId === theme.id} className={`min-h-12 rounded-xl border px-3 text-left text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)] ${draft.themeId === theme.id ? "border-[var(--primary-hover)] ring-2 ring-[var(--primary-hover)]" : "border-[var(--border)]"}`} style={{ background: theme.cardColor, color: theme.inkColor }} onClick={() => setDraft({ ...draft, themeId: theme.id as GGCardThemeId })}>{theme.label}</button>)}
                        </div>
                      </div>
                      <GGCardColorControl id="gg-card-text-color" label="Text Color" value={draft.textColor} background={draftTheme.cardColor} contrastThreshold={4.5} contrastName="text" onChange={(textColor) => setDraft({ ...draft, textColor })} />
                      <GGCardColorControl id="gg-card-pattern-color" label="Front Pattern Color" value={draft.frontPatternColor} background={draftTheme.cardColor} contrastThreshold={3} contrastName="pattern" onChange={(frontPatternColor) => setDraft({ ...draft, frontPatternColor })} />
                      <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3"><input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={draft.isPublic} onChange={(event) => setDraft({ ...draft, isPublic: event.target.checked })} /><span><strong className="block text-sm">Show on my public profile</strong><span className="mt-1 block text-xs leading-5 text-[var(--muted)]">Off by default. When enabled, anyone visiting your profile can view this card.</span></span></label>
                    </fieldset>
                    {message ? <p className={`mt-4 text-sm ${message.includes("saved") ? "text-[var(--success)]" : "text-[#ff9ca6]"}`} role={message.includes("saved") ? "status" : "alert"} aria-live="polite">{message}</p> : null}
                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><DialogClose asChild><button type="button" className="btn-secondary min-h-11" disabled={busy}>Close</button></DialogClose><button type="button" className="btn-primary min-h-11" disabled={busy || !canSave} onClick={save}>{busy ? "Saving…" : "Save Changes"}</button></div>
                  </div>
                </div> : null}
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>
    </section>
  );
}
