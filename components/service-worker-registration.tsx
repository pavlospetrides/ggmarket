"use client";
import { useEffect } from "react";
export function ServiceWorkerRegistration() {
  useEffect(() => {
    document.documentElement.dataset.ggHydrated = "true";
    try {
      sessionStorage.removeItem("ggmarket-sw-recovery");
    } catch {
      // Hydration remains successful when storage is unavailable.
    }
  }, []);
  return null;
}
