import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import type { Call, User } from "@shared/schema";
import { useSocket } from "./SocketContext";

interface CallState {
  isInCall: boolean;
  currentCall: Call | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  callType: "voice" | "video" | null;
  participants: User[];
}

interface IncomingCallInfo {
  call: Call;
  initiator: User;
}

interface CallContextType extends CallState {
  startCall: (conversationId: string, type: "voice" | "video", participants: User[]) => Promise<void>;
  joinCall: (callId: string) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => void;
  incomingCall: IncomingCallInfo | null;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export function CallProvider({ children }: { children: ReactNode }) {
  const { sendMessage, onMessage } = useSocket();
  const [state, setState] = useState<CallState>({
    isInCall: false,
    currentCall: null,
    localStream: null,
    remoteStreams: new Map(),
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    callType: null,
    participants: [],
  });
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Define createPeerConnection FIRST, before it's used in other functions
  const createPeerConnection = useCallback((userId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage("ice-candidate", {
          targetUserId: userId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setState((prev) => {
        const newStreams = new Map(prev.remoteStreams);
        newStreams.set(userId, event.streams[0]);
        return { ...prev, remoteStreams: newStreams };
      });
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnections.current.set(userId, pc);
    return pc;
  }, [sendMessage]);

  const handleOffer = useCallback(async (userId: string, offer: RTCSessionDescriptionInit) => {
    try {
      let pc = peerConnections.current.get(userId);
      if (!pc) {
        pc = createPeerConnection(userId);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendMessage("webrtc-answer", {
        targetUserId: userId,
        answer: pc.localDescription,
      });
    } catch (err) {
      console.error("Error handling offer:", err);
    }
  }, [createPeerConnection, sendMessage]);

  const handleAnswer = useCallback(async (userId: string, answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnections.current.get(userId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.error("Error handling answer:", err);
    }
  }, []);

  const handleIceCandidate = useCallback((userId: string, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnections.current.get(userId);
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  }, []);

  const endCall = useCallback(() => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (state.currentCall) {
      sendMessage("end-call", { callId: state.currentCall.id });
    }

    setState({
      isInCall: false,
      currentCall: null,
      localStream: null,
      remoteStreams: new Map(),
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      callType: null,
      participants: [],
    });
  }, [state.currentCall, sendMessage]);

  useEffect(() => {
    const unsubscribe = onMessage((type, payload) => {
      if (type === "incoming-call") {
        setIncomingCall({ call: payload.call, initiator: payload.initiator });
      }
      if (type === "webrtc-offer") {
        handleOffer(payload.fromUserId, payload.offer);
      }
      if (type === "webrtc-answer") {
        handleAnswer(payload.fromUserId, payload.answer);
      }
      if (type === "ice-candidate") {
        handleIceCandidate(payload.fromUserId, payload.candidate);
      }
      if (type === "call-ended") {
        // Close the call when the other person hangs up
        endCall();
      }
      if (type === "call-declined") {
        // Close the call if declined
        endCall();
        setIncomingCall(null);
      }
    });

    return unsubscribe;
  }, [onMessage, handleOffer, handleAnswer, handleIceCandidate, endCall]);

  const startCall = async (conversationId: string, type: "voice" | "video", participants: User[]) => {
    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      
      // Request both audio and video for all calls (to match video call setup)
      // For voice calls, we'll just disable the video track
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: true,
      });
      
      // For voice-only calls, disable the video track
      if (type === "voice") {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      
      localStreamRef.current = stream;

      setState((prev) => ({
        ...prev,
        isInCall: true,
        localStream: stream,
        callType: type,
        participants,
        isMuted: false,
        isVideoOff: type === "voice",
      }));

      // Create peer connections and send offers
      for (const participant of participants) {
        const pc = createPeerConnection(participant.id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendMessage("webrtc-offer", {
          targetUserId: participant.id,
          offer: pc.localDescription,
        });
      }

      sendMessage("start-call", {
        conversationId,
        type,
        participantIds: participants.map((p) => p.id),
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      throw err;
    }
  };

  const joinCall = async (callId: string) => {
    sendMessage("join-call", { callId });
  };

  const acceptCall = async (callId: string) => {
    if (!incomingCall) return;

    try {
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      
      // Request both audio and video for all calls (to match video call setup)
      // For voice calls, we'll just disable the video track
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: true,
      });
      
      // For voice-only calls, disable the video track
      if (incomingCall.call.type === "voice") {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      
      localStreamRef.current = stream;

      // Create peer connection with initiator
      const pc = createPeerConnection(incomingCall.initiator.id);

      setState((prev) => ({
        ...prev,
        isInCall: true,
        currentCall: incomingCall.call,
        localStream: stream,
        callType: incomingCall.call.type,
        participants: [incomingCall.initiator],
        isMuted: false,
        isVideoOff: incomingCall.call.type === "voice",
      }));

      setIncomingCall(null);
      sendMessage("accept-call", { callId });
    } catch (err) {
      console.error("Failed to accept call:", err);
      throw err;
    }
  };

  const declineCall = (callId: string) => {
    setIncomingCall(null);
    sendMessage("decline-call", { callId });
  };


  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
        sendMessage("toggle-mute", { isMuted: !audioTrack.enabled });
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setState((prev) => ({ ...prev, isVideoOff: !videoTrack.enabled }));
        sendMessage("toggle-video", { isVideoOff: !videoTrack.enabled });
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (state.isScreenSharing) {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newVideoTrack = newStream.getVideoTracks()[0];
          
          peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            }
          });

          videoTrack.stop();
          localStreamRef.current?.removeTrack(videoTrack);
          localStreamRef.current?.addTrack(newVideoTrack);
        }
        setState((prev) => ({ ...prev, isScreenSharing: false }));
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current?.removeTrack(videoTrack);
        }
        localStreamRef.current?.addTrack(screenTrack);

        setState((prev) => ({ ...prev, isScreenSharing: true }));
      }
      sendMessage("toggle-screen-share", { isScreenSharing: !state.isScreenSharing });
    } catch (err) {
      console.error("Failed to toggle screen share:", err);
    }
  };

  return (
    <CallContext.Provider
      value={{
        ...state,
        startCall,
        joinCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        acceptCall,
        declineCall,
        incomingCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
