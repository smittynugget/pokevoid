export async function clearCachesAndUnregisterServiceWorkers(): Promise<void> {
  try {
    if (typeof caches !== "undefined" && typeof caches.keys === "function") {
      const cacheNames = await caches.keys();
      const allowedCachePrefixes = ["pokevoid-", "workbox-"];
      for (const cacheName of cacheNames) {
        if (!allowedCachePrefixes.some(prefix => cacheName.startsWith(prefix))) {
          continue;
        }
        await caches.delete(cacheName);
      }
    }
  } catch (e) { console.warn("[CacheClear] Failed to clear caches:", e); }

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const scriptUrls = [
          registration.active?.scriptURL,
          registration.waiting?.scriptURL,
          registration.installing?.scriptURL,
        ].filter(Boolean) as string[];

        const isPokevoidRegistration = scriptUrls.some(u => u.endsWith("/sw.js") || u.endsWith("/service-worker.js"));
        if (!isPokevoidRegistration) {
          continue;
        }
        await registration.unregister();
      }
    }
  } catch (e) { console.warn("[CacheClear] Failed to unregister service workers:", e); }
}