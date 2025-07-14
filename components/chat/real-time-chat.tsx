"use client"

import type React from "react"
import { Loader2 } from "lucide-react" // Declare Loader2 here
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { Message, Profile } from "@/lib/supabase"
import { Send, Paperclip, Smile, Mic, XCircle, Clock } from "lucide-react" // Added XCircle for clearing file
import { useAuth } from "@/components/auth/auth-provider"
import { uploadFile } from "@/lib/file-upload" // Import the file upload utility

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null) // New state for selected file
  const [isUploadingFile, setIsUploadingFile] = useState(false) // New state for upload loading
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const presenceChannelRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null) // Ref for file input
  const [participants, setParticipants] = useState<Profile[]>([])
  const [ephemeralDuration, setEphemeralDuration] = useState<"none" | "5s" | "1m" | "1h">("none")

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
    if (!user || !chatId || (!newMessage.trim() && !selectedFile)) return

    let messageType: Message["message_type"] = "text"
    let fileUrl: string | null = null
    let fileType: string | null = null
    let messageContent = newMessage.trim()

    if (selectedFile) {
      setIsUploadingFile(true)
      const bucketName = "chat-files" // Define your Supabase storage bucket for chat files
      const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`
      const { url, error: uploadError } = await uploadFile(bucketName, selectedFile, filePath)

      if (uploadError) {
        console.error("Error uploading file:", uploadError)
        setIsUploadingFile(false)
        alert("Failed to upload file. Please try again.")
        return
      }

      fileUrl = url || null
      fileType = selectedFile.type
      messageType = selectedFile.type.startsWith("image/")
        ? "image"
        : selectedFile.type.startsWith("video/")
          ? "video"
          : selectedFile.type.startsWith("audio/")
            ? "audio"
            : "file"
      messageContent = selectedFile.name // Use file name as content for file messages
    }

    let expiresAt: string | null = null
    if (ephemeralDuration !== "none") {
      const now = new Date()
      if (ephemeralDuration === "5s") now.setSeconds(now.getSeconds() + 5)
      else if (ephemeralDuration === "1m") now.setMinutes(now.getMinutes() + 1)
      else if (ephemeralDuration === "1h") now.setHours(now.getHours() + 1)
      expiresAt = now.toISOString()
    }

    const messageData: Partial<Message> = {
      sender_id: user.id,
      content: messageContent,
      message_type: messageType,
      file_url: fileUrl,
      file_type: fileType,
      expires_at: expiresAt, // Add this line
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
          content: messageContent,
          created_at: new Date().toISOString(),
          message_type: messageType,
          file_url: fileUrl,
          file_type: fileType,
          expires_at: expiresAt, // Add this line
          ...(chatType === "direct" && { recipient_id: chatId }),
          ...(chatType === "group" && { group_id: chatId }),
        },
      ])
      setNewMessage("")
      setSelectedFile(null) // Clear selected file after sending
      setIsUploadingFile(false)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setNewMessage(e.target.files[0].name) // Show file name in input
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setNewMessage("")
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // Clear the file input
    }
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
    <div className="flex flex-col h-full">
      <div className="flex flex-row items-center gap-3 border-b p-4 dark:border-gray-800">
        <div className="h-10 w-10">
          <img src={chatAvatar || "/placeholder-group.jpg"} alt={chatName} className="rounded-full" />
        </div>
        <div>
          <div className="text-lg font-semibold">{chatName}</div>
          {typingUsers.size > 0 && (
            <p className="text-sm text-green-500">
              {Array.from(typingUsers)
                .map((id) => getSenderProfile(id)?.name || "Someone")
                .join(", ")}{" "}
              is typing...
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const senderProfile = getSenderProfile(msg.sender_id)
          const isCurrentUser = msg.sender_id === user?.id
          return (
            <div key={index} className={`flex items-end gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              {!isCurrentUser && (
                <div className="h-8 w-8">
                  <img
                    src={senderProfile?.avatar_url || "/placeholder-user.jpg"}
                    alt={senderProfile?.name || "User"}
                    className="rounded-full"
                  />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-lg p-3 text-sm ${
                  isCurrentUser
                    ? "bg-green-500 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-900 rounded-bl-none dark:bg-gray-800 dark:text-gray-50"
                }`}
              >
                {msg.expires_at && (
                  <div className="text-xs text-yellow-100 mb-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Ephemeral
                  </div>
                )}
                {chatType === "group" && !isCurrentUser && (
                  <div className="font-semibold text-xs mb-1">
                    {senderProfile?.name || senderProfile?.email || "Unknown"}
                  </div>
                )}
                {msg.message_type === "text" && msg.content}
                {msg.message_type === "image" && msg.file_url && (
                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={msg.file_url || "/placeholder.svg"}
                      alt={msg.content || "Shared Image"}
                      className="max-w-full h-auto rounded-md cursor-pointer"
                      style={{ maxHeight: "200px" }} // Limit image height for chat view
                    />
                  </a>
                )}
                {msg.message_type === "video" && msg.file_url && (
                  <video
                    controls
                    src={msg.file_url}
                    className="max-w-full h-auto rounded-md"
                    style={{ maxHeight: "200px" }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                {msg.message_type === "audio" && msg.file_url && (
                  <audio controls src={msg.file_url} className="w-full">
                    Your browser does not support the audio element.
                  </audio>
                )}
                {msg.message_type === "file" && msg.file_url && (
                  <a
                    href={msg.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <Paperclip className="h-4 w-4" />
                    {msg.content || "Shared File"}
                  </a>
                )}
                <div
                  className={`mt-1 text-xs ${isCurrentUser ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {isCurrentUser && (
                <div className="h-8 w-8">
                  <img
                    src={user.avatar_url || "/placeholder-user.jpg"}
                    alt={user.name || "User"}
                    className="rounded-full"
                  />
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t p-4 dark:border-gray-800">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        <button
          type="button"
          className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingFile}
        >
          <Paperclip className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="sr-only">Attach file</span>
        </button>
        <button type="button" className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
          <Smile className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="sr-only">Pick emoji</span>
        </button>
        <Select
          value={ephemeralDuration}
          onValueChange={(value: "none" | "5s" | "1m" | "1h") => setEphemeralDuration(value)}
          disabled={isUploadingFile}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Ephemeral" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Normal</SelectItem>
            <SelectItem value="5s">5 seconds</SelectItem>
            <SelectItem value="1m">1 minute</SelectItem>
            <SelectItem value="1h">1 hour</SelectItem>
          </SelectContent>
        </Select>
        <input
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleTyping}
          className="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800"
          disabled={isUploadingFile}
        />
        {selectedFile && (
          <button
            type="button"
            className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2"
            onClick={clearSelectedFile}
            disabled={isUploadingFile}
          >
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="sr-only">Clear selected file</span>
          </button>
        )}
        <button
          type="submit"
          className="bg-green-500 text-white rounded-lg p-2"
          disabled={(!newMessage.trim() && !selectedFile) || isUploadingFile}
        >
          {isUploadingFile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          <span className="sr-only">Send message</span>
        </button>
        <button type="button" className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2" disabled={isUploadingFile}>
          <Mic className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="sr-only">Record voice message</span>
        </button>
      </form>
    </div>
  )
}
