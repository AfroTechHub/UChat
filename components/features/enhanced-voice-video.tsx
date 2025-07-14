"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PhoneCall, Video, Mic, PhoneOff, VideoOff, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { initializeWebRTC, createOffer, createAnswer, addIceCandidate, setRemoteDescription } from "@/lib/webrtc"

interface EnhancedVoiceVideoProps {
  recipientId: string
  recipientName: string
}

export function EnhancedVoiceVideo({ recipientId, recipientName }: EnhancedVoiceVideoProps) {
  const { user } = useAuth()
  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "in_call">("idle")
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const signalingChannelRef = useRef<any>(null)

  const currentUserId = user?.id

  useEffect(() => {
    if (!currentUserId) return

    // Initialize WebRTC peer connection
    const pc = initializeWebRTC(
      (stream) => {
        setLocalStream(stream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      },
      (stream) => {
        setRemoteStream(stream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
      },
      async (candidate) => {
        if (signalingChannelRef.current) {
          await signalingChannelRef.current.send({ type: "ice-candidate", candidate })
        }
      },
    )
    peerConnectionRef.current = pc

    // Setup Supabase Realtime for signaling
    const channelName = `webrtc_signaling_${[currentUserId, recipientId].sort().join("_")}`
    signalingChannelRef.current = supabase.channel(channelName)

    signalingChannelRef.current
      .on("broadcast", { event: "webrtc" }, async (payload: { payload: any }) => {
        const { type, sdp, candidate } = payload.payload
        if (type === "offer") {
          setCallState("incoming")
          await setRemoteDescription(peerConnectionRef.current!, new RTCSessionDescription({ type: "offer", sdp }))
          const answer = await createAnswer(peerConnectionRef.current!)
          await signalingChannelRef.current.send({ type: "webrtc", payload: { type: "answer", sdp: answer?.sdp } })
        } else if (type === "answer") {
          await setRemoteDescription(peerConnectionRef.current!, new RTCSessionDescription({ type: "answer", sdp }))
          setCallState("in_call")
        } else if (type === "ice-candidate") {
          await addIceCandidate(peerConnectionRef.current!, new RTCIceCandidate(candidate))
        }
      })
      .subscribe()

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      if (signalingChannelRef.current) {
        supabase.removeChannel(signalingChannelRef.current)
      }
    }
  }, [currentUserId, recipientId])

  const startCall = async (isVideo: boolean) => {
    setCallState("calling")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true })
      stream.getTracks().forEach((track) => peerConnectionRef.current?.addTrack(track, stream))
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const offer = await createOffer(peerConnectionRef.current!)
      if (signalingChannelRef.current) {
        await signalingChannelRef.current.send({ type: "webrtc", payload: { type: "offer", sdp: offer?.sdp } })
      }
    } catch (error) {
      console.error("Error starting call:", error)
      setCallState("idle")
    }
  }

  const answerCall = async () => {
    setCallState("in_call")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }) // Assume video for now
      stream.getTracks().forEach((track) => peerConnectionRef.current?.addTrack(track, stream))
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      const answer = await createAnswer(peerConnectionRef.current!)
      if (signalingChannelRef.current) {
        await signalingChannelRef.current.send({ type: "webrtc", payload: { type: "answer", sdp: answer?.sdp } })
      }
    } catch (error) {
      console.error("Error answering call:", error)
      setCallState("idle")
    }
  }

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null // Reset peer connection
    }
    setLocalStream(null)
    setRemoteStream(null)
    setCallState("idle")
    // Notify other party to end call
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({ type: "webrtc", payload: { type: "end_call" } })
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Call with {recipientName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden">
          {remoteStream && (
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          )}
          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 w-32 h-24 rounded-lg border-2 border-white object-cover"
            />
          )}
          {!remoteStream && !localStream && (
            <div className="flex items-center justify-center w-full h-full text-gray-500">No video stream</div>
          )}
        </div>
        <div className="flex justify-center gap-4">
          {callState === "idle" && (
            <>
              <Button onClick={() => startCall(false)}>
                <PhoneCall className="mr-2 h-4 w-4" /> Voice Call
              </Button>
              <Button onClick={() => startCall(true)}>
                <Video className="mr-2 h-4 w-4" /> Video Call
              </Button>
            </>
          )}
          {callState === "calling" && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calling...
            </Button>
          )}
          {callState === "incoming" && (
            <>
              <Button onClick={answerCall}>
                <PhoneCall className="mr-2 h-4 w-4" /> Answer
              </Button>
              <Button variant="destructive" onClick={endCall}>
                <PhoneOff className="mr-2 h-4 w-4" /> Decline
              </Button>
            </>
          )}
          {callState === "in_call" && (
            <>
              <Button variant="destructive" onClick={endCall}>
                <PhoneOff className="mr-2 h-4 w-4" /> End Call
              </Button>
              <Button>
                <Mic className="mr-2 h-4 w-4" /> Mute
              </Button>
              <Button>
                <VideoOff className="mr-2 h-4 w-4" /> Toggle Video
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
