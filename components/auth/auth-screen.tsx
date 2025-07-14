"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Chrome } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useSearchParams } from "next/navigation" // Import useSearchParams

export function AuthScreen() {
  const { login, signup, sendOTP, verifyOTP, sendPasswordResetEmail, updatePassword, signInWithGoogle, isLoading } =
    useAuth()
  const searchParams = useSearchParams() // Get URL search parameters

  const [authMode, setAuthMode] = useState<
    "login" | "signup" | "otp_request" | "otp_verify" | "forgot_password_request" | "reset_password"
  >("login")
  const [emailOrPhone, setEmailOrPhone] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Check URL for password reset token on component mount
  useEffect(() => {
    const type = searchParams.get("type")
    const accessToken = searchParams.get("access_token")

    if (type === "recovery" && accessToken) {
      // Supabase automatically sets the session when access_token is present in URL
      // We just need to switch to the reset password form
      setAuthMode("reset_password")
      setMessage({
        type: "success",
        text: "Enter your new password below.",
      })
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    let result: { success: boolean; error?: string }

    switch (authMode) {
      case "login":
        result = await login(emailOrPhone, password)
        break
      case "signup":
        result = await signup(emailOrPhone, password, name)
        break
      case "otp_request":
        result = await sendOTP(emailOrPhone)
        break
      case "otp_verify":
        result = await verifyOTP(emailOrPhone, otp)
        break
      case "forgot_password_request":
        result = await sendPasswordResetEmail(emailOrPhone)
        break
      case "reset_password":
        if (newPassword !== confirmNewPassword) {
          setMessage({ type: "error", text: "New passwords do not match." })
          return
        }
        if (newPassword.length < 6) {
          setMessage({ type: "error", text: "Password must be at least 6 characters long." })
          return
        }
        result = await updatePassword(newPassword)
        if (result.success) {
          // After successful password reset, redirect to login
          setAuthMode("login")
          setEmailOrPhone("")
          setPassword("")
        }
        break
      default:
        return
    }

    if (result.success) {
      setMessage({ type: "success", text: result.error || "Success!" })
      if (authMode === "otp_request") {
        setAuthMode("otp_verify")
      }
      // For password reset request, stay on the same screen but show success
      if (authMode === "forgot_password_request") {
        setEmailOrPhone("") // Clear email field
      }
    } else {
      setMessage({ type: "error", text: result.error || "An unexpected error occurred." })
    }
  }

  const renderForm = () => {
    switch (authMode) {
      case "login":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="emailOrPhone">Email or Phone</Label>
              <Input
                id="emailOrPhone"
                type="text"
                placeholder="email@example.com or +2567XXXXXXXX"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Login
            </Button>
            <Button variant="link" className="w-full" onClick={() => setAuthMode("signup")} disabled={isLoading}>
              Don't have an account? Sign Up
            </Button>
            <Button variant="link" className="w-full" onClick={() => setAuthMode("otp_request")} disabled={isLoading}>
              Login with OTP
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center gap-2 bg-transparent"
              onClick={async () => {
                setMessage(null)
                const result = await signInWithGoogle()
                if (!result.success) {
                  setMessage({ type: "error", text: result.error || "Failed to initiate Google login." })
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Sign in with Google
            </Button>
            <Button
              variant="link"
              className="w-full text-sm text-gray-500"
              onClick={() => setAuthMode("forgot_password_request")}
              disabled={isLoading}
            >
              Forgot Password?
            </Button>
          </>
        )
      case "signup":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailOrPhone">Email or Phone</Label>
              <Input
                id="emailOrPhone"
                type="text"
                placeholder="email@example.com or +2567XXXXXXXX"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign Up
            </Button>
            <Button variant="link" className="w-full" onClick={() => setAuthMode("login")} disabled={isLoading}>
              Already have an account? Login
            </Button>
          </>
        )
      case "otp_request":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="emailOrPhone">Email or Phone</Label>
              <Input
                id="emailOrPhone"
                type="text"
                placeholder="email@example.com or +2567XXXXXXXX"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send OTP
            </Button>
            <Button variant="link" className="w-full" onClick={() => setAuthMode("login")} disabled={isLoading}>
              Back to Login
            </Button>
          </>
        )
      case "otp_verify":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="otp">OTP</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify OTP
            </Button>
            <Button variant="link" className="w-full" onClick={() => setAuthMode("otp_request")} disabled={isLoading}>
              Resend OTP
            </Button>
            <Button variant="link" className="w-full" onClick={() => setAuthMode("login")} disabled={isLoading}>
              Back to Login
            </Button>
          </>
        )
      case "forgot_password_request":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="emailOrPhone">Email or Phone</Label>
              <Input
                id="emailOrPhone"
                type="text"
                placeholder="email@example.com or +2567XXXXXXXX"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Reset Link
            </Button>
            <Button variant="link" className="w-full" onClick={() => setAuthMode("login")} disabled={isLoading}>
              Back to Login
            </Button>
          </>
        )
      case "reset_password":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset Password
            </Button>
            <Button variant="link" className="w-full" onClick={() => setAuthMode("login")} disabled={isLoading}>
              Back to Login
            </Button>
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">UChat Pro</CardTitle>
          <CardDescription>
            {authMode === "login" && "Login to your account"}
            {authMode === "signup" && "Create a new account"}
            {authMode === "otp_request" && "Enter your email or phone to receive an OTP"}
            {authMode === "otp_verify" && "Verify your OTP"}
            {authMode === "forgot_password_request" && "Request a password reset link"}
            {authMode === "reset_password" && "Set your new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div
                className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
              >
                {message.text}
              </div>
            )}
            {renderForm()}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
