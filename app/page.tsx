"use client"

import { useState, useEffect } from "react"
import { AuthScreen } from "@/components/auth/auth-screen"
import { MainApp } from "@/components/main-app"
import { LoadingScreen } from "@/components/loading-screen"
import { WelcomeScreen } from "@/components/welcome-screen"
import { useAuth } from "@/components/auth/auth-provider" // Ensure useAuth is imported

export default function Home() {
  const { user, loading } = useAuth() // Only need user and loading here
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    // If user is already logged in, skip welcome screen
    if (user && !loading) {
      setShowWelcome(false)
    }
  }, [user, loading])

  const handleGetStarted = () => {
    setShowWelcome(false)
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <MainApp />
  }

  if (showWelcome) {
    return <WelcomeScreen onGetStarted={handleGetStarted} />
  }

  // AuthScreen now handles its own auth logic and messages
  return <AuthScreen />
}
