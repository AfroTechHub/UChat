import { Loader2 } from "lucide-react"

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-500 to-yellow-500 text-white">
      <Loader2 className="h-16 w-16 animate-spin text-white" />
      <p className="mt-4 text-xl font-semibold">Loading uChat...</p>
      <p className="text-sm text-gray-200">Please wait a moment.</p>
    </div>
  )
}
