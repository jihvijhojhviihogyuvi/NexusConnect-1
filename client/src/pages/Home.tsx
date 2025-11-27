import { useState, useEffect } from "react";
import { MessageCircle, User, Settings as SettingsIcon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ConversationList } from "@/components/ConversationList";
import { ChatWindow } from "@/components/ChatWindow";
import { CallUI } from "@/components/CallUI";
import { IncomingCallDialog } from "@/components/IncomingCallDialog";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import { NewGroupDialog } from "@/components/NewGroupDialog";
import { GroupInfoSheet } from "@/components/GroupInfoSheet";
import { UserAvatar } from "@/components/UserAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import Profile from "./Profile";
import Settings from "./Settings";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/contexts/SocketContext";
import { useCall } from "@/contexts/CallContext";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { ConversationWithDetails, User as UserType } from "@shared/schema";

type View = "chat" | "profile" | "settings";

export default function Home() {
  const { user } = useAuth();
  const { isConnected, sendMessage } = useSocket();
  const { isInCall, participants: callParticipants, startCall } = useCall();

  const [view, setView] = useState<View>("chat");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const { incomingCall } = useCall();

  const { data: selectedConversation } = useQuery<ConversationWithDetails>({
    queryKey: ["/api/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  useEffect(() => {
    if (isConnected && user) {
      sendMessage("user-online", { userId: user.id });
    }
  }, [isConnected, user, sendMessage]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowMobileChat(true);
  };

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowMobileChat(true);
  };

  const handleStartCall = async (type: "voice" | "video") => {
    if (!selectedConversation || !user) return;
    
    const otherParticipants = selectedConversation.participants
      .filter((p) => p.userId !== user.id)
      .map((p) => p.user);

    await startCall(selectedConversation.id, type, otherParticipants);
  };

  if (!user) return null;

  return (
    <div className="h-screen flex bg-background">
      {isInCall && <CallUI participants={callParticipants} />}

      <div className="hidden md:flex w-16 flex-col items-center py-4 gap-4 bg-sidebar border-r">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary-foreground" />
        </div>

        <div className="flex-1 flex flex-col items-center gap-2 pt-4">
          <Button
            variant={view === "chat" ? "secondary" : "ghost"}
            size="icon"
            className="w-10 h-10"
            onClick={() => setView("chat")}
            data-testid="nav-chat"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ThemeToggle />
          <Button
            variant={view === "settings" ? "secondary" : "ghost"}
            size="icon"
            className="w-10 h-10"
            onClick={() => setView("settings")}
            data-testid="nav-settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
          <Button
            variant={view === "profile" ? "secondary" : "ghost"}
            size="icon"
            className="w-10 h-10 p-0"
            onClick={() => setView("profile")}
            data-testid="nav-profile"
          >
            <UserAvatar user={user} size="sm" showStatus />
          </Button>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t px-4 py-2 flex justify-around">
        <Button
          variant={view === "chat" && !showMobileChat ? "secondary" : "ghost"}
          size="icon"
          onClick={() => {
            setView("chat");
            setShowMobileChat(false);
          }}
          data-testid="mobile-nav-chat"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        <ThemeToggle />
        <Button
          variant={view === "settings" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setView("settings")}
          data-testid="mobile-nav-settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
        <Button
          variant={view === "profile" ? "secondary" : "ghost"}
          size="icon"
          className="p-0"
          onClick={() => setView("profile")}
          data-testid="mobile-nav-profile"
        >
          <UserAvatar user={user} size="sm" showStatus />
        </Button>
      </div>

      {view === "chat" && (
        <>
          <div
            className={cn(
              "w-full md:w-80 border-r flex-shrink-0 bg-background",
              showMobileChat ? "hidden md:block" : "block"
            )}
          >
            <ConversationList
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={() => setShowNewConversation(true)}
              onNewGroup={() => setShowNewGroup(true)}
              currentUser={user}
            />
          </div>

          <div
            className={cn(
              "flex-1 flex flex-col",
              !showMobileChat ? "hidden md:flex" : "flex"
            )}
          >
            {selectedConversationId ? (
              <>
                <div className="md:hidden p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileChat(false)}
                    data-testid="button-back-to-list"
                  >
                    Back
                  </Button>
                </div>
                <ChatWindow
                  conversationId={selectedConversationId}
                  currentUser={user}
                  onStartCall={handleStartCall}
                  onViewGroupInfo={() => setShowGroupInfo(true)}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2" data-testid="text-no-chat-selected">
                    Select a conversation
                  </h3>
                  <p className="text-sm">
                    Choose an existing conversation or start a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {view === "profile" && (
        <div className="flex-1 pb-16 md:pb-0">
          <Profile onBack={() => setView("chat")} />
        </div>
      )}

      {view === "settings" && (
        <div className="flex-1 pb-16 md:pb-0">
          <Settings onBack={() => setView("chat")} />
        </div>
      )}

      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationCreated={handleConversationCreated}
        currentUser={user}
      />

      <NewGroupDialog
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        onGroupCreated={handleConversationCreated}
        currentUser={user}
      />

      {selectedConversation && selectedConversation.type === "group" && (
        <GroupInfoSheet
          open={showGroupInfo}
          onOpenChange={setShowGroupInfo}
          conversation={selectedConversation}
          currentUser={user}
        />
      )}

      {incomingCall && (
        <IncomingCallDialog
          caller={incomingCall.initiator}
          callType={incomingCall.call.type as "voice" | "video"}
          callId={incomingCall.call.id}
        />
      )}
    </div>
  );
}
