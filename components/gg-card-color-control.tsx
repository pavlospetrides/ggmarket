"use client";

import { contrastRatio, normalizeHexColor } from "@/lib/gg-card";

const PRESETS = [
  { label: "Graphite", value: "#182033" },
  { label: "Purple", value: "#8F7BFF" },
  { label: "Navy", value: "#1D3557" },
  { label: "Gold", value: "#D4AF37" },
  { label: "Red", value: "#DC3B51" },
  { label: "White", value: "#F5F1FF" },
] as const;

export function GGCardColorControl({
  id,
  label,
  value,
  background,
  contrastThreshold,
  contrastName,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  background: string;
  contrastThreshold: number;
  contrastName: string;
  onChange: (value: string) => void;
}) {
  const normalized = normalizeHexColor(value);
  const errorId = `${id}-error`;
  const warningId = `${id}-warning`;
  const ratio = normalized ? contrastRatio(normalized, background) : null;
  const warning = ratio !== null && ratio < contrastThreshold;
  const describedBy = !normalized ? errorId : warning ? warningId : undefined;

  return (
    <div className="rounded-xl bg-[var(--surface-alt)] p-3" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="label">{label}</span>
      <div className="flex items-center gap-3">
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-[var(--border)] focus-within:border-[var(--primary-hover)] focus-within:ring-2 focus-within:ring-[var(--primary-hover)]" style={{ background: normalized ?? "#000000" }}>
          <span className="sr-only">{label} picker</span>
          <input
            type="color"
            name={`${id}-picker`}
            aria-label={`${label} picker`}
            className="size-14 cursor-pointer opacity-0"
            value={normalized ?? "#000000"}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
          />
        </label>
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={`${id}-hex`}>{label} HEX</label>
          <input
            id={`${id}-hex`}
            name={`${id}-hex`}
            className="input min-h-11 font-mono uppercase tabular-nums"
            value={value}
            maxLength={7}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!normalized}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => { if (normalized && normalized !== value) onChange(normalized); }}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label={`${label} presets`}>
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className="size-11 rounded-full border-2 border-[var(--border)] transition-[border-color,transform] hover:border-white/70 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-hover)] motion-reduce:transition-none motion-reduce:active:transform-none"
            style={{ background: preset.value }}
            aria-label={`Set ${label} to ${preset.label}`}
            aria-pressed={normalized === preset.value}
            onClick={() => onChange(preset.value)}
          />
        ))}
      </div>
      {!normalized ? (
        <p id={errorId} className="mt-2 text-sm text-[#ff9ca6]">Enter a six-digit HEX color such as #8F7BFF.</p>
      ) : warning ? (
        <p id={warningId} className="mt-2 text-sm text-[#f4c66d]" role="status">
          Low {contrastName} contrast ({ratio.toFixed(2)}:1). You can still save this color.
        </p>
      ) : null}
    </div>
  );
}
