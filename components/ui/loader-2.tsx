import type { ReactElement } from "react";
import styles from "./loader-2.module.css";

export type Loader2Props = {
  size?: "compact" | "standard";
  label?: string;
  delayed?: boolean;
  decorative?: boolean;
  className?: string;
};

export function Loader2({
  size = "standard",
  label = "Loading",
  delayed = false,
  decorative = false,
  className,
}: Loader2Props): ReactElement {
  const rootClassName = [
    styles.root,
    styles[size],
    delayed ? styles.delayed : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClassName}
      data-loader-size={size}
      data-loader-delayed={delayed ? "true" : undefined}
      {...(decorative
        ? { "aria-hidden": true }
        : {
            role: "status",
            "aria-label": label,
            "aria-live": "polite",
            "aria-atomic": true,
          })}
    >
      <span className={styles.viewport} aria-hidden="true">
        <span className={styles.shapes}>
          <span className={styles.loader} data-loader-shape="circle">
            <svg viewBox="0 0 80 80">
              <circle r="32" cy="40" cx="40" />
            </svg>
          </span>

          <span
            className={`${styles.loader} ${styles.triangle}`}
            data-loader-shape="triangle"
          >
            <svg viewBox="0 0 86 80">
              <polygon points="43 8 79 72 7 72" />
            </svg>
          </span>

          <span className={styles.loader} data-loader-shape="square">
            <svg viewBox="0 0 80 80">
              <rect height="64" width="64" y="8" x="8" />
            </svg>
          </span>
        </span>
      </span>
      {decorative ? null : <span className="sr-only">{label}</span>}
    </div>
  );
}

export const Component = Loader2;
