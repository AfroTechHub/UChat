"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { Bell, BellOff, Loader2 } from "lucide-react"

// Replace with your VAPID public key from environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function PushNotifications() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window && user) {
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      })
    }
  }, [user])

  const subscribeUser = async () => {
    if (!user) {
      setMessage("Please log in to enable notifications.")
      return
    }
    if (!VAPID_PUBLIC_KEY) {
      setMessage("VAPID Public Key is not configured. Cannot subscribe.")
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.")
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }
      const subscription = await registration.pushManager.subscribe(subscribeOptions)

      // Send subscription to your Supabase database
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
        auth: arrayBufferToBase64(subscription.getKey("auth")!),
      })

      if (error) {
        console.error("Error saving subscription to DB:", error)
        setMessage("Failed to save subscription. Please try again.")
        // Unsubscribe if DB save fails
        await subscription.unsubscribe()
        setIsSubscribed(false)
      } else {
        setIsSubscribed(true)
        setMessage("Notifications enabled!")
      }
    } catch (error: any) {
      console.error("Error subscribing:", error)
      setMessage(`Failed to subscribe: ${error.message}`)
      setIsSubscribed(false)
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribeUser = async () => {
    if (!user) {
      setMessage("Not logged in.")
      return
    }
    setIsLoading(true)
    setMessage(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Remove from Supabase database first
        const { error: dbError } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint)

        if (dbError) {
          console.error("Error deleting subscription from DB:", dbError)
          setMessage("Failed to remove subscription from database.")
        } else {
          // Then unsubscribe from the service worker
          await subscription.unsubscribe()
          setIsSubscribed(false)
          setMessage("Notifications disabled.")
        }
      } else {
        setIsSubscribed(false) // Already unsubscribed or never subscribed
        setMessage("No active subscription found.")
      }
    } catch (error: any) {
      console.error("Error unsubscribing:", error)
      setMessage(`Failed to unsubscribe: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper functions for VAPID key conversion
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  function arrayBufferToBase64(buffer: ArrayBuffer) {
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))))
  }

  if (!("serviceWorker" in navigator && "PushManager" in window)) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">Push notifications are not supported by your browser.</div>
    )
  }

  return (
    <div className="p-4 flex flex-col items-center gap-2">
      {message && (
        <p className={`text-sm ${message.includes("Failed") ? "text-red-500" : "text-green-500"}`}>{message}</p>
      )}
      {isSubscribed ? (
        <Button onClick={unsubscribeUser} disabled={isLoading} className="w-full max-w-xs">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellOff className="mr-2 h-4 w-4" />}
          Disable Notifications
        </Button>
      ) : (
        <Button onClick={subscribeUser} disabled={isLoading || !user} className="w-full max-w-xs">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
          Enable Notifications
        </Button>
      )}
      {!user && <p className="text-xs text-gray-500">Log in to manage notifications.</p>}
    </div>
  )
}
