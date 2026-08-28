const CACHE_NAME = "religious-app-v1.6.4"
const urlsToCache = [
    "/",
    "/index.html",
    "/style.css",
    "/manifest.json",
    "/icon-192.jpg",
    "/icon-512.jpg",
    "/azan.mp3",
    "/quran.json",
    "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap",
]

// Install event
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => {
                // نحفظ كل ملف على حدة عشان لو ملف واحد فشل (مسار مختلف مثلاً)
                // البقية تتحفظ عادي بدل ما العملية كلها تفشل
                return Promise.all(
                    urlsToCache.map((url) =>
                        cache.add(url).catch((err) => {
                            console.warn("Failed to cache:", url, err)
                        })
                    )
                )
            })
            .then(() => {
                // Force the waiting service worker to become the active service worker
                return self.skipWaiting()
            }),
    )
})

// Activate event
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName)
                        }
                    }),
                )
            })
            .then(() => {
                // Claim all clients immediately
                return self.clients.claim()
            })
            .then(() => {
                // Notify all clients about the update
                return self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: "UPDATE_AVAILABLE",
                        })
                    })
                })
            }),
    )
})

// Fetch event
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Return cached version or fetch from network
            if (response) {
                return response
            }

            return fetch(event.request).then((response) => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== "basic") {
                    return response
                }

                // Clone the response
                const responseToCache = response.clone()

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache)
                })

                return response
            })
        }),
    )
})

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting()
    }
})

// Background sync for offline functionality
self.addEventListener("sync", (event) => {
    if (event.tag === "background-sync") {
        event.waitUntil(doBackgroundSync())
    }
})

function doBackgroundSync() {
    // Sync user data when back online
    return Promise.resolve()
}

// Push notifications for prayer times
self.addEventListener("push", (event) => {
    const options = {
        body: event.data ? event.data.text() : "حان وقت الصلاة",
        icon: "/icon-192.jpg",
        badge: "/icon-192.jpg",
        vibrate: [300, 100, 300],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
        },
        actions: [
            {
                action: "explore",
                title: "فتح التطبيق",
                icon: "/icon-192.jpg",
            },
            {
                action: "close",
                title: "إغلاق",
            },
        ],
    }

    event.waitUntil(self.registration.showNotification("إني قريب", options))
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
    event.notification.close()

    if (event.action === "explore") {
        event.waitUntil(self.clients.openWindow("/"))
    }
})