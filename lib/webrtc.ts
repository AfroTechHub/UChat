"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { create } from "zustand"

interface WebRTCHook {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  startCall: (targetUserId: string, isVideo: boolean) => Promise<void>
  acceptCall: (offer: RTCSessionDescriptionInit) => Promise<void>
  endCall: () => void
  toggleMic: () => void
  toggleVideo: () => void
  callState: "idle" | "ringing" | "connecting" | "in-call" | "ended"
  incomingCall: { from: string; offer: RTCSessionDescriptionInit; isVideo: boolean } | null
  isMicMuted: boolean
  isVideoOff: boolean
}

interface RTCSessionDescriptionInit {
  sdp?: string
  type?: RTCSessionDescriptionInit["type"]
}

interface RTCIceCandidateInit {
  candidate?: string
  sdpMid?: string
  sdpMLineIndex?: number
}

class SignalingClient {
  private ws: WebSocket | null = null
  private onMessageCallback: ((message: any) => void) | null = null

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.ws.onopen = () => console.log("WebSocket connected")
    this.ws.onclose = () => console.log("WebSocket disconnected")
    this.ws.onerror = (error) => console.error("WebSocket error:", error)
    this.ws.onmessage = (event) => {
      if (this.onMessageCallback) {
        try {
          const message = JSON.parse(event.data)
          this.onMessageCallback(message)
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e)
        }
      }
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("WebSocket not open. Message not sent:", message)
    }
  }

  onMessage(callback: (message: any) => void) {
    this.onMessageCallback = callback
  }

  close() {
    this.ws?.close()
  }
}

let peerConnection: RTCPeerConnection | null = null
let localStream: MediaStream | null = null

// Configuration for STUN/TURN servers (replace with your own production servers)
const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Add TURN servers for better connectivity in restrictive networks
    // { urls: "turn:your-turn-server.com:3478", username: "user", credential: "password" },
  ],
}

/**
 * Initializes the WebRTC PeerConnection.
 * @param onLocalStream - Callback to receive the local media stream.
 * @param onRemoteStream - Callback to receive the remote media stream.
 * @param onIceCandidate - Callback to send ICE candidates to the signaling server.
 * @returns The initialized RTCPeerConnection.
 */
export function initializeWebRTC(
  onLocalStream: (stream: MediaStream) => void,
  onRemoteStream: (stream: MediaStream) => void,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
): RTCPeerConnection {
  if (peerConnection) {
    console.warn("PeerConnection already initialized. Returning existing instance.")
    return peerConnection
  }

  peerConnection = new RTCPeerConnection(iceServers)

  // Event handler for when a remote stream is added
  peerConnection.ontrack = (event) => {
    console.log("Remote stream added:", event.streams[0])
    onRemoteStream(event.streams[0])
  }

  // Event handler for gathering ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("Local ICE candidate:", event.candidate)
      onIceCandidate(event.candidate)
    }
  }

  // Get local media stream (audio and video)
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      localStream = stream
      onLocalStream(stream)
      stream.getTracks().forEach((track) => peerConnection?.addTrack(track, stream))
    })
    .catch((error) => {
      console.error("Error accessing media devices:", error)
    })

  return peerConnection
}

/**
 * Creates an SDP offer.
 * @param pc - The RTCPeerConnection.
 * @returns The RTCSessionDescriptionInit for the offer.
 */
export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit | undefined> {
  try {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    console.log("Created offer:", offer)
    return offer
  } catch (error) {
    console.error("Error creating offer:", error)
    return undefined
  }
}

/**
 * Creates an SDP answer.
 * @param pc - The RTCPeerConnection.
 * @returns The RTCSessionDescriptionInit for the answer.
 */
export async function createAnswer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit | undefined> {
  try {
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    console.log("Created answer:", answer)
    return answer
  } catch (error) {
    console.error("Error creating answer:", error)
    return undefined
  }
}

/**
 * Sets the remote description (offer or answer).
 * @param pc - The RTCPeerConnection.
 * @param description - The RTCSessionDescription.
 */
export async function setRemoteDescription(pc: RTCPeerConnection, description: RTCSessionDescription): Promise<void> {
  try {
    await pc.setRemoteDescription(description)
    console.log("Set remote description:", description)
  } catch (error) {
    console.error("Error setting remote description:", error)
  }
}

/**
 * Adds an ICE candidate to the PeerConnection.
 * @param pc - The RTCPeerConnection.
 * @param candidate - The RTCIceCandidate.
 */
export async function addIceCandidate(pc: RTCPeerConnection, candidate: RTCIceCandidate): Promise<void> {
  try {
    await pc.addIceCandidate(candidate)
    console.log("Added ICE candidate:", candidate)
  } catch (error) {
    console.error("Error adding ICE candidate:", error)
  }
}

/**
 * Closes the PeerConnection and stops local media tracks.
 */
export function closePeerConnection(): void {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }
  console.log("PeerConnection closed.")
}

export function useWebRTC(): WebRTCHook {
  const { user } = useAuth()
  const webRTCHandler = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const [localStreamState, setLocalStreamState] = useState<MediaStream | null>(null)
  const [remoteStreamState, setRemoteStreamState] = useState<MediaStream | null>(null)
  const [callState, setCallState] = useState<"idle" | "ringing" | "connecting" | "in-call" | "ended">("idle")
  const [incomingCall, setIncomingCall] = useState<{
    from: string
    offer: RTCSessionDescriptionInit
    isVideo: boolean
  } | null>(null)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const currentUserId = user?.id

  useEffect(() => {
    if (!currentUserId) return

    webRTCHandler.current = initializeWebRTC(
      (stream) => {
        localStreamRef.current = stream
        setLocalStreamState(stream)
      },
      (stream) => {
        remoteStreamRef.current = stream
        setRemoteStreamState(stream)
      },
      (candidate) => {
        // Send ICE candidate to signaling server
        // This part is not implemented in the updates, so it's left as a placeholder
        console.log("Send ICE candidate to signaling server:", candidate)
      },
    )

    return () => {
      closePeerConnection()
    }
  }, [currentUserId])

  const startCall = useCallback(
    async (targetUserId: string, isVideo: boolean) => {
      if (!currentUserId || !webRTCHandler.current) return

      setCallState("connecting")
      const offer = await createOffer(webRTCHandler.current)
      if (offer) {
        // Send offer to signaling server
        // This part is not implemented in the updates, so it's left as a placeholder
        console.log("Send offer to signaling server:", offer)
      }
    },
    [currentUserId],
  )

  const acceptCall = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!currentUserId || !incomingCall || !webRTCHandler.current) return

      setCallState("connecting")
      await setRemoteDescription(webRTCHandler.current, new RTCSessionDescription(offer))
      const answer = await createAnswer(webRTCHandler.current)
      if (answer) {
        // Send answer to signaling server
        // This part is not implemented in the updates, so it's left as a placeholder
        console.log("Send answer to signaling server:", answer)
      }
      setIncomingCall(null) // Clear incoming call once accepted
    },
    [currentUserId, incomingCall],
  )

  const endCall = useCallback(() => {
    closePeerConnection()
    setCallState("ended")
  }, [])

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
        setIsMicMuted(!track.enabled)
      })
    }
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
        setIsVideoOff(!track.enabled)
      })
    }
  }, [])

  return {
    localStream: localStreamState,
    remoteStream: remoteStreamState,
    startCall,
    acceptCall,
    endCall,
    toggleMic,
    toggleVideo,
    callState,
    incomingCall,
    isMicMuted,
    isVideoOff,
  }
}

interface MobileMoneyModalState {
  isMobileMoneyModalOpen: boolean
  openMobileMoneyModal: () => void
  closeMobileMoneyModal: () => void
}

export const useMobileMoneyModal = create<MobileMoneyModalState>((set) => ({
  isMobileMoneyModalOpen: false,
  openMobileMoneyModal: () => set({ isMobileMoneyModalOpen: true }),
  closeMobileMoneyModal: () => set({ isMobileMoneyModalOpen: false }),
}))
