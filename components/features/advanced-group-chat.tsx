"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Users, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Contact {
  id: string
  name: string
  avatar_url?: string
}

interface GroupChatProps {
  contacts: Contact[]
  onCreateGroup: (name: string, participantIds: string[]) => void
  onViewGroup: (groupId: string) => void
  groups: { id: string; name: string; participant_count: number; last_message?: string }[]
}

export function AdvancedGroupChat({ contacts, onCreateGroup, onViewGroup, groups }: GroupChatProps) {
  const [groupName, setGroupName] = useState("")
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const handleParticipantToggle = (contactId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    )
  }

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedParticipants.length > 0) {
      onCreateGroup(groupName.trim(), selectedParticipants)
      setGroupName("")
      setSelectedParticipants([])
      setIsCreatingGroup(false)
    }
  }

  const filteredContacts = contacts.filter((contact) => contact.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isCreatingGroup) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-xl flex items-center justify-between">
            Create New Group
            <Button variant="ghost" size="icon" onClick={() => setIsCreatingGroup(false)}>
              <X className="w-5 h-5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 flex flex-col space-y-4">
          <Input
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mb-2"
          />
          <div className="flex items-center space-x-2 mb-4">
            <Input
              placeholder="Search contacts to add..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 border rounded-md p-2">
            <div className="space-y-2">
              {filteredContacts.length === 0 && <p className="text-center text-gray-500">No contacts found.</p>}
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={contact.avatar_url || "/placeholder-user.jpg"} />
                      <AvatarFallback>{contact.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{contact.name}</p>
                  </div>
                  <Checkbox
                    checked={selectedParticipants.includes(contact.id)}
                    onCheckedChange={() => handleParticipantToggle(contact.id)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Selected: <Badge>{selectedParticipants.length}</Badge> participants
            </p>
            <Button
              onClick={handleCreateGroup}
              className="w-full"
              disabled={!groupName.trim() || selectedParticipants.length === 0}
            >
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-xl flex items-center justify-between">
          Advanced Group Chat
          <Button
            onClick={() => setIsCreatingGroup(true)}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> New Group
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <ScrollArea className="h-full">
          <div className="space-y-3">
            {groups.length === 0 && <p className="text-center text-gray-500">No groups yet. Create one!</p>}
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => onViewGroup(group.id)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12 bg-purple-100 text-purple-700">
                    <AvatarFallback>
                      <Users className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-800">{group.name}</p>
                    <p className="text-sm text-gray-500">
                      {group.last_message || `${group.participant_count} members`}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{group.participant_count}</Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4">
          <p>This component will contain advanced group chat features.</p>
          <p>It will build upon the basic group chat management to include features like:</p>
          <ul>
            <li>In-group messaging interface</li>
            <li>Group settings (name, description, avatar)</li>
            <li>Admin controls (kick, ban, change roles)</li>
            <li>Group invitations</li>
            <li>Shared media/files in groups</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
