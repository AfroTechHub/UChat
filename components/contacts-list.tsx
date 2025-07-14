"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/lib/supabase"
import { MobileMoneyModal } from "@/components/money/mobile-money-modal"

interface ContactsListProps {
  onSelectContact: (contact: Profile) => void
}

export function ContactsList({ onSelectContact }: ContactsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [contacts, setContacts] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobileMoneyModalOpen, setIsMobileMoneyModalOpen] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true)
      const { data, error } = await supabase.from("profiles").select("*").order("name", { ascending: true })
      if (error) {
        setError(error.message)
        setContacts([])
      } else {
        setContacts(data || [])
      }
      setLoading(false)
    }

    fetchContacts()

    const channel = supabase
      .channel("public:profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        fetchContacts() // Re-fetch contacts on any change
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSendMoneyClick = (contact: Profile) => {
    setSelectedRecipient({ id: contact.id, name: contact.name || contact.email || contact.phone || "Unknown" })
    setIsMobileMoneyModalOpen(true)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Contacts
          <Button variant="ghost" size="icon">
            <UserPlus className="h-5 w-5" />
            <span className="sr-only">Add new contact</span>
          </Button>
        </CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="w-full rounded-lg bg-gray-100 pl-9 focus:ring-0 focus:ring-offset-0 dark:bg-gray-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {loading && <div className="p-4 text-center text-gray-500">Loading contacts...</div>}
        {error && <div className="p-4 text-center text-red-500">Error: {error}</div>}
        {!loading && filteredContacts.length === 0 && (
          <div className="p-4 text-center text-gray-500">No contacts found.</div>
        )}
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredContacts.map((contact) => (
            <li
              key={contact.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <div className="flex items-center gap-3" onClick={() => onSelectContact(contact)}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contact.avatar_url || "/placeholder-user.jpg"} />
                  <AvatarFallback>{contact.name ? contact.name.charAt(0).toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{contact.name || contact.email || contact.phone || "Unknown User"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {contact.email || contact.phone || "No contact info"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleSendMoneyClick(contact)}>
                Send Money
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
      {selectedRecipient && (
        <MobileMoneyModal
          isOpen={isMobileMoneyModalOpen}
          onClose={() => setIsMobileMoneyModalOpen(false)}
          recipientId={selectedRecipient.id}
          recipientName={selectedRecipient.name}
        />
      )}
    </Card>
  )
}
