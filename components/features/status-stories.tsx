"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PlusCircle, Heart, MessageCircle, XCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import type { Profile } from "@/types/profile" // Import Profile type

interface Story {
  id: string
  user_id: string
  content_url: string // URL to image/video
  content_type: "image" | "video"
  caption: string | null
  created_at: string
  expires_at: string // Stories typically expire after 24 hours
}

interface UserStory {
  profile: Profile
  stories: Story[]
}

export function StatusStories() {
  const { user } = useAuth()
  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isViewingStory, setIsViewingStory] = useState(false)
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [currentStoryUser, setCurrentStoryUser] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true)
      setError(null)

      // Fetch stories that haven't expired yet
      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("*")
        .gte("expires_at", new Date().toISOString()) // Only active stories
        .order("created_at", { ascending: false })

      if (storiesError) {
        setError(storiesError.message)
        setLoading(false)
        return
      }

      // Fetch profiles for all unique story creators
      const uniqueUserIds = Array.from(new Set(storiesData.map((story) => story.user_id)))
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", uniqueUserIds)

      if (profilesError) {
        setError(profilesError.message)
        setLoading(false)
        return
      }

      const profilesMap = new Map(profilesData.map((p) => [p.id, p as Profile]))

      // Group stories by user
      const groupedStories: { [userId: string]: Story[] } = {}
      storiesData.forEach((story) => {
        if (!groupedStories[story.user_id]) {
          groupedStories[story.user_id] = []
        }
        groupedStories[story.user_id].push(story as Story)
      })

      const formattedUserStories: UserStory[] = Object.keys(groupedStories).map((userId) => ({
        profile: profilesMap.get(userId) || { id: userId, name: "Unknown User", avatar_url: null },
        stories: groupedStories[userId].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      }))

      setUserStories(formattedUserStories)
      setLoading(false)
    }

    fetchStories()

    // Realtime listener for new stories or story updates/deletions
    const channel = supabase
      .channel("public:stories")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, (payload) => {
        fetchStories() // Re-fetch all stories on any change
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleViewStory = (story: Story, profile: Profile) => {
    setCurrentStory(story)
    setCurrentStoryUser(profile)
    setIsViewingStory(true)
  }

  const handleCloseStoryViewer = () => {
    setIsViewingStory(false)
    setCurrentStory(null)
    setCurrentStoryUser(null)
  }

  const handleAddStory = async () => {
    // Placeholder for adding a new story
    // In a real app, this would open a modal for media selection and captioning
    alert("Add Story functionality coming soon!")
    // Example:
    // const fileInput = document.createElement('input');
    // fileInput.type = 'file';
    // fileInput.accept = 'image/*,video/*';
    // fileInput.onchange = async (e) => {
    //   const file = (e.target as HTMLInputElement).files?.[0];
    //   if (file && user) {
    //     const filePath = `stories/${user.id}/${Date.now()}-${file.name}`;
    //     const { url, error: uploadError } = await uploadFile('stories_bucket', file, filePath);
    //     if (uploadError) {
    //       alert(`Failed to upload story: ${uploadError}`);
    //       return;
    //     }
    //     const { error: insertError } = await supabase.from('stories').insert({
    //       user_id: user.id,
    //       content_url: url,
    //       content_type: file.type.startsWith('image') ? 'image' : 'video',
    //       caption: 'My new story!', // User provided caption
    //       expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    //     });
    //     if (insertError) {
    //       alert(`Failed to add story to DB: ${insertError.message}`);
    //     }
    //   }
    // };
    // fileInput.click();
  }

  if (isViewingStory && currentStory && currentStoryUser) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white"
          onClick={handleCloseStoryViewer}
        >
          <XCircle className="h-8 w-8" />
          <span className="sr-only">Close story</span>
        </Button>
        <div className="absolute top-4 left-4 flex items-center gap-2 text-white">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentStoryUser.avatar_url || "/placeholder-user.jpg"} />
            <AvatarFallback>{currentStoryUser.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <span className="font-semibold">{currentStoryUser.name || "Unknown User"}</span>
        </div>
        {currentStory.content_type === "image" ? (
          <img
            src={currentStory.content_url || "/placeholder.svg"}
            alt={currentStory.caption || "Story"}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        ) : (
          <video
            src={currentStory.content_url}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        )}
        {currentStory.caption && (
          <div className="absolute bottom-16 text-white bg-black/50 p-2 rounded-lg max-w-[80%] text-center">
            {currentStory.caption}
          </div>
        )}
        <div className="absolute bottom-4 flex gap-4">
          <Button variant="ghost" className="text-white">
            <Heart className="mr-2 h-5 w-5" /> Like
          </Button>
          <Button variant="ghost" className="text-white">
            <MessageCircle className="mr-2 h-5 w-5" /> Reply
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Status & Stories
          <Button variant="ghost" size="icon" onClick={handleAddStory}>
            <PlusCircle className="h-5 w-5" />
            <span className="sr-only">Add new story</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4">
        {loading && <div className="text-center text-gray-500">Loading stories...</div>}
        {error && <div className="text-center text-red-500">Error: {error}</div>}
        {!loading && userStories.length === 0 && (
          <div className="text-center text-gray-500">No stories available. Be the first to post!</div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {userStories.map((userStory) => (
            <div
              key={userStory.profile.id}
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => handleViewStory(userStory.stories[0], userStory.profile)}
            >
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-green-500">
                  <AvatarImage src={userStory.profile.avatar_url || "/placeholder-user.jpg"} />
                  <AvatarFallback>{userStory.profile.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                {userStory.stories.length > 1 && (
                  <span className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                    {userStory.stories.length}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-center line-clamp-1">
                {userStory.profile.name || "Unknown User"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
