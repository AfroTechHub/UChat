"use client"

import { CardContent } from "@/components/ui/card"

import { CardTitle } from "@/components/ui/card"

import { CardHeader } from "@/components/ui/card"

import { Card } from "@/components/ui/card"

import type React from "react"
import { Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import type { Profile, Group } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MultiSelect } from "@/components/ui/multi-select" // Assuming you have a MultiSelect component

interface GroupChatManagementProps {
  onSelectGroup: (groupId: string) => void
}

export function GroupChatManagement({ onSelectGroup }: GroupChatManagementProps) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]) // Array of profile IDs

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true)
      // Fetch groups where the current user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from("group_members")
        .select("groups(*)")
        .eq("user_id", user?.id)

      if (memberError) {
        setError(memberError.message)
        setGroups([])
      } else {
        setGroups(memberGroups.map((mg: any) => mg.groups).filter(Boolean) as Group[])
      }
      setLoading(false)
    }

    const fetchAllProfiles = async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, email, avatar_url")
      if (error) {
        console.error("Error fetching all profiles:", error.message)
      } else {
        setAllProfiles(data || [])
      }
    }

    fetchGroups()
    fetchAllProfiles()

    const channel = supabase
      .channel("public:groups")
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, (payload) => {
        fetchGroups() // Re-fetch groups on any change to groups table
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, (payload) => {
        fetchGroups() // Re-fetch groups on any change to group_members table
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || !user) return

    setLoading(true)
    setError(null)

    try {
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          created_by: user.id,
        })
        .select()
        .single()

      if (groupError) throw groupError

      const newGroupId = groupData.id

      // Add creator as a member
      const membersToInsert = [{ group_id: newGroupId, user_id: user.id, role: "admin" }]

      // Add selected members
      selectedMembers.forEach((memberId) => {
        if (memberId !== user.id) {
          // Avoid duplicating creator
          membersToInsert.push({ group_id: newGroupId, user_id: memberId, role: "member" })
        }
      })

      const { error: membersError } = await supabase.from("group_members").insert(membersToInsert)

      if (membersError) throw membersError

      setNewGroupName("")
      setNewGroupDescription("")
      setSelectedMembers([])
      setIsCreateGroupModalOpen(false)
      // Groups will re-fetch due to realtime listener
    } catch (err: any) {
      setError(err.message)
      console.error("Error creating group:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Only allow creator to delete group
      const { error: deleteError } = await supabase.from("groups").delete().eq("id", groupId).eq("created_by", user.id) // Ensure only creator can delete

      if (deleteError) throw deleteError
      // Groups will re-fetch due to realtime listener
    } catch (err: any) {
      setError(err.message)
      console.error("Error deleting group:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = groups.filter(
    (group) =>
      group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const profileOptions = allProfiles
    .filter((profile) => profile.id !== user?.id) // Don't allow adding self again
    .map((profile) => ({
      label: profile.name || profile.email || profile.phone || "Unknown User",
      value: profile.id,
    }))

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Groups
          <Dialog open={isCreateGroupModalOpen} onOpenChange={setIsCreateGroupModalOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-5 w-5" />
                <span className="sr-only">Create new group</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>Fill in the details for your new group chat.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="col-span-3"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    className="col-span-3"
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="members" className="text-right">
                    Members
                  </Label>
                  <div className="col-span-3">
                    <MultiSelect
                      options={profileOptions}
                      selected={selectedMembers}
                      onSelectChange={setSelectedMembers}
                      placeholder="Select members..."
                      disabled={loading}
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm col-span-4 text-center">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Group"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Search groups..."
            className="w-full rounded-lg bg-gray-100 pl-9 focus:ring-0 focus:ring-offset-0 dark:bg-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {loading && <div className="p-4 text-center text-gray-500">Loading groups...</div>}
        {error && <div className="p-4 text-center text-red-500">Error: {error}</div>}
        {!loading && filteredGroups.length === 0 && (
          <div className="p-4 text-center text-gray-500">No groups found.</div>
        )}
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredGroups.map((group) => (
            <li
              key={group.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <div className="flex items-center gap-3" onClick={() => onSelectGroup(group.id)}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={group.avatar_url || "/placeholder-group.jpg"} />
                  <AvatarFallback>{group.name ? group.name.charAt(0).toUpperCase() : "G"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{group.description || "No description"}</p>
                </div>
              </div>
              {group.created_by === user?.id && ( // Only show delete for groups created by current user
                <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group.id)} disabled={loading}>
                  <Trash2 className="h-5 w-5 text-red-500" />
                  <span className="sr-only">Delete group</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
