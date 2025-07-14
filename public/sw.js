self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || "New Message"
  const options = {
    body: data.body || "You have a new message.",
    icon: data.icon || "/icon-192x192.png", // Path to your app icon
    badge: data.badge || "/badge-72x72.png", // Path to your app badge icon
    data: {
      url: data.url || "/", // URL to open when notification is clicked
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim())
})
