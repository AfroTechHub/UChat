"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircleMore } from "lucide-react"

interface WelcomeScreenProps {
  onGetStarted: () => void
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-500 to-yellow-500 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <MessageCircleMore className="mx-auto h-20 w-20 text-green-600 mb-4" />
          <CardTitle className="text-4xl font-bold text-gray-800">Welcome to uChat!</CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Connect with friends and family, send money, and share your moments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-700">
            uChat is your all-in-one messaging solution for Uganda. Enjoy seamless communication, secure mobile money
            transactions, and real-time updates.
          </p>
          <Button
            onClick={onGetStarted}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 rounded-lg shadow-md transition-colors"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
