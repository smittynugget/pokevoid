/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

type CacheUrls = readonly string[];

const CACHE_NAME = 'pokerogue-cache-v1';
const URLS_TO_CACHE: CacheUrls = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/**/*',
  '/images/**/*'
];

self.addEventListener('install', (event: ExtendableEvent) => {
  void event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(URLS_TO_CACHE);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Cache installation failed:', error.message);
      } else {
        console.error('Cache installation failed with unknown error');
      }
    }
  })());
});

self.addEventListener('fetch', (event: FetchEvent) => {
  void event.respondWith((async () => {
    try {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetch(event.request);
      
      if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
        return networkResponse;
      }

      try {
        const cache = await caches.open(CACHE_NAME);
        const responseToCache = networkResponse.clone();
        await cache.put(event.request, responseToCache);
      } catch (cacheError: unknown) {
        if (cacheError instanceof Error) {
          console.error('Cache update failed:', cacheError.message);
        }
      }
      
      return networkResponse;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Network fetch failed:', error.message);
      }
      throw error;
    }
  })());
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  void event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (cacheName: string) => {
          if (cacheName !== CACHE_NAME) {
            try {
              await caches.delete(cacheName);
              return true;
            } catch (deleteError: unknown) {
              if (deleteError instanceof Error) {
                console.error(`Failed to delete cache ${cacheName}:`, deleteError.message);
              }
              return false;
            }
          }
          return false;
        })
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Cache activation failed:', error.message);
      }
    }
  })());
}); 