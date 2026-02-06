export async function clearCachesAndUnregisterServiceWorkers(): Promise<void> {
  try {
    if (typeof caches !== "undefined" && typeof caches.keys === "function") {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
    }
  } catch (e) {
    console.warn("[CacheClear] Failed to clear caches:", e);
  }

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
  } catch (e) {
    console.warn("[CacheClear] Failed to unregister service workers:", e);
  }
}
