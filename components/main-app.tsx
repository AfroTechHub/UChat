"use client"

import { useState, useEffect } from "react"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { ContactsList } from "@/components/contacts-list"
import { RealTimeChat } from "@/components/chat/real-time-chat"
import { ProfileSection } from "@/components/profile/profile-section"
import { MobileMoneyModal } from "@/components/money/mobile-money-modal"
import { useMobileMoneyModal } from "@/hooks/use-mobile-money-modal"
import type { Profile } from "@/lib/supabase"
import { SettingsScreen } from "@/components/settings/settings-screen"
import { GroupChatManagement } from "@/components/features/group-chat"
import { StatusStories } from "@/components/features/status-stories"
import { MessageSearch } from "@/components/features/message-search"
import { AiAssistant } from "@/components/ai/ai-assistant"
import { useAuth } from "@/components/auth/auth-provider"
import { useRealtimeChat } from "@/lib/realtime" // Import the new hook
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { MessageSquare, Users, User, Settings, Search, CircleDotDashed } from "lucide-react"

type ActiveView = "chats" | "contacts" | "groups" | "profile" | "settings" | "search" | "ai" | "status"

interface Contact {
  id: string
  name: string
  avatar_url?: string
  status: "online" | "offline" | "away" | "busy"
  last_seen?: string
  is_typing?: boolean
}

interface Group {
  id: string
  name: string
  participant_count: number
  last_message?: string
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender_name?: string
  avatar_url?: string
  expires_at?: string | null
}

export function MainApp() {
  const { user } = useAuth()
  const [activeView, setActiveView] = useState<ActiveView>("chats")
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [chatType, setChatType] = useState<"direct" | "group">("direct")
  const { isMobileMoneyModalOpen, openMobileMoneyModal, closeMobileMoneyModal } = useMobileMoneyModal()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null)
  const [selectedChatRecipient, setSelectedChatRecipient] = useState<{
    id: string
    name: string
    avatar?: string
    isGroup: boolean
    participants?: { id: string; name: string; avatar_url?: string }[]
  } | null>(null)

  const { messages, sendMessage, sendTypingStatus, typingUsers, onlineUsers, fetchMessages } =
    useRealtimeChat(selectedChatRoomId)

  // Dummy data for demonstration
  useEffect(() => {
    // Fetch real contacts and groups from Supabase if available
    const fetchInitialData = async () => {
      if (!user) return

      // Fetch contacts (other profiles)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, status, last_seen")
        .neq("id", user.id) // Exclude current user

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
      } else {
        setContacts(
          profilesData.map((p) => ({
            id: p.id,
            name: p.name || "Unknown User",
            avatar_url: p.avatar_url,
            status: (onlineUsers.includes(p.id) ? "online" : "offline") as Contact["status"], // Integrate with realtime online status
            last_seen: p.last_seen ? new Date(p.last_seen).toLocaleTimeString() : "N/A",
            is_typing: typingUsers.includes(p.id), // Integrate with realtime typing status
          })),
        )
      }

      // Fetch chat rooms (groups and 1-on-1 chats)
      const { data: chatRoomsData, error: chatRoomsError } = await supabase
        .from("chat_room_participants")
        .select(`
          chat_rooms (
            id,
            name,
            is_group_chat,
            chat_room_participants(profile_id, profiles(name, avatar_url))
          )
        `)
        .eq("profile_id", user.id)

      if (chatRoomsError) {
        console.error("Error fetching chat rooms:", chatRoomsError)
      } else {
        const userChatRooms = chatRoomsData.map((p) => p.chat_rooms).filter(Boolean) as any[]
        const formattedGroups: Group[] = []
        userChatRooms.forEach((room) => {
          if (room.is_group_chat) {
            formattedGroups.push({
              id: room.id,
              name: room.name || "Group Chat",
              participant_count: room.chat_room_participants.length,
              last_message: "No recent messages", // TODO: Fetch actual last message
            })
          } else {
            // For 1-on-1 chats, find the other participant
            const otherParticipant = room.chat_room_participants.find((p: any) => p.profile_id !== user.id)
            if (otherParticipant && otherParticipant.profiles) {
              // Add to contacts if not already there, or update status
              setContacts((prev) => {
                const existing = prev.find((c) => c.id === otherParticipant.profile_id)
                if (!existing) {
                  return [
                    ...prev,
                    {
                      id: otherParticipant.profile_id,
                      name: otherParticipant.profiles.name || "Unknown",
                      avatar_url: otherParticipant.profiles.avatar_url,
                      status: (onlineUsers.includes(otherParticipant.profile_id)
                        ? "online"
                        : "offline") as Contact["status"],
                      last_seen: otherParticipant.profiles.last_seen
                        ? new Date(otherParticipant.profiles.last_seen).toLocaleTimeString()
                        : "N/A",
                      is_typing: typingUsers.includes(otherParticipant.profile_id),
                    },
                  ]
                }
                return prev
              })
            }
          }
        })
        setGroups(formattedGroups)
      }
    }

    fetchInitialData()
  }, [user, onlineUsers, typingUsers]) // Re-run when user, onlineUsers, or typingUsers change

  const handleSelectContact = async (contactId: string) => {
    if (!user) return

    // Find or create a 1-on-1 chat room
    const { data: existingChats, error: chatError } = await supabase
      .from("chat_room_participants")
      .select(`
        chat_room_id,
        chat_rooms(is_group_chat),
        chat_room_participants(profile_id)
      `)
      .in("profile_id", [user.id, contactId])
      .eq("chat_rooms.is_group_chat", false)

    if (chatError) {
      console.error("Error checking existing chats:", chatError)
      return
    }

    let chatRoomFound: string | null = null
    if (existingChats && existingChats.length > 0) {
      // Filter for rooms that specifically have only these two participants
      const relevantRooms = existingChats.reduce((acc: { [key: string]: string[] }, curr) => {
        if (!acc[curr.chat_room_id]) {
          acc[curr.chat_room_id] = []
        }
        acc[curr.chat_room_id].push(curr.chat_room_participants?.profile_id)
        return acc
      }, {})

      for (const roomId in relevantRooms) {
        const participantsInRoom = relevantRooms[roomId]
        if (
          participantsInRoom.includes(user.id) &&
          participantsInRoom.includes(contactId) &&
          participantsInRoom.length === 2
        ) {
          chatRoomFound = roomId
          break
        }
      }
    }

    let newChatRoomId = chatRoomFound
    if (!newChatRoomId) {
      // Create new chat room
      const { data: newRoom, error: createRoomError } = await supabase
        .from("chat_rooms")
        .insert({ is_group_chat: false })
        .select("id")
        .single()

      if (createRoomError) {
        console.error("Error creating new chat room:", createRoomError)
        return
      }
      newChatRoomId = newRoom.id

      // Add participants
      const { error: addParticipantsError } = await supabase.from("chat_room_participants").insert([
        { chat_room_id: newChatRoomId, profile_id: user.id },
        { chat_room_id: newChatRoomId, profile_id: contactId },
      ])

      if (addParticipantsError) {
        console.error("Error adding participants to new chat room:", addParticipantsError)
        return
      }
    }

    const selectedContact = contacts.find((c) => c.id === contactId)
    if (selectedContact) {
      setSelectedChatRecipient({
        id: contactId,
        name: selectedContact.name,
        avatar: selectedContact.avatar_url,
        isGroup: false,
      })
      setSelectedChatRoomId(newChatRoomId)
      setActiveView("chats")
      fetchMessages(newChatRoomId) // Fetch messages for the newly selected chat
    }
  }

  const handleCreateGroup = async (name: string, participantIds: string[]) => {
    if (!user) return

    const { data: newRoom, error: createRoomError } = await supabase
      .from("chat_rooms")
      .insert({ name, is_group_chat: true })
      .select("id")
      .single()

    if (createRoomError) {
      console.error("Error creating group chat room:", createRoomError)
      return
    }
    const newChatRoomId = newRoom.id

    const participantsToInsert = [...participantIds, user.id].map((id) => ({
      chat_room_id: newChatRoomId,
      profile_id: id,
    }))

    const { error: addParticipantsError } = await supabase.from("chat_room_participants").insert(participantsToInsert)

    if (addParticipantsError) {
      console.error("Error adding participants to group chat:", addParticipantsError)
      return
    }

    // Refresh groups list
    const { data: updatedGroups, error: fetchGroupsError } = await supabase
      .from("chat_room_participants")
      .select(`
        chat_rooms (
          id,
          name,
          is_group_chat,
          chat_room_participants(profile_id)
        )
      `)
      .eq("profile_id", user.id)
      .eq("chat_rooms.is_group_chat", true)

    if (fetchGroupsError) {
      console.error("Error fetching updated groups:", fetchGroupsError)
    } else {
      const formattedGroups = updatedGroups
        .map((p) => p.chat_rooms)
        .filter(Boolean)
        .map((room: any) => ({
          id: room.id,
          name: room.name || "Group Chat",
          participant_count: room.chat_room_participants.length,
          last_message: "No recent messages",
        }))
      setGroups(formattedGroups)
    }

    // Select the newly created group chat
    setSelectedChatRecipient({
      id: newChatRoomId,
      name: name,
      avatar: "/placeholder-group.jpg", // Default group avatar
      isGroup: true,
      participants: contacts
        .filter((c) => participantIds.includes(c.id))
        .map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatar_url })),
    })
    setSelectedChatRoomId(newChatRoomId)
    setActiveView("chats")
    fetchMessages(newChatRoomId)
  }

  const handleViewGroup = async (groupId: string) => {
    const selectedGroup = groups.find((g) => g.id === groupId)
    if (selectedGroup) {
      // Fetch participants for the group
      const { data: participantsData, error: participantsError } = await supabase
        .from("chat_room_participants")
        .select(`profile_id, profiles(name, avatar_url)`)
        .eq("chat_room_id", groupId)

      if (participantsError) {
        console.error("Error fetching group participants:", participantsError)
        return
      }

      const groupParticipants = participantsData.map((p: any) => ({
        id: p.profile_id,
        name: p.profiles?.name || "Unknown",
        avatar_url: p.profiles?.avatar_url,
      }))

      setSelectedChatRecipient({
        id: groupId,
        name: selectedGroup.name,
        avatar: "/placeholder-group.jpg",
        isGroup: true,
        participants: groupParticipants,
      })
      setSelectedChatRoomId(groupId)
      setActiveView("chats")
      fetchMessages(groupId)
    }
  }

  const handleSendMessage = (content: string, ephemeral: boolean) => {
    if (selectedChatRoomId) {
      sendMessage(content, ephemeral)
    }
  }

  const handleTypingStatusChange = (isTyping: boolean) => {
    if (selectedChatRoomId) {
      sendTypingStatus(isTyping)
    }
  }

  const handleMessageSearch = async (query: string): Promise<Message[]> => {
    if (!user) return []
    // In a real app, you'd query your messages table with `ilike` for content
    // and potentially join with chat_rooms to get context.
    // For now, simulate a search.
    console.log("Searching for:", query)
    const { data, error } = await supabase
      .from("messages")
      .select(`*, sender:profiles(name), chat_room:chat_rooms(name)`)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error searching messages:", error)
      return []
    }

    return data.map((msg: any) => ({
      id: msg.id,
      sender_name: msg.sender?.name || "Unknown",
      content: msg.content,
      created_at: msg.created_at,
      chat_room_name: msg.chat_room?.name || "Direct Chat",
    }))
  }

  const handleSelectSearchResult = (messageId: string, chatRoomId: string) => {
    // Logic to navigate to the specific message in the chat room
    console.log(`Navigate to message ${messageId} in chat room ${chatRoomId}`)
    // You would typically set selectedChatRoomId and then scroll to the message
  }

  const dummyStories = [
    {
      id: "s1",
      user_id: "user1",
      username: "Alice",
      media_url: "/placeholder.svg?height=200&width=150",
      type: "image",
      created_at: new Date().toISOString(),
      views: 15,
    },
    {
      id: "s2",
      user_id: "user2",
      username: "Bob",
      media_url: "/placeholder.svg?height=200&width=150",
      type: "image",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      views: 8,
    },
  ]

  const handleBackToContacts = () => {
    setSelectedContact(null)
    setActiveView("contacts")
  }

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroup(groupId)
    setActiveView("groups")
  }

  const renderMainContent = () => {
    switch (activeView) {
      case "chats":
        if (chatType === "direct" && selectedContact) {
          return (
            <RealTimeChat
              chatType="direct"
              chatId={selectedContact.id}
              chatName={selectedContact.name || selectedContact.email || selectedContact.phone || "Unknown"}
              chatAvatar={selectedContact.avatar_url || "/placeholder-user.jpg"}
            />
          )
        } else if (chatType === "group" && selectedGroup) {
          // You'll need to fetch group name and avatar based on selectedGroup ID
          // For now, using a placeholder name
          return (
            <RealTimeChat
              chatType="group"
              chatId={selectedGroup}
              chatName={`Group ${selectedGroup.substring(0, 4)}...`}
              chatAvatar="/placeholder-group.jpg"
            />
          )
        }
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <MessageSquare className="h-16 w-16 mb-4" />
            <p className="text-lg">Start a conversation</p>
            <p className="text-sm">Select a contact or group from the sidebar.</p>
          </div>
        )
      case "contacts":
        return <ContactsList onSelectContact={handleSelectContact} />
      case "groups":
        return <GroupChatManagement onSelectGroup={handleSelectGroup} />
      case "profile":
        return <ProfileSection />
      case "settings":
        return <SettingsScreen />
      case "search":
        return <MessageSearch />
      case "ai":
        return <AiAssistant />
      case "status":
        return <StatusStories />
      default:
        return null
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:flex flex-col w-64 border-r dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="p-4 border-b dark:border-gray-700">
              <h1 className="text-2xl font-bold text-green-600">uChat</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView("contacts")}>
                Contacts
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView("groups")}>
                Groups
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView("status")}>
                Status & Stories
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView("search")}>
                Message Search
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView("ai")}>
                AI Assistant
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView("profile")}>
                Profile
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setActiveView("settings")}>
                Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={openMobileMoneyModal}>
                Mobile Money
              </Button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex">{renderMainContent()}</main>

          {/* Mobile navigation (bottom bar) */}
          <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around p-2 lg:hidden z-10">
            <Button variant="ghost" size="icon" onClick={() => setActiveView("contacts")}>
              <Users className="h-6 w-6" />
              <span className="sr-only">Contacts</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveView("groups")}>
              <CircleDotDashed className="h-6 w-6" />
              <span className="sr-only">Groups</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveView("search")}>
              <Search className="h-6 w-6" />
              <span className="sr-only">Search</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveView("profile")}>
              <User className="h-6 w-6" />
              <span className="sr-only">Profile</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveView("settings")}>
              <Settings className="h-6 w-6" />
              <span className="sr-only">Settings</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={openMobileMoneyModal}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-wallet-2"
              >
                <path d="M17 14h.01" />
                <path d="M12 14h.01" />
                <path d="M7 14h.01" />
                <path d="M22 10s-2.01-2-7-2-7 2-7 2v7s2.01 2 7 2 7-2 7-2V10z" />
                <path d="M12 15V9" />
              </svg>
              <span className="sr-only">Mobile Money</span>
            </Button>
          </nav>

          <MobileMoneyModal isOpen={isMobileMoneyModalOpen} onClose={closeMobileMoneyModal} />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  )
}
