"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { Camera, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { moveProfilePan, profileCropForView } from "@/lib/profile-crop";
import type { ProfileMediaKind } from "@/lib/profile-media";
import { ProfileMediaImage } from "./profile-media-image";
import { useHydrated } from "./use-hydrated";

export function ProfileMediaEditor({ kind, currentUrl, triggerClassName = "", compact = false }: { kind: ProfileMediaKind; currentUrl?: string; triggerClassName?: string; compact?: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<{ file: File; url: string; width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0.5);
  const [panY, setPanY] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const label = kind === "avatar" ? "photo" : "cover";
  const crop = source ? profileCropForView(source.width, source.height, kind, zoom, panX, panY) : null;

  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setStatus("");
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 10_485_760 || file.size === 0) {
      setError("Choose a JPEG, PNG or WebP image up to 10 MB."); return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setSource({ file, url, width: image.naturalWidth, height: image.naturalHeight });
      setZoom(1); setPanX(0.5); setPanY(0.5);
    };
    image.onerror = () => { URL.revokeObjectURL(url); setError("This image could not be opened."); };
    image.src = url;
  }

  async function save() {
    if (!source || !crop || busy) return;
    setBusy(true); setError(""); setStatus("");
    const form = new FormData();
    form.set("image", source.file);
    form.set("crop", JSON.stringify(crop));
    try {
      const response = await fetch(`/api/profile/media/${kind}`, { method: "POST", body: form });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save image.");
      setSource(null); setStatus("Image saved."); setOpen(false); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save image."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (busy || !window.confirm(`Remove your ${label} and restore the default?`)) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const response = await fetch(`/api/profile/media/${kind}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not remove image.");
      setSource(null); setStatus("Default restored."); setOpen(false); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove image."); }
    finally { setBusy(false); }
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !crop || !viewportRef.current) return;
    const bounds = viewportRef.current.getBoundingClientRect();
    setPanX((value) => moveProfilePan(value, event.clientX - dragRef.current!.x, bounds.width, crop.width));
    setPanY((value) => moveProfilePan(value, event.clientY - dragRef.current!.y, bounds.height, crop.height));
    dragRef.current = { x: event.clientX, y: event.clientY };
  }

  return <Dialog open={open} onOpenChange={(next) => { if (busy) return; setOpen(next); if (!next) { setSource(null); setError(""); } }}>
    <DialogTrigger className={triggerClassName} aria-label={compact ? `Edit ${label}` : undefined} disabled={!hydrated}>
      {compact ? <Camera className="size-4" aria-hidden="true" /> : <><ImagePlus className="size-4" aria-hidden="true" />{kind === "cover" ? "Edit cover" : currentUrl ? "Change photo" : "Upload photo"}</>}
    </DialogTrigger>
    <DialogContent className="w-[min(calc(100%-2rem),38rem)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <DialogTitle>{kind === "avatar" ? "Profile photo" : "Cover photo"}</DialogTitle>
      <DialogDescription>Choose an image, then drag or use the arrow keys to position it.</DialogDescription>
      <div className="mt-5 space-y-5">
        <label className="btn-secondary inline-flex min-h-11 cursor-pointer items-center gap-2 focus-within:ring-2 focus-within:ring-[var(--primary)]">
          <ImagePlus className="size-4" aria-hidden="true" /> {currentUrl || source ? `Change ${label}` : `Upload ${label}`}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={busy} aria-label={`Choose ${label} image`} />
        </label>
        {source && crop ? <>
          <div ref={viewportRef} role="img" aria-label={`${label} crop preview; use arrow keys to reposition`} tabIndex={0}
            className={`relative mx-auto w-full max-w-full overflow-hidden rounded-xl bg-[#1b2030] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${kind === "avatar" ? "max-w-72 rounded-full aspect-square" : "aspect-[3/1]"}`}
            style={{ touchAction: "none" }}
            onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={drag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}
            onKeyDown={(event) => { const step = event.shiftKey ? 0.1 : 0.025; if (event.key === "ArrowLeft") setPanX((v) => Math.max(0, v - step)); else if (event.key === "ArrowRight") setPanX((v) => Math.min(1, v + step)); else if (event.key === "ArrowUp") setPanY((v) => Math.max(0, v - step)); else if (event.key === "ArrowDown") setPanY((v) => Math.min(1, v + step)); else return; event.preventDefault(); }}>
            {/* Native image is used only for a local object URL preview. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={source.url} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${-100 * crop.x / crop.width}%`, top: `${-100 * crop.y / crop.height}%` }} />
          </div>
          <div><label className="label" htmlFor={`profile-${kind}-zoom`}>Crop & zoom</label><input id={`profile-${kind}-zoom`} className="w-full accent-[var(--primary)]" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-valuetext={`${Math.round(zoom * 100)} percent`} /></div>
        </> : currentUrl ? <div className="relative aspect-[3/1] overflow-hidden rounded-xl bg-[#1b2030]" style={kind === "avatar" ? { width: 144, height: 144, borderRadius: "50%" } : undefined}><ProfileMediaImage src={currentUrl} alt={`Current ${label}`} sizes="(max-width: 640px) 100vw, 600px" className="object-cover" /></div> : <p className="text-sm text-[var(--muted)]">The default {label} is currently shown.</p>}
        {error ? <p className="text-sm text-[#ff9ca6]" role="alert">{error}</p> : null}
        {status ? <p className="text-sm text-[var(--success)]" role="status">{status}</p> : null}
        <div className="flex flex-wrap gap-3">
          {source ? <button type="button" className="btn-primary min-h-11" onClick={save} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}Save {label}</button> : null}
          {currentUrl ? <button type="button" className="btn-danger min-h-11" onClick={remove} disabled={busy}><Trash2 className="size-4" aria-hidden="true" /> Remove {label}</button> : null}
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
