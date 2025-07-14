"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
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
  const [provider, setProvider] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  const providers = [
    {
      value: "mtn",
      label: "MTN MoMo",
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      fees: "1.5%",
      limits: "UGX 5,000 - 4,000,000",
    },
    {
      value: "airtel",
      label: "Airtel Money",
      color: "bg-red-500",
      textColor: "text-red-700",
      fees: "1.2%",
      limits: "UGX 5,000 - 3,000,000",
    },
    {
      value: "stanbic",
      label: "Stanbic Bank",
      color: "bg-blue-500",
      textColor: "text-blue-700",
      fees: "2.0%",
      limits: "UGX 10,000 - 10,000,000",
    },
  ]

  const quickAmounts = [
    { value: "5000", label: "5K" },
    { value: "10000", label: "10K" },
    { value: "20000", label: "20K" },
    { value: "50000", label: "50K" },
    { value: "100000", label: "100K" },
    { value: "200000", label: "200K" },
  ]

  const calculateFees = () => {
    if (!amount || !provider) return 0
    const selectedProvider = providers.find((p) => p.value === provider)
    if (!selectedProvider) return 0
    const feeRate = Number.parseFloat(selectedProvider.fees) / 100
    return Math.round(Number.parseInt(amount) * feeRate)
  }

  const resetTransaction = () => {
    setAmount("")
    setPhoneNumber("")
    setPin("")
    setProvider("") // Reset provider as well
  }

  useEffect(() => {
    if (!isOpen) {
      resetTransaction()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)

    const formData = new FormData()
    formData.append("recipientId", recipientId)
    formData.append("amount", amount)
    formData.append("pin", pin)
    formData.append("provider", provider)
    formData.append("phoneNumber", phoneNumber)

    const result = await processMobileMoneyTransaction(formData)

    if (result.success) {
      setMessage({ type: "success", text: result.message || "Transaction successful!" })
      setAmount("")
      setPhoneNumber("")
      setPin("")
    } else {
      setMessage({ type: "error", text: result.message || "Transaction failed. Please try again." })
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold mb-2">Processing Transaction</h3>
            <p className="text-gray-600 mb-4">Please wait while we process your payment...</p>
            <Progress value={66} className="w-full mb-4" />
            <div className="space-y-2 text-sm text-gray-500">
              <p>✓ Validating recipient</p>
              <p>✓ Checking balance</p>
              <p className="text-green-600">⏳ Processing payment...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (message && message.type === "success") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold mb-2 text-green-600">Transaction Successful!</h3>
            <p className="text-gray-600 mb-6">UGX {amount.toLocaleString()} has been sent successfully</p>

            <Card className="mb-6">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-semibold">UGX {amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fees:</span>
                    <span>UGX {calculateFees().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipient:</span>
                    <span>{recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction ID:</span>
                    <span className="font-mono">{message.text.split(" ")[2]}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Button onClick={resetTransaction} className="w-full">
                Send Another
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (message && message.type === "error") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-semibold mb-2 text-red-600">Transaction Failed</h3>
            <p className="text-gray-600 mb-6">{message.text}</p>

            <div className="space-y-2">
              <Button onClick={resetTransaction} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💰 Mobile Money to {recipientName}
            <Badge className="bg-green-100 text-green-800">Secure</Badge>
          </DialogTitle>
          <DialogDescription>Enter the amount and your PIN to complete the transaction.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="airtime">Airtime</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label>Mobile Money Provider</Label>
                <div className="grid grid-cols-1 gap-2">
                  {providers.map((p) => (
                    <Card
                      key={p.value}
                      className={`cursor-pointer transition-all ${
                        provider === p.value ? "ring-2 ring-green-500 bg-green-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setProvider(p.value)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${p.color} rounded-full`}></div>
                            <div>
                              <p className="font-medium">{p.label}</p>
                              <p className="text-xs text-gray-500">Fees: {p.fees}</p>
                            </div>
                          </div>
                          {provider === p.value && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Limits: {p.limits}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <input type="hidden" name="provider" value={provider} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Recipient Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="+256 700 123 456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (UGX)</Label>
                <Input
                  id="amount"
                  name="amount"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => e.target.value.length <= 10 && setAmount(e.target.value)}
                  type="number"
                  required
                  disabled={isLoading}
                  min="100"
                  step="100"
                />
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt.value}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(amt.value)}
                      className="text-xs"
                      type="button"
                      disabled={isLoading}
                    >
                      {amt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {amount && provider && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-2">Transaction Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span>UGX {Number.parseInt(amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction Fee:</span>
                        <span>UGX {calculateFees().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total:</span>
                        <span>UGX {(Number.parseInt(amount) + calculateFees()).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="pin">Mobile Money PIN</Label>
                <Input
                  id="pin"
                  name="pin"
                  type="password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => e.target.value.length <= 4 && setPin(e.target.value)}
                  maxLength={4}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                disabled={!amount || !phoneNumber || !provider || !pin || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Send ${amount ? `UGX ${Number.parseInt(amount).toLocaleString()}` : "Money"}`
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="request" className="space-y-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="font-semibold mb-2">Request Money</h3>
              <p className="text-gray-500 mb-4">Ask contacts to send you money</p>
              <Button className="w-full">Create Money Request</Button>
            </div>
          </TabsContent>

          <TabsContent value="airtime" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input placeholder="+256 700 123 456" />
              </div>
              <div className="space-y-2">
                <Label>Airtime Amount (UGX)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["1000", "2000", "5000", "10000", "20000", "50000"].map((amt) => (
                    <Button key={amt} variant="outline" size="sm" type="button">
                      {Number.parseInt(amt).toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                Buy Airtime
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function MobileMoneyModalFeature() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Money Modal</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This component represents the mobile money modal functionality.</p>
        <p>The main modal is handled by `components/money/mobile-money-modal.tsx`.</p>
      </CardContent>
    </Card>
  )
}
