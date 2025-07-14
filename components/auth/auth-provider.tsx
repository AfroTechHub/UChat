"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseProfile } from "@/lib/supabase"
import type { User as SupabaseAuthUser } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: SupabaseProfile | null
  loading: boolean
  login: (emailOrPhone: string, password?: string) => Promise<{ success: boolean; error?: string }>
  signup: (emailOrPhone: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  sendOTP: (emailOrPhone: string) => Promise<{ success: boolean; error?: string }>
  verifyOTP: (emailOrPhone: string, token: string) => Promise<{ success: boolean; error?: string }>
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false) // For specific auth actions
  const router = useRouter()

  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseAuthUser) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", supabaseUser.id).single()

    if (error) {
      console.error("Error fetching user profile:", error)
      // If profile doesn't exist, create it
      if (error.code === "PGRST116" || error.message.includes("rows not found")) {
        // No rows found
        console.log("Profile not found, creating new one.")
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: supabaseUser.id,
            email: supabaseUser.email,
            phone: supabaseUser.phone,
            name: supabaseUser.email?.split("@")[0] || supabaseUser.phone || "New User", // Default name
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating profile:", createError)
          return null
        }
        return newProfile
      }
      return null
    }
    return data
  }, [])

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user)
        setUser(profile)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Initial check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user)
        setUser(profile)
      }
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  const login = useCallback(
    async (emailOrPhone: string, password?: string) => {
      setIsLoading(true)
      let authResponse
      if (password) {
        const isEmail = emailOrPhone.includes("@")
        authResponse = await supabase.auth.signInWithPassword(
          isEmail ? { email: emailOrPhone, password } : { phone: emailOrPhone, password },
        )
      } else {
        // Assume OTP login (email or phone)
        if (emailOrPhone.includes("@")) {
          authResponse = await supabase.auth.signInWithOtp({
            email: emailOrPhone,
          })
        } else {
          authResponse = await supabase.auth.signInWithOtp({
            phone: emailOrPhone,
          })
        }
      }

      setIsLoading(false)
      if (authResponse.error) {
        console.error("Login error:", authResponse.error.message)
        return { success: false, error: authResponse.error.message }
      }
      if (authResponse.data.user) {
        const profile = await fetchUserProfile(authResponse.data.user)
        setUser(profile)
        return { success: true }
      }
      return { success: true, error: "Check your email/phone for a magic link or OTP." } // For OTP flow, user is not immediately set
    },
    [fetchUserProfile],
  )

  const signup = useCallback(async (emailOrPhone: string, password: string, name: string) => {
    setIsLoading(true)

    let authResponse
    if (emailOrPhone.includes("@")) {
      authResponse = await supabase.auth.signUp({
        email: emailOrPhone,
        password,
        data: { name },
      })
    } else {
      authResponse = await supabase.auth.signUp({
        phone: emailOrPhone,
        password,
        data: { name },
      })
    }

    setIsLoading(false)

    if (authResponse.error) {
      console.error("Signup error:", authResponse.error.message)
      return { success: false, error: authResponse.error.message }
    }

    return {
      success: true,
      error: "Check your email or phone to confirm your account, then log in.",
    }
  }, [])

  const sendOTP = useCallback(async (emailOrPhone: string) => {
    setIsLoading(true)
    let response
    if (emailOrPhone.includes("@")) {
      response = await supabase.auth.signInWithOtp({ email: emailOrPhone })
    } else {
      response = await supabase.auth.signInWithOtp({ phone: emailOrPhone })
    }
    setIsLoading(false)
    if (response.error) {
      console.error("Send OTP error:", response.error.message)
      return { success: false, error: response.error.message }
    }
    return { success: true, error: "OTP sent! Check your email or phone." }
  }, [])

  const verifyOTP = useCallback(
    async (emailOrPhone: string, token: string) => {
      setIsLoading(true)
      let response
      if (emailOrPhone.includes("@")) {
        response = await supabase.auth.verifyOtp({ email: emailOrPhone, token, type: "email" })
      } else {
        response = await supabase.auth.verifyOtp({ phone: emailOrPhone, token, type: "sms" })
      }
      setIsLoading(false)
      if (response.error) {
        console.error("Verify OTP error:", response.error.message)
        return { success: false, error: response.error.message }
      }
      if (response.data.user) {
        const profile = await fetchUserProfile(response.data.user)
        setUser(profile)
        return { success: true }
      }
      return { success: false, error: "OTP verification failed." }
    },
    [fetchUserProfile],
  )

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    setIsLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`, // Redirect to a specific page after email click
    })
    setIsLoading(false)
    if (error) {
      console.error("Password reset email error:", error.message)
      return { success: false, error: error.message }
    }
    return { success: true, error: "Password reset link sent to your email!" }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsLoading(false)
    if (error) {
      console.error("Update password error:", error.message)
      return { success: false, error: error.message }
    }
    return { success: true, error: "Your password has been updated successfully!" }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signOut()
    setIsLoading(false)
    if (error) {
      console.error("Logout error:", error.message)
    } else {
      setUser(null)
      router.push("/") // Redirect to home/login page after sign out
    }
  }, [router])

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`, // Redirect to home after successful login
      },
    })
    setIsLoading(false)
    if (error) {
      console.error("Google OAuth error:", error.message)
      return { success: false, error: error.message }
    }
    // For OAuth, the user is redirected, so no user data is returned immediately here.
    // The onAuthStateChange listener will handle setting the user after redirect.
    return { success: true, error: "Redirecting to Google for authentication..." }
  }, [])

  const value = {
    user,
    loading,
    login,
    signup,
    sendOTP,
    verifyOTP,
    sendPasswordResetEmail,
    updatePassword,
    logout,
    signInWithGoogle,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
