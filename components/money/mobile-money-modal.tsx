"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { processMobileMoneyTransaction } from "@/app/actions/mobile-money"

interface MobileMoneyModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId: string
  recipientName: string
}

export function MobileMoneyModal({ isOpen, onClose, recipientId, recipientName }: MobileMoneyModalProps) {
  const [amount, setAmount] = useState("")
  const [pin, setPin] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)

    const formData = new FormData()
    formData.append("recipientId", recipientId)
    formData.append("amount", amount)
    formData.append("pin", pin)

    const result = await processMobileMoneyTransaction(formData)

    if (result.success) {
      setMessage({ type: "success", text: result.message || "Transaction successful!" })
      setAmount("")
      setPin("")
      // Optionally close modal after a delay or on user action
    } else {
      setMessage({ type: "error", text: result.message || "Transaction failed. Please try again." })
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Mobile Money to {recipientName}</DialogTitle>
          <DialogDescription>Enter the amount and your PIN to complete the transaction.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount (UGX)
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              required
              min="100"
              step="100"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pin" className="text-right">
              PIN
            </Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="col-span-3"
              required
              maxLength={4}
              disabled={isLoading}
            />
          </div>
          {message && (
            <div
              className={`col-span-4 text-center text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
            >
              {message.text}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Money"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
