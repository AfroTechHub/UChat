import { createClient } from "@supabase/supabase-js"
import type { User as SupabaseAuthUser } from "@supabase/supabase-js"

// Ensure these are loaded from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for your database schema
// Extend SupabaseAuthUser with your public.profiles table fields
export interface Profile extends SupabaseAuthUser {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  bio: string | null
  status: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id?: string // For direct messages
  group_id?: string // For group messages
  content: string
  message_type: "text" | "image" | "video" | "audio" | "file" // Added file types
  created_at: string
  expires_at?: string | null
  file_url?: string | null // New: URL to the uploaded file
  file_type?: string | null // New: MIME type of the file (e.g., 'image/jpeg', 'application/pdf')
}

export interface Group {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  created_by: string
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  role: "admin" | "member"
  joined_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface Transaction {
  id: string
  sender_id: string
  recipient_id: string
  amount: number
  currency: string
  type: string // e.g., 'mobile_money'
  status: string // e.g., 'completed', 'pending', 'failed'
  created_at: string
}

// Extend the User type from Supabase to include profile fields
// This is a common pattern to have a unified user object
declare module "@supabase/supabase-js" {
  interface User {
    name?: string
    bio?: string
    avatar_url?: string
    phone?: string
    status?: "online" | "offline" | "busy"
  }
}

// Define types for your database tables
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string // UUID from auth.users
          username: string | null
          name: string | null
          email: string | null
          phone: string | null
          avatar_url: string | null
          status: string | null
          last_seen: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string // UUID from auth.users
          username?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          status?: string | null
          last_seen?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          status?: string | null
          last_seen?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      chats: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          type: "direct" | "group"
          name: string | null // For group chats
          description: string | null // For group chats
          avatar_url: string | null // For group chats
          created_by: string // user_id of the creator for groups
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          type: "direct" | "group"
          name?: string | null
          description?: string | null
          avatar_url?: string | null
          created_by?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          type?: "direct" | "group"
          name?: string | null
          description?: string | null
          avatar_url?: string | null
          created_by?: string
        }
      }
      chat_members: {
        Row: {
          chat_id: string
          user_id: string
          joined_at: string
          role: "member" | "admin" // For group chats
          last_read_message_id: string | null
        }
        Insert: {
          chat_id: string
          user_id: string
          joined_at?: string
          role?: "member" | "admin"
          last_read_message_id?: string | null
        }
        Update: {
          chat_id?: string
          user_id?: string
          joined_at?: string
          role?: "member" | "admin"
          last_read_message_id?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          content: string
          type: "text" | "image" | "video" | "audio" | "file" | "location" | "payment" | "system"
          created_at: string
          updated_at: string | null
          is_edited: boolean
          is_deleted: boolean
          file_url: string | null
          file_name: string | null
          file_size: number | null
          latitude: number | null
          longitude: number | null
          payment_amount: number | null
          payment_currency: string | null
          reply_to: string | null // message_id being replied to
          reactions: Json | null // JSONB for reactions { "emoji": ["user_id1", "user_id2"] }
          expires_at: string | null // New column for ephemeral messages
        }
        Insert: {
          id?: string
          chat_id: string
          sender_id: string
          content: string
          type?: "text" | "image" | "video" | "audio" | "file" | "location" | "payment" | "system"
          created_at?: string
          updated_at?: string | null
          is_edited?: boolean
          is_deleted?: boolean
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          latitude?: number | null
          longitude?: number | null
          payment_amount?: number | null
          payment_currency?: string | null
          reply_to?: string | null
          reactions?: Json | null
          expires_at?: string | null // New column for ephemeral messages
        }
        Update: {
          id?: string
          chat_id?: string
          sender_id?: string
          content?: string
          type?: "text" | "image" | "video" | "audio" | "file" | "location" | "payment" | "system"
          created_at?: string
          updated_at?: string | null
          is_edited?: boolean
          is_deleted?: boolean
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          latitude?: number | null
          longitude?: number | null
          payment_amount?: number | null
          payment_currency?: string | null
          reply_to?: string | null
          reactions?: Json | null
          expires_at?: string | null // New column for ephemeral messages
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
      }
      call_signals: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          chat_id: string | null
          type: "offer" | "answer" | "candidate" | "call_end" | "call_request" | "call_accept" | "call_decline"
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          chat_id?: string | null
          type: "offer" | "answer" | "candidate" | "call_end" | "call_request" | "call_accept" | "call_decline"
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          chat_id?: string | null
          type?: "offer" | "answer" | "candidate" | "call_end" | "call_request" | "call_accept" | "call_decline"
          payload?: Json
          created_at?: string
        }
      }
      mobile_money_transactions: {
        Row: {
          id: string
          sender_id: string
          recipient_phone: string
          amount: number
          currency: string
          provider: string
          message: string | null
          status: "pending" | "completed" | "failed"
          transaction_ref: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_phone: string
          amount: number
          currency?: string
          provider: string
          message?: string | null
          status?: "pending" | "completed" | "failed"
          transaction_ref?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_phone?: string
          amount?: number
          currency?: string
          provider?: string
          message?: string | null
          status?: "pending" | "completed" | "failed"
          transaction_ref?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      status_updates: {
        Row: {
          id: string
          user_id: string
          content: string | null
          media_url: string | null
          media_type: "image" | "video" | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content?: string | null
          media_url?: string | null
          media_type?: "image" | "video" | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string | null
          media_url?: string | null
          media_type?: "image" | "video" | null
          expires_at?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          amount: number
          currency: string
          type: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          amount: number
          currency: string
          type: string
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          amount?: number
          currency?: string
          type?: string
          status?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Export types for easier access
export type Chat = Database["public"]["Tables"]["chats"]["Row"]
export type OriginalMessage = Database["public"]["Tables"]["messages"]["Row"]
export type ChatMember = Database["public"]["Tables"]["chat_members"]["Row"]
export type OriginalPushSubscription = Database["public"]["Tables"]["push_subscriptions"]["Row"]
export type CallSignal = Database["public"]["Tables"]["call_signals"]["Row"]
export type OriginalMobileMoneyTransaction = Database["public"]["Tables"]["mobile_money_transactions"]["Row"]
export type StatusUpdate = Database["public"]["Tables"]["status_updates"]["Row"]
export type OriginalTransaction = Database["public"]["Tables"]["transactions"]["Row"]
