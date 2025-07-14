"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { LogOut } from "lucide-react"

export function ProfileSection() {
  const { user, logout, isLoading } = useAuth()

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Please log in to view your profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>No user data available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-2xl">My Profile</CardTitle>
          <CardDescription>Manage your account information.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} disabled={isLoading}>
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pt-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={user.avatar_url || "/placeholder-user.jpg"} alt={user.name || "User Avatar"} />
          <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : "U"}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-xl font-semibold">{user.name || "User"}</h3>
          {user.email && <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>}
          {user.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</p>}
        </div>
        <div className="grid w-full gap-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">User ID:</span>
            <span>{user.id}</span>
          </div>
          {user.created_at && (
            <div className="flex justify-between">
              <span className="font-medium">Member Since:</span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
