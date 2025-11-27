import { Phone, PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "./UserAvatar";
import { useCall } from "@/contexts/CallContext";
import type { User } from "@shared/schema";

interface IncomingCallDialogProps {
  caller: User;
  callType: "voice" | "video";
  callId: string;
}

export function IncomingCallDialog({ caller, callType, callId }: IncomingCallDialogProps) {
  const { acceptCall, declineCall, incomingCall } = useCall();

  const handleAccept = () => {
    acceptCall(callId);
  };

  const handleDecline = () => {
    declineCall(callId);
  };

  if (!incomingCall) return null;

  return (
    <Dialog open={!!incomingCall}>
      <DialogContent className="sm:max-w-md" data-testid="incoming-call-dialog">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <UserAvatar user={caller} size="xl" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full p-2 animate-pulse">
                {callType === "video" ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
              </div>
            </div>
          </div>
          <DialogTitle data-testid="text-caller-name">
            {caller.firstName} {caller.lastName}
          </DialogTitle>
          <DialogDescription data-testid="text-call-type">
            Incoming {callType} call...
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-6 pt-4">
          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={handleDecline}
            data-testid="button-decline-call"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-status-online hover:bg-status-online/90"
            onClick={handleAccept}
            data-testid="button-accept-call"
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
