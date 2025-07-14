// supabase/functions/send-push/index.ts
// This Supabase Edge Function handles sending push notifications.
// It requires the `web-push` library.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"
import webpush from "https://esm.sh/web-push@3.6.7"
import { Deno } from "https://deno.land/std@0.168.0/runtime.ts" // Declare Deno variable

// VAPID keys (replace with your actual keys from environment variables)
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:your-email@example.com" // Your email or website URL

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set as environment variables.")
  // Exit or handle error appropriately
} else {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        persistSession: false,
      },
    },
  )

  try {
    const { user_id, title, body, url } = await req.json()

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing user_id, title, or body" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      })
    }

    // Fetch all subscriptions for the target user
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id)

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions found for this user." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      url,
      icon: "/icon-192x192.png", // Ensure this path is correct for your client app
      badge: "/badge-72x72.png",
    })

    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload)
        console.log(`Push notification sent to ${sub.endpoint}`)
      } catch (pushError: any) {
        console.error(`Failed to send push notification to ${sub.endpoint}:`, pushError)
        // If the subscription is no longer valid, you might want to delete it from your DB
        if (pushError.statusCode === 410) {
          // GONE status code
          console.log(`Subscription ${sub.endpoint} is no longer valid, deleting.`)
          await supabaseClient.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
        }
      }
    })

    await Promise.all(pushPromises)

    return new Response(JSON.stringify({ message: "Push notifications processed." }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Function error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
