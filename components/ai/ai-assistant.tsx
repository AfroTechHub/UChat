"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Bot, Loader2 } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
}

export function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { id: Date.now().toString(), content: input, role: "user" }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"), // Using gpt-4o model
        prompt: input,
        // You can add a system prompt here to define the AI's persona
        // system: "You are a helpful assistant for a Ugandan messaging app. Provide concise and relevant information."
      })

      const aiMessage: Message = { id: Date.now().toString() + "-ai", content: text, role: "assistant" }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Error generating AI response:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-error",
          content: "Sorry, I couldn't generate a response. Please try again.",
          role: "assistant",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6" /> AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Bot className="h-16 w-16 mb-4" />
            <p className="text-lg">How can I help you today?</p>
            <p className="text-sm">Ask me anything!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[70%] rounded-lg p-3 text-sm ${
                msg.role === "user"
                  ? "bg-green-500 text-white rounded-br-none"
                  : "bg-gray-200 text-gray-900 rounded-bl-none dark:bg-gray-800 dark:text-gray-50"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-lg p-3 text-sm bg-gray-200 dark:bg-gray-800">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </CardContent>
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t p-4">
        <Input
          placeholder="Ask the AI assistant..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
          <Send className="h-5 w-5" />
          <span className="sr-only">Send message to AI</span>
        </Button>
      </form>
    </Card>
  )
}
