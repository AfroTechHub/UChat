"use client"

import { useState, useCallback } from "react"

interface UseMobileMoneyModalResult {
  isModalOpen: boolean
  openModal: (recipientId: string, recipientName: string) => void
  closeModal: () => void
  recipientInfo: { id: string; name: string } | null
}

export function useMobileMoneyModal(): UseMobileMoneyModalResult {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recipientInfo, setRecipientInfo] = useState<{ id: string; name: string } | null>(null)

  const openModal = useCallback((id: string, name: string) => {
    setRecipientInfo({ id, name })
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setRecipientInfo(null)
  }, [])

  return {
    isModalOpen,
    openModal,
    closeModal,
    recipientInfo,
  }
}
