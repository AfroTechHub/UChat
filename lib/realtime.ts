"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { RealtimeHook } from "./types" // Declare the RealtimeHook variable

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender_name?: string
  avatar_url?: string
  expires_at?: string | null
}

interface PresenceState {
  [key: string]: {
    user_id: string
    typing: boolean
    // Add other presence properties as needed
  }[]
}

/**
 * Subscribes to a presence channel for typing indicators.
 * @param channelName - The name of the channel to subscribe to.
 * @param currentUserId - The ID of the current user.
 * @param onTypingUsersChange - Callback function to receive updated list of typing user IDs.
 * @returns A function to unsubscribe from the channel.
 */
export function subscribeToTypingIndicators(
  channelName: string,
  currentUserId: string,
  onTypingUsersChange: (typingUserIds: Set<string>) => void,
) {
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: currentUserId, // Use user ID as presence key
      },
    },
  })

  channel
    .on("presence", { event: "sync" }, () => {
      const newState = channel.presenceState() as PresenceState
      const typingUsers = new Set<string>()
      for (const id in newState) {
        if (id !== currentUserId) {
          const userStates = newState[id]
          if (userStates && userStates.some((state) => state.typing)) {
            typingUsers.add(id)
          }
        }
      }
      onTypingUsersChange(typingUsers)
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: currentUserId, typing: false })
      }
    })

  return () => {
    channel.untrack()
    supabase.removeChannel(channel)
  }
}

/**
 * Updates the typing status of the current user in a presence channel.
 * @param channelName - The name of the channel.
 * @param currentUserId - The ID of the current user.
 * @param isTyping - Boolean indicating if the user is currently typing.
 */
export async function updateTypingStatus(channelName: string, currentUserId: string, isTyping: boolean) {
  const channel = supabase.channel(channelName) // Get existing channel instance
  if (channel) {
    await channel.track({ user_id: currentUserId, typing: isTyping })
  }
}

/**
 * Subscribes to real-time changes on a specific table.
 * @param tableName - The name of the table to listen to.
 * @param filter - Optional filter for the changes (e.g., `id=eq.some_id`).
 * @param onInsert - Callback for INSERT events.
 * @param onUpdate - Callback for UPDATE events.
 * @param onDelete - Callback for DELETE events.
 * @returns A function to unsubscribe from the channel.
 */
export function subscribeToTableChanges<T>(
  tableName: string,
  filter = "*",
  onInsert?: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: T) => void,
) {
  const channel = supabase
    .channel(`public:${tableName}:${filter}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: tableName, filter }, (payload) => {
      if (onInsert) onInsert(payload.new as T)
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: tableName, filter }, (payload) => {
      if (onUpdate) onUpdate(payload.new as T)
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: tableName, filter }, (payload) => {
      if (onDelete) onDelete(payload.old as T)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Hook for managing user presence (online/offline status, typing indicators)
function usePresence(channelName: string, userId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const channelRef = useRef<RealtimeChannel | null>(null)

  const updatePresenceState = useCallback(
    (state: PresenceState) => {
      const currentTypingUsers = new Set<string>()

      for (const id in state) {
        const userPresence = state[id][0] // Assuming one state per user ID
        if (userPresence && userPresence.typing && id !== userId) {
          currentTypingUsers.add(id)
        }
      }
      setTypingUsers(currentTypingUsers)
    },
    [userId],
  )

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel(`presence:${channelName}`, {
      config: { presence: { key: userId } },
    })
    channelRef.current = channel

    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState()
        updatePresenceState(newState as PresenceState)
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("New presences:", newPresences)
        const newState = channel.presenceState()
        updatePresenceState(newState as PresenceState)
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("Left presences:", leftPresences)
        const newState = channel.presenceState()
        updatePresenceState(newState as PresenceState)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, typing: false })
        }
      })

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [channelName, userId, updatePresenceState])

  return { typingUsers }
}

// Hook for subscribing to real-time database changes
function useRealtimeMessages(table: string, filter: string, onNewMessage: (payload: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}:${filter}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: table, filter: filter }, (payload) => {
        onNewMessage(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, onNewMessage])
}

export function useRealtimeChat(chatRoomId: string | null): RealtimeHook {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const { typingUsers } = usePresence(`chat_room_${chatRoomId}`, user?.id)

  const currentUserId = user?.id

  const fetchMessages = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select(`*, sender:profiles(name, avatar_url)`)
      .eq("chat_room_id", roomId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
    } else {
      const formattedMessages = data.map((msg: any) => ({
        ...msg,
        sender_name: msg.sender?.name || "Unknown",
        avatar_url: msg.sender?.avatar_url,
      }))
      setMessages(formattedMessages)
    }
  }, [])

  useEffect(() => {
    if (!chatRoomId) {
      setMessages([])
      return
    }

    // Initial fetch for the selected chat room
    fetchMessages(chatRoomId)
  }, [chatRoomId, fetchMessages])

  const sendMessage = useCallback(
    async (content: string, ephemeral: boolean) => {
      if (!currentUserId || !chatRoomId) return

      let expiresAt = null
      if (ephemeral) {
        // Set expiration for 10 seconds from now for demo purposes
        expiresAt = new Date(Date.now() + 10 * 1000).toISOString()
      }

      const { error } = await supabase.from("messages").insert({
        chat_room_id: chatRoomId,
        sender_id: currentUserId,
        content: content,
        message_type: "text",
        expires_at: expiresAt,
      })

      if (error) {
        console.error("Error sending message:", error)
      }
    },
    [currentUserId, chatRoomId],
  )

  const sendTypingStatus = useCallback(
    async (isTyping: boolean) => {
      if (!chatRoomId || !currentUserId) return
      await updateTypingStatus(`presence:chat_room_${chatRoomId}`, currentUserId, isTyping)
    },
    [chatRoomId, currentUserId],
  )

  const onlineUsers = [] // Placeholder for online users, fetch from profiles if needed

  return {
    messages,
    sendMessage,
    sendTypingStatus,
    typingUsers: Array.from(typingUsers),
    onlineUsers,
    fetchMessages,
  }
}
