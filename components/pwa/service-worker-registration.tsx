"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost = window.location.hostname === "localhost";
    const isSecure = window.location.protocol === "https:" || isLocalhost;

    if (isLocalhost) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .then(() => caches.keys())
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {
          // Local development should keep working even if cache cleanup fails.
        });
      return;
    }

    if (!isSecure) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA support is progressive; the app remains usable if registration fails.
    });
  }, []);

  return null;
}
