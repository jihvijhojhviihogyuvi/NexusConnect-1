import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Monitor,
  Users,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./UserAvatar";
import { useCall } from "@/contexts/CallContext";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface CallUIProps {
  participants: User[];
  onClose?: () => void;
}

export function CallUI({ participants, onClose }: CallUIProps) {
  const {
    isInCall,
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    callType,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    endCall,
  } = useCall();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleEndCall = () => {
    endCall();
    onClose?.();
  };

  if (!isInCall) return null;

  const isVoiceOnly = callType === "voice";
  const remoteStreamArray = Array.from(remoteStreams.entries());
  const gridCols =
    remoteStreamArray.length <= 1
      ? 1
      : remoteStreamArray.length <= 4
      ? 2
      : 3;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      onMouseMove={handleMouseMove}
      data-testid="call-ui-container"
    >
      <div className="flex-1 relative overflow-hidden">
        {isVoiceOnly ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-6">
              <div className="flex gap-4">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex flex-col items-center gap-2">
                    <UserAvatar user={participant} size="xl" />
                    <span className="text-sm font-medium">
                      {participant.firstName} {participant.lastName}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-status-online animate-pulse" />
                <span>Voice call in progress...</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "absolute inset-0 grid gap-2 p-2",
              gridCols === 1 && "grid-cols-1",
              gridCols === 2 && "grid-cols-2",
              gridCols === 3 && "grid-cols-3"
            )}
          >
            {remoteStreamArray.length === 0 ? (
              <div className="flex items-center justify-center bg-muted rounded-lg">
                <div className="flex flex-col items-center gap-4">
                  {participants[0] && (
                    <>
                      <UserAvatar user={participants[0]} size="xl" />
                      <span className="text-lg font-medium">
                        {participants[0].firstName} {participants[0].lastName}
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground">Connecting...</span>
                </div>
              </div>
            ) : (
              remoteStreamArray.map(([oderId, stream]) => (
                <RemoteVideo key={oderId} stream={stream} userId={oderId} participants={participants} />
              ))
            )}
          </div>
        )}

        {!isVoiceOnly && (
          <div
            className={cn(
              "absolute bottom-20 right-4 w-48 aspect-video bg-muted rounded-lg overflow-hidden shadow-lg transition-opacity",
              showControls ? "opacity-100" : "opacity-50"
            )}
            data-testid="local-video-preview"
          >
            {isVideoOff ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-6 flex justify-center transition-opacity",
          showControls ? "opacity-100" : "opacity-0"
        )}
        style={{ visibility: showControls ? "visible" : "hidden" }}
      >
        <div className="flex items-center gap-3 bg-background/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleMute}
            data-testid="button-toggle-mute"
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {!isVoiceOnly && (
            <>
              <Button
                variant={isVideoOff ? "destructive" : "secondary"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleVideo}
                data-testid="button-toggle-video"
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? "default" : "secondary"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleScreenShare}
                data-testid="button-toggle-screen-share"
              >
                <Monitor className="h-5 w-5" />
              </Button>
            </>
          )}

          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleFullscreen}
            data-testid="button-toggle-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={handleEndCall}
            data-testid="button-end-call"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({
  stream,
  userId,
  participants,
}: {
  stream: MediaStream;
  userId: string;
  participants: User[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const participant = participants.find((p) => p.id === userId);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-muted rounded-lg overflow-hidden" data-testid={`remote-video-${userId}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      {participant && (
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-background/70 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-sm font-medium">
            {participant.firstName} {participant.lastName}
          </span>
        </div>
      )}
    </div>
  );
}
