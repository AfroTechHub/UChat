"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Paperclip, Smile, Mic } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { EmojiPicker } from "@/components/chat/emoji-picker"

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  message_type: string
  recipient_id?: string // For direct messages
  group_id?: string // For group messages
}

interface Profile {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
}

interface RealTimeChatProps {
  chatType: "direct" | "group"
  chatId: string // recipient_id for direct, group_id for group
  chatName: string // Name of the contact or group
  chatAvatar?: string // Avatar URL for contact or group
}

export function RealTimeChat({ chatType, chatId, chatName, chatAvatar }: RealTimeChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const presenceChannelRef = useRef<any>(null)
  const [participants, setParticipants] = useState<Profile[]>([])

  const currentUserId = user?.id

  useEffect(() => {
    if (!chatId || !currentUserId) {
      setMessages([])
      setTypingUsers(new Set())
      setParticipants([])
      return
    }

    const fetchMessages = async () => {
      let query = supabase.from("messages").select("*").order("created_at", { ascending: true })

      if (chatType === "direct") {
        query = query.or(
          `and(sender_id.eq.${currentUserId},recipient_id.eq.${chatId}),and(sender_id.eq.${chatId},recipient_id.eq.${currentUserId})`,
        )
      } else {
        query = query.eq("group_id", chatId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching messages:", error)
      } else {
        setMessages(data || [])
      }
    }

    const fetchParticipants = async () => {
      if (chatType === "group") {
        const { data, error } = await supabase.from("group_members").select("profiles(*)").eq("group_id", chatId)

        if (error) {
          console.error("Error fetching group members:", error)
        } else {
          setParticipants(data.map((member: any) => member.profiles) as Profile[])
        }
      } else {
        // For direct chat, participants are just the current user and the selected contact
        const { data: contactProfile, error: contactError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", chatId)
          .single()

        if (contactError) {
          console.error("Error fetching contact profile:", contactError)
          setParticipants([])
        } else {
          setParticipants(user ? [user as Profile, contactProfile] : [contactProfile])
        }
      }
    }

    fetchMessages()
    fetchParticipants()

    // Realtime listener for new messages
    const messageChannel = supabase
      .channel(`chat_messages_${chatType}_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: chatType === "direct" ? `recipient_id=eq.${currentUserId}` : `group_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          if (chatType === "direct" && newMessage.sender_id === chatId) {
            setMessages((prev) => [...prev, newMessage])
          } else if (chatType === "group" && newMessage.group_id === chatId) {
            setMessages((prev) => [...prev, newMessage])
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          if (chatType === "direct" && newMessage.recipient_id === chatId) {
            setMessages((prev) => [...prev, newMessage])
          } else if (chatType === "group" && newMessage.group_id === chatId) {
            setMessages((prev) => [...prev, newMessage])
          }
        },
      )
      .subscribe()

    // Presence channel for typing indicators
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current)
    }

    const channelName = `chat_presence_${chatType}_${chatId}`
    presenceChannelRef.current = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    presenceChannelRef.current
      .on("presence", { event: "sync" }, () => {
        const newState = presenceChannelRef.current.presenceState()
        const typingUsersInChat = new Set<string>()
        for (const id in newState) {
          if (id !== currentUserId) {
            const userStates = newState[id] as { typing: boolean; user_id: string }[]
            if (userStates.some((state) => state.typing)) {
              typingUsersInChat.add(id)
            }
          }
        }
        setTypingUsers(typingUsersInChat)
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await presenceChannelRef.current.track({
            user_id: currentUserId,
            typing: false,
          })
        }
      })

    return () => {
      supabase.removeChannel(messageChannel)
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack()
        supabase.removeChannel(presenceChannelRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [chatType, chatId, currentUserId, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !chatId) return

    const messageData: Partial<Message> = {
      sender_id: user.id,
      content: newMessage.trim(),
      message_type: "text",
    }

    if (chatType === "direct") {
      messageData.recipient_id = chatId
    } else {
      messageData.group_id = chatId
    }

    const { error } = await supabase.from("messages").insert(messageData)

    if (error) {
      console.error("Error sending message:", error)
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(), // Temp ID for immediate display
          sender_id: user.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
          message_type: "text",
          ...(chatType === "direct" && { recipient_id: chatId }),
          ...(chatType === "group" && { group_id: chatId }),
        },
      ])
      setNewMessage("")
      setIsTyping(false)
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.track({ user_id: currentUserId, typing: false })
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  const handleTyping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (!presenceChannelRef.current || !currentUserId) return

    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true)
      await presenceChannelRef.current.track({ user_id: currentUserId, typing: true })
    } else if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false)
      await presenceChannelRef.current.track({ user_id: currentUserId, typing: false })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false)
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.track({ user_id: currentUserId, typing: false })
      }
    }, 3000) // Stop typing after 3 seconds of no input
  }

  const getSenderProfile = (senderId: string) => {
    if (senderId === user?.id) return user as Profile
    return participants.find((p) => p.id === senderId)
  }

  if (!chatId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p className="text-lg">Select a chat or group to start messaging</p>
      </div>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center gap-3 border-b p-4 dark:border-gray-800">
        <Avatar className="h-10 w-10">
          <AvatarImage src={chatAvatar || "/placeholder-group.jpg"} />
          <AvatarFallback>{chatName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg font-semibold">{chatName}</CardTitle>
          {typingUsers.size > 0 && (
            <p className="text-sm text-green-500">
              {Array.from(typingUsers)
                .map((id) => getSenderProfile(id)?.name || "Someone")
                .join(", ")}{" "}
              is typing...
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const senderProfile = getSenderProfile(msg.sender_id)
          const isCurrentUser = msg.sender_id === user?.id
          return (
            <div key={index} className={`flex items-end gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              {!isCurrentUser && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={senderProfile?.avatar_url || "/placeholder-user.jpg"} />
                  <AvatarFallback>
                    {senderProfile?.name ? senderProfile.name.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-3 text-sm ${
                  isCurrentUser
                    ? "bg-green-500 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-900 rounded-bl-none dark:bg-gray-800 dark:text-gray-50"
                }`}
              >
                {chatType === "group" && !isCurrentUser && (
                  <div className="font-semibold text-xs mb-1">
                    {senderProfile?.name || senderProfile?.email || "Unknown"}
                  </div>
                )}
                {msg.content}
                <div
                  className={`mt-1 text-xs ${isCurrentUser ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {isCurrentUser && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || "/placeholder-user.jpg"} />
                  <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </CardContent>
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t p-4 dark:border-gray-800">
        <Button variant="ghost" size="icon">
          <Paperclip className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="sr-only">Attach file</span>
        </Button>
        <EmojiPicker onEmojiSelect={(emoji) => setNewMessage((prev) => prev + emoji)}>
          <Button variant="ghost" size="icon">
            <Smile className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="sr-only">Pick emoji</span>
          </Button>
        </EmojiPicker>
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleTyping}
          className="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim()}>
          <Send className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
        <Button variant="ghost" size="icon">
          <Mic className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="sr-only">Record voice message</span>
        </Button>
      </form>
    </Card>
  )
}
