"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { MessageSquare, DollarSign, PhoneCall, Users, Clock, Paperclip } from "lucide-react"
import Link from "next/link"

export default function WebsiteLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-green-500 to-yellow-500 text-gray-800 dark:text-gray-100">
      {/* Header/Navbar (simple) */}
      <header className="w-full p-4 flex justify-between items-center bg-white/80 backdrop-blur-sm shadow-sm dark:bg-gray-900/80">
        <h1 className="text-2xl font-bold text-green-600">uChat</h1>
        <nav>
          <Link href="/" passHref>
            <Button
              variant="ghost"
              className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400"
            >
              Go to App
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center p-8 md:p-12 lg:p-20">
        <div className="max-w-4xl space-y-6">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-white drop-shadow-lg">
            uChat: Connect, Communicate, Transact.
          </h2>
          <p className="text-xl md:text-2xl text-white/90 font-medium">
            Your All-in-One Messaging App for Uganda. Instant chats, secure mobile money, and crystal-clear calls.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button className="bg-green-700 hover:bg-green-800 text-white text-lg px-8 py-6 rounded-full shadow-lg transition-all transform hover:scale-105">
              Download on Android
            </Button>
            <Button
              variant="outline"
              className="border-2 border-white text-white text-lg px-8 py-6 rounded-full bg-transparent hover:bg-white/20 transition-all transform hover:scale-105"
            >
              Download on iOS
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white dark:bg-gray-900 py-16 px-8 md:px-12 lg:px-20">
        <h3 className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-gray-100">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<MessageSquare className="h-10 w-10 text-green-600" />}
            title="Real-time Messaging"
            description="Enjoy instant, secure, and reliable chats with your friends and family across Uganda."
          />
          <FeatureCard
            icon={<DollarSign className="h-10 w-10 text-green-600" />}
            title="Mobile Money Integration"
            description="Send and receive money directly within your conversations, powered by local mobile money providers."
          />
          <FeatureCard
            icon={<PhoneCall className="h-10 w-10 text-green-600" />}
            title="Voice & Video Calls"
            description="Experience crystal-clear voice and video calls to stay connected, no matter the distance."
          />
          <FeatureCard
            icon={<Users className="h-10 w-10 text-green-600" />}
            title="Advanced Group Chats"
            description="Create and manage groups for seamless communication with your teams, family, and communities."
          />
          <FeatureCard
            icon={<Clock className="h-10 w-10 text-green-600" />}
            title="Ephemeral Messages"
            description="Send messages that automatically disappear after a set time, giving you more control over your privacy."
          />
          <FeatureCard
            icon={<Paperclip className="h-10 w-10 text-green-600" />}
            title="Easy File Sharing"
            description="Share photos, videos, documents, and other files effortlessly with rich previews."
          />
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-green-600 py-16 px-8 md:px-12 lg:px-20 text-center text-white">
        <h3 className="text-4xl font-bold mb-4">Ready to Connect?</h3>
        <p className="text-xl mb-8">Download uChat today and transform your communication experience!</p>
        <Button className="bg-white hover:bg-gray-100 text-green-700 text-lg px-10 py-6 rounded-full shadow-lg transition-all transform hover:scale-105">
          Get uChat Now!
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-950 text-gray-300 py-8 px-8 md:px-12 lg:px-20 text-center">
        <p>&copy; {new Date().getFullYear()} uChat. All rights reserved.</p>
        <p className="text-sm mt-2">Made with ❤️ for Uganda</p>
      </footer>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg transition-transform hover:scale-105 hover:shadow-xl">
      <div className="mb-4 p-3 rounded-full bg-green-100 dark:bg-green-900/30">{icon}</div>
      <CardTitle className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">{title}</CardTitle>
      <CardDescription className="text-gray-600 dark:text-gray-400">{description}</CardDescription>
    </Card>
  )
}
