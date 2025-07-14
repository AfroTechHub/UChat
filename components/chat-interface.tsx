"use client"

import { useState } from "react"
import { ContactsList } from "@/components/contacts/contacts-list"
import { RealTimeChat } from "@/components/chat/real-time-chat"
import { ProfileSection } from "@/components/profile/profile-section"
import { SettingsScreen } from "@/components/settings/settings-screen"
import { GroupChatManagement } from "@/components/features/group-chat"
import { StatusStories } from "@/components/features/status-stories"
import { MessageSearch } from "@/components/features/message-search"
import { AiAssistant } from "@/components/ai/ai-assistant"
import type { Profile } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { MessageSquare, Users, User, Settings, Search, Bot, CircleDotDashed } from "lucide-react"

export function MainApp() {
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<
    "chats" | "contacts" | "groups" | "profile" | "settings" | "search" | "ai" | "status"
  >("chats")
  const [chatType, setChatType] = useState<"direct" | "group">("direct")

  const handleSelectContact = (contact: Profile) => {
    setSelectedContact(contact)
    setSelectedGroup(null)
    setChatType("direct")
    setActiveView("chats")
  }

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroup(groupId)
    setSelectedContact(null)
    setChatType("group")
    setActiveView("chats")
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
    <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900">
      {/* Sidebar Navigation */}
      <div className="flex flex-col items-center justify-between w-20 bg-gray-200 dark:bg-gray-950 p-4 border-r dark:border-gray-800">
        <div className="flex flex-col gap-4">
          <Button
            variant={activeView === "chats" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("chats")}
            className={activeView === "chats" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
          >
            <MessageSquare className="h-6 w-6" />
            <span className="sr-only">Chats</span>
          </Button>
          <Button
            variant={activeView === "contacts" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("contacts")}
            className={activeView === "contacts" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
          >
            <User className="h-6 w-6" />
            <span className="sr-only">Contacts</span>
          </Button>
          <Button
            variant={activeView === "groups" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("groups")}
            className={activeView === "groups" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
          >
            <Users className="h-6 w-6" />
            <span className="sr-only">Groups</span>
          </Button>
          <Button
            variant={activeView === "status" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("status")}
            className={activeView === "status" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
          >
            <CircleDotDashed className="h-6 w-6" />
            <span className="sr-only">Status</span>
          </Button>
          <Button
            variant={activeView === "search" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("search")}
            className={activeView === "search" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
          >
            <Search className="h-6 w-6" />
            <span className="sr-only">Search</span>
          </Button>
          <Button
            variant={activeView === "ai" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("ai")}
            className={activeView === "ai" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
          >
            <Bot className="h-6 w-6" />
            <span className="sr-only">AI Assistant</span>
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <Button
            variant={activeView === "profile" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("profile")}
            className={activeView === "profile" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
          >
            <User className="h-6 w-6" />
            <span className="sr-only">Profile</span>
          </Button>
          <Button
            variant={activeView === "settings" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveView("settings")}
            className={activeView === "settings" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
          >
            <Settings className="h-6 w-6" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">{renderMainContent()}</div>
    </div>
  )
}
