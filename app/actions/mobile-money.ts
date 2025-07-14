"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function processMobileMoneyTransaction(formData: FormData) {
  const recipientId = formData.get("recipientId") as string
  const amount = Number.parseFloat(formData.get("amount") as string)
  const pin = formData.get("pin") as string // Extract PIN

  if (!recipientId || isNaN(amount) || amount <= 0 || !pin) {
    return { success: false, message: "Invalid recipient, amount, or missing PIN." }
  }

  // Basic PIN validation (e.g., 4 digits). In a real app, this would be handled securely by the payment gateway.
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, message: "Invalid PIN format. Must be 4 digits." }
  }

  const { data: senderUser, error: senderError } = await supabase.auth.getUser()
  if (senderError || !senderUser.user) {
    return { success: false, message: "User not authenticated." }
  }

  const senderId = senderUser.user.id

  // In a real application, you would integrate with a Mobile Money API here.
  // This is a placeholder for the actual transaction logic.
  console.log(
    `Simulating Mobile Money transaction:
    Sender ID: ${senderId}
    Recipient ID: ${recipientId}
    Amount: ${amount} UGX
    PIN: ${pin.replace(/./g, "*")}`, // Mask PIN for logs
  )

  try {
    // Simulate a delay for the transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate success or failure based on some condition (e.g., amount)
    if (amount > 1000000) {
      // Simulate a large transaction failing
      return { success: false, message: "Transaction failed: Amount exceeds daily limit." }
    }

    // Record the transaction in your database (e.g., a 'transactions' table)
    const { error: insertError } = await supabase.from("transactions").insert({
      sender_id: senderId,
      recipient_id: recipientId,
      amount: amount,
      currency: "UGX",
      type: "mobile_money",
      status: "completed", // Or 'pending', 'failed'
      // Do NOT store PIN in DB
    })

    if (insertError) {
      console.error("Error recording transaction:", insertError)
      return { success: false, message: "Transaction failed to record." }
    }

    revalidatePath("/dashboard") // Revalidate any relevant pages

    return { success: true, message: `Successfully sent ${amount} UGX to ${recipientId}!` }
  } catch (e: any) {
    console.error("Mobile Money transaction error:", e.message)
    return { success: false, message: `An unexpected error occurred: ${e.message}` }
  }
}
