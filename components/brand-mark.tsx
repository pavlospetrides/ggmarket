import type { SVGProps } from "react";

export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false" {...props}>
      <path fill="currentColor" d="M8 8h14v34h18v14H8V8Z" />
      <path fill="var(--brand-mark-accent, var(--primary-hover))" d="M26 8h30v14h-8v34H34V22h-8V8Z" />
    </svg>
  );
}
