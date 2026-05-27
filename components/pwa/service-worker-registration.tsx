"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost = window.location.hostname === "localhost";
    const isSecure = window.location.protocol === "https:" || isLocalhost;

    if (!isSecure) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA support is progressive; the app remains usable if registration fails.
    });
  }, []);

  return null;
}
