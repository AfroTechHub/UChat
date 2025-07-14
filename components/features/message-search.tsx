"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, XCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import type { Message, Profile } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react" // Import Loader2

interface SearchResult {
  message: Message
  sender: Profile
  recipient?: Profile
  group?: { id: string; name: string }
}

export function MessageSearch() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allProfiles, setAllProfiles] = useState<Map<string, Profile>>(new Map())
  const [allGroups, setAllGroups] = useState<Map<string, { id: string; name: string }>>(new Map())

  useEffect(() => {
    const fetchAllMetadata = async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, phone, avatar_url")
      if (profilesError) {
        console.error("Error fetching profiles for search:", profilesError.message)
      } else {
        const profileMap = new Map<string, Profile>()
        profilesData.forEach((p) => profileMap.set(p.id, p as Profile))
        setAllProfiles(profileMap)
      }

      const { data: groupsData, error: groupsError } = await supabase.from("groups").select("id, name")
      if (groupsError) {
        console.error("Error fetching groups for search:", groupsError.message)
      } else {
        const groupMap = new Map<string, { id: string; name: string }>()
        groupsData.forEach((g) => groupMap.set(g.id, g))
        setAllGroups(groupMap)
      }
    }
    fetchAllMetadata()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim() || !user) {
      setSearchResults([])
      return
    }

    setLoading(true)
    setError(null)
    setSearchResults([])

    try {
      // Search in messages where current user is sender, recipient, or member of the group
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .ilike("content", `%${searchTerm.trim()}%`)
        .or(
          `sender_id.eq.${user.id},recipient_id.eq.${user.id},group_id.in.(select group_id from group_members where user_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: false })
        .limit(50) // Limit results for performance

      if (messagesError) throw messagesError

      const results: SearchResult[] = messagesData.map((msg) => {
        const sender = allProfiles.get(msg.sender_id) || {
          id: msg.sender_id,
          name: "Unknown Sender",
          email: null,
          phone: null,
          avatar_url: null,
        }
        let recipient: Profile | undefined
        let group: { id: string; name: string } | undefined

        if (msg.recipient_id) {
          recipient = allProfiles.get(msg.recipient_id)
        }
        if (msg.group_id) {
          group = allGroups.get(msg.group_id)
        }

        return {
          message: msg as Message,
          sender,
          recipient,
          group,
        }
      })
      setSearchResults(results)
    } catch (err: any) {
      setError(err.message || "An error occurred during search.")
      console.error("Message search error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getChatName = (result: SearchResult) => {
    if (result.group) {
      return result.group.name
    }
    if (result.recipient && result.recipient.id === user?.id) {
      return result.sender.name || result.sender.email || result.sender.phone || "Unknown"
    }
    if (result.recipient) {
      return result.recipient.name || result.recipient.email || result.recipient.phone || "Unknown"
    }
    return "Direct Chat" // Fallback
  }

  const getChatAvatar = (result: SearchResult) => {
    if (result.group) {
      return result.group.id ? "/placeholder-group.jpg" : "/placeholder-group.jpg" // Placeholder for group avatar
    }
    if (result.recipient && result.recipient.id === user?.id) {
      return result.sender.avatar_url || "/placeholder-user.jpg"
    }
    if (result.recipient) {
      return result.recipient.avatar_url || "/placeholder-user.jpg"
    }
    return "/placeholder-user.jpg"
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-6 w-6" /> Message Search
        </CardTitle>
        <form onSubmit={handleSearch} className="relative mt-4 flex gap-2">
          <Input
            type="search"
            placeholder="Search messages..."
            className="flex-1 rounded-lg bg-gray-100 pl-9 focus:ring-0 focus:ring-offset-0 dark:bg-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Button type="submit" size="icon" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-5 w-5" />}
            <span className="sr-only">Search</span>
          </Button>
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchTerm("")
                setSearchResults([])
                setError(null)
              }}
              disabled={loading}
            >
              <XCircle className="h-5 w-5 text-gray-500" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </form>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {loading && <div className="p-4 text-center text-gray-500">Searching...</div>}
        {error && <div className="p-4 text-center text-red-500">Error: {error}</div>}
        {!loading && searchResults.length === 0 && searchTerm.length > 0 && (
          <div className="p-4 text-center text-gray-500">No messages found for "{searchTerm}".</div>
        )}
        {!loading && searchResults.length === 0 && searchTerm.length === 0 && (
          <div className="p-4 text-center text-gray-500">Enter a keyword to search your messages.</div>
        )}
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {searchResults.map((result) => (
            <li key={result.message.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getChatAvatar(result) || "/placeholder.svg"} />
                  <AvatarFallback>{getChatName(result).charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="font-medium text-sm">{getChatName(result)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  {new Date(result.message.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                <span className="font-semibold">{result.sender.name || "You"}: </span>
                {result.message.content}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
