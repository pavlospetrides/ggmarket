"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import { useHydrated } from "./use-hydrated";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  toggleLabel?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  describedBy?: string;
  invalid?: boolean;
  labelAction?: ReactNode;
  inputRef?: RefObject<HTMLInputElement | null>;
};

export function PasswordField({ id, name, label, toggleLabel = "password", autoComplete, minLength = 8, describedBy, invalid, labelAction, inputRef }: PasswordFieldProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const hydrated = useHydrated();

  function assignRef(input: HTMLInputElement | null) {
    localRef.current = input;
    if (inputRef) inputRef.current = input;
  }

  function toggleVisibility() {
    const input = localRef.current;
    const selection = input ? [input.selectionStart, input.selectionEnd] as const : null;
    setVisible((current) => !current);
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus({ preventScroll: true });
      if (selection && selection[0] !== null && selection[1] !== null) {
        try {
          input.setSelectionRange(selection[0], selection[1]);
        } catch {
          // Some password-manager controlled inputs do not expose their selection.
        }
      }
    });
  }

  return <div>
    <div className="flex justify-between">
      <label className="label" htmlFor={id}>{label}</label>
      {labelAction}
    </div>
    <div className="relative">
      <input
        ref={assignRef}
        className="input pr-12"
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        required
      />
      <button
        type="button"
        data-gg-debug-control="password-visibility"
        disabled={!hydrated}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleVisibility}
        className="absolute inset-y-0 right-0 grid min-h-11 w-12 touch-manipulation place-items-center rounded-r-xl text-[var(--muted)] hover:text-white disabled:cursor-wait disabled:opacity-50"
        aria-controls={id}
        aria-label={`${visible ? "Hide" : "Show"} ${toggleLabel}`}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
      </button>
    </div>
  </div>;
}
