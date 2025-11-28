import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Phone, Video, MoreVertical, Users, Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { UserAvatar } from "./UserAvatar";
import { TypingIndicator } from "./TypingIndicator";
import { useSocket } from "@/contexts/SocketContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { ConversationWithDetails, MessageWithSender, User } from "@shared/schema";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

interface ChatWindowProps {
  conversationId: string;
  currentUser: User;
  onStartCall: (type: "voice" | "video") => void;
  onViewGroupInfo?: () => void;
}

export function ChatWindow({
  conversationId,
  currentUser,
  onStartCall,
  onViewGroupInfo,
}: ChatWindowProps) {
  const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { sendMessage: sendSocketMessage, onMessage } = useSocket();

  const { data: conversation, isLoading: conversationLoading } = useQuery<ConversationWithDetails>({
    queryKey: ["/api/conversations", conversationId],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments, replyToId }: { content: string; attachments?: File[]; replyToId?: string }) => {
      const formData = new FormData();
      formData.append("content", content);
      if (replyToId) formData.append("replyToId", replyToId);
      attachments?.forEach((file) => formData.append("attachments", file));

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });

      // Get previous data
      const previousMessages = queryClient.getQueryData<MessageWithSender[]>(["/api/conversations", conversationId, "messages"]);

      // Create optimistic message
      const optimisticMessage: MessageWithSender = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: currentUser.id,
        content: variables.content,
        messageType: variables.attachments?.length ? "image" : "text",
        attachments: variables.attachments?.map((f) => ({ url: "", type: f.type, name: f.name, size: f.size })),
        replyToId: variables.replyToId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        sender: currentUser,
        replyTo: null,
      };

      // Update cache optimistically
      if (previousMessages) {
        queryClient.setQueryData(["/api/conversations", conversationId, "messages"], [...previousMessages, optimisticMessage]);
      }

      return { previousMessages };
    },
    onSuccess: (data, variables, context) => {
      // Update cache with actual message
      const previousMessages = context?.previousMessages || [];
      const optimisticId = `temp-${Date.now()}`;
      const filtered = previousMessages.filter((m: any) => !m.id.startsWith("temp-"));
      queryClient.setQueryData(["/api/conversations", conversationId, "messages"], [...filtered, data]);
    },
    onError: (err, variables, context) => {
      // Restore previous messages on error
      if (context?.previousMessages) {
        queryClient.setQueryData(["/api/conversations", conversationId, "messages"], context.previousMessages);
      }
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
    },
  });

  useEffect(() => {
    const unsubscribe = onMessage((type, payload) => {
      if (type === "new-message" && payload.conversationId === conversationId) {
        // Update cache directly instead of invalidating (fast path)
        queryClient.setQueryData(["/api/conversations", conversationId, "messages"], (oldData: MessageWithSender[] | undefined) => {
          if (!oldData) return oldData;
          // Prevent duplicates
          const exists = oldData.some((m) => m.id === payload.message.id);
          if (exists) return oldData;
          return [...oldData, payload.message];
        });
        
        // Update conversation last message
        queryClient.setQueryData(["/api/conversations"], (oldData: ConversationWithDetails[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: payload.message,
                  updatedAt: new Date().toISOString(),
                }
              : conv
          );
        });
      }
      if (type === "typing-status" && payload.conversationId === conversationId) {
        queryClient.setQueryData(["/api/conversations", conversationId], (oldData: ConversationWithDetails | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            participants: oldData.participants.map((p) =>
              p.userId === payload.userId ? { ...p, isTyping: payload.isTyping } : p
            ),
          };
        });
      }
    });

    return unsubscribe;
  }, [conversationId, onMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(
    (content: string, attachments?: File[], replyToId?: string) => {
      sendMessageMutation.mutate({ content, attachments, replyToId });
    },
    [sendMessageMutation]
  );

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      sendSocketMessage("typing", { conversationId, isTyping });
    },
    [conversationId, sendSocketMessage]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      deleteMessageMutation.mutate(messageId);
    },
    [deleteMessageMutation]
  );

  const getConversationHeader = () => {
    if (!conversation) return { name: "", avatar: null, isGroup: false, participants: [] };

    if (conversation.type === "group") {
      return {
        name: conversation.name || "Unnamed Group",
        avatar: null,
        isGroup: true,
        participants: conversation.participants.map((p) => p.user),
      };
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.user.id !== currentUser.id
    )?.user;

    return {
      name: otherParticipant
        ? `${otherParticipant.firstName || ""} ${otherParticipant.lastName || ""}`.trim() || "Unknown"
        : "Unknown",
      avatar: otherParticipant || null,
      isGroup: false,
      participants: otherParticipant ? [otherParticipant] : [],
    };
  };

  const typingUsers = conversation?.participants
    .filter((p) => p.userId !== currentUser.id && p.isTyping)
    .map((p) => p.user);

  const header = getConversationHeader();

  const formatDateDivider = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const groupedMessages = messages?.reduce((acc, message) => {
    const date = new Date(message.createdAt!);
    const dateKey = format(date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(message);
    return acc;
  }, {} as Record<string, MessageWithSender[]>);

  if (conversationLoading || messagesLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "" : "flex-row-reverse")}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className={cn("h-16 rounded-2xl", i % 2 === 0 ? "w-48" : "w-64")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          {header.isGroup ? (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          ) : header.avatar ? (
            <UserAvatar user={header.avatar} showStatus size="md" />
          ) : null}
          <div>
            <h2 className="font-semibold" data-testid="text-conversation-header-name">{header.name}</h2>
            {header.isGroup ? (
              <p className="text-xs text-muted-foreground" data-testid="text-participant-count">
                {conversation?.participants.length} members
              </p>
            ) : header.avatar?.status === "online" ? (
              <p className="text-xs text-status-online">Online</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall("voice")}
            data-testid="button-start-voice-call"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall("video")}
            data-testid="button-start-video-call"
          >
            <Video className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-chat-menu">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="menu-search-messages">
                <Search className="h-4 w-4 mr-2" />
                Search messages
              </DropdownMenuItem>
              {header.isGroup && (
                <DropdownMenuItem onClick={onViewGroupInfo} data-testid="menu-group-info">
                  <Info className="h-4 w-4 mr-2" />
                  Group info
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" data-testid="menu-leave-conversation">
                Leave conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {!messages?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm" data-testid="text-no-messages">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            Object.entries(groupedMessages || {}).map(([dateKey, dayMessages]) => (
              <div key={dateKey}>
                <div className="flex justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDateDivider(new Date(dateKey))}
                  </span>
                </div>
                <div className="space-y-3">
                  {dayMessages.map((message, index) => {
                    const prevMessage = dayMessages[index - 1];
                    const showAvatar =
                      !prevMessage ||
                      prevMessage.senderId !== message.senderId ||
                      new Date(message.createdAt!).getTime() - new Date(prevMessage.createdAt!).getTime() > 300000;

                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwnMessage={message.senderId === currentUser.id}
                        showAvatar={showAvatar}
                        showSenderName={header.isGroup && showAvatar && message.senderId !== currentUser.id}
                        onReply={setReplyingTo}
                        onDelete={handleDeleteMessage}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {typingUsers && typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TypingIndicator />
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].firstName} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <MessageInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        disabled={sendMessageMutation.isPending}
      />
    </div>
  );
}
