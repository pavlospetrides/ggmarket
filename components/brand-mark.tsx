import type { SVGProps } from "react";

export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false" {...props}>
      <path fill="currentColor" d="M29 7H19C10.72 7 4 13.72 4 22s6.72 15 15 15h12V22H19v7h5v1h-5a8 8 0 1 1 0-16h10V7Z" />
      <path fill="var(--brand-mark-accent, var(--primary-hover))" d="M60 27H50c-8.28 0-15 6.72-15 15s6.72 15 15 15h12V42H50v7h5v1h-5a8 8 0 1 1 0-16h10v-7Z" />
    </svg>
  );
}
