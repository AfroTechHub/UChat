// This file is deprecated as the logic has been moved to app/actions/mobile-money.ts
// Keeping it for reference if needed, but it's not actively used.

// import { supabase } from "./supabase"

// export async function sendMobileMoney(recipientPhone: string, amount: number) {
//   // In a real application, you would integrate with a Mobile Money API here.
//   // This is a placeholder for the actual transaction logic.

//   console.log(`Attempting to send ${amount} UGX to ${recipientPhone} via Mobile Money...`)

//   // Simulate API call
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       const success = Math.random() > 0.2 // 80% chance of success
//       if (success) {
//         resolve({ success: true, message: "Mobile Money transaction successful!" })
//       } else {
//         resolve({ success: false, message: "Mobile Money transaction failed. Please try again." })
//       }
//     }, 2000) // Simulate network delay
//   })
// }
