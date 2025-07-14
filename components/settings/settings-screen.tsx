"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { PushNotifications } from "@/components/features/push-notifications"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth/auth-provider"
import { HelpCircle, LogOut } from "lucide-react"

interface SettingsScreenProps {
  onClose: () => void
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordChangeMessage(null)
    setIsChangingPassword(true)

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeMessage({ type: "error", text: "New passwords do not match." })
      setIsChangingPassword(false)
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordChangeMessage({ type: "error", text: "New password must be at least 6 characters long." })
      setIsChangingPassword(false)
      return
    }

    // Supabase client-side password update does not require old password for authenticated users
    // It relies on the user being logged in. If you need old password validation, it would be a server-side check.
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setIsChangingPassword(false)

    if (error) {
      console.error("Error updating password:", error)
      setPasswordChangeMessage({ type: "error", text: `Failed to update password: ${error.message}` })
    } else {
      setPasswordChangeMessage({ type: "success", text: "Password updated successfully!" })
      setOldPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    }
  }

  const handleLogout = async () => {
    await signOut()
    onClose() // Close settings after logout
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>Manage your application preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode">Dark Mode</Label>
            <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={toggleDarkMode} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <PushNotifications />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enable push notifications to receive alerts for new messages and calls.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Account</h3>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => console.log("Change Password")}>
              Change Password
            </Button>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => console.log("Update Profile")}>
              Update Profile
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => console.log("Delete Account")}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">General</CardTitle>
          <CardDescription>Learn more about uChat and get support.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start bg-transparent">
            <HelpCircle className="w-5 h-5 mr-2" />
            About uChat
          </Button>
          <Button variant="outline" className="w-full justify-start bg-transparent">
            Help & Support
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Logout</CardTitle>
          <CardDescription>Sign out of your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white flex items-center space-x-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
            Close Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
