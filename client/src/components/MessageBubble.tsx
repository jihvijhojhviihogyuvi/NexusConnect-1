import { useState } from "react";
import { Check, CheckCheck, MoreHorizontal, Reply, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";
import type { MessageWithSender, User } from "@shared/schema";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  onReply?: (message: MessageWithSender) => void;
  onEdit?: (message: MessageWithSender) => void;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwnMessage,
  showAvatar = true,
  showSenderName = false,
  onReply,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const renderAttachments = () => {
    if (!message.attachments?.length) return null;

    return (
      <div className="mt-2 space-y-2">
        {message.attachments.map((attachment, index) => {
          if (attachment.type.startsWith("image/")) {
            return (
              <img
                key={index}
                src={attachment.url}
                alt={attachment.name}
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                data-testid={`image-attachment-${index}`}
              />
            );
          }
          return (
            <a
              key={index}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
              data-testid={`file-attachment-${index}`}
            >
              <span className="text-sm truncate">{attachment.name}</span>
              {attachment.size && (
                <span className="text-xs text-muted-foreground">
                  ({(attachment.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </a>
          );
        })}
      </div>
    );
  };

  const renderReplyPreview = () => {
    if (!message.replyTo) return null;

    return (
      <div className="mb-2 pl-3 border-l-2 border-primary/50 opacity-70">
        <p className="text-xs font-medium">
          {message.replyTo.sender.firstName} {message.replyTo.sender.lastName}
        </p>
        <p className="text-xs truncate max-w-48">{message.replyTo.content}</p>
      </div>
    );
  };

  const renderStatus = () => {
    if (!isOwnMessage) return null;

    return (
      <span className="text-muted-foreground/70">
        {message.status === "read" ? (
          <CheckCheck className="h-3.5 w-3.5 text-primary" />
        ) : message.status === "delivered" ? (
          <CheckCheck className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </span>
    );
  };

  if (message.messageType === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full" data-testid={`system-message-${message.id}`}>
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 group relative",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      data-testid={`message-bubble-${message.id}`}
    >
      {showAvatar && !isOwnMessage ? (
        <UserAvatar user={message.sender} size="sm" />
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        )}
      >
        {showSenderName && !isOwnMessage && (
          <p className="text-xs font-medium mb-1 opacity-80" data-testid={`text-sender-name-${message.id}`}>
            {message.sender.firstName} {message.sender.lastName}
          </p>
        )}

        {renderReplyPreview()}

        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-message-content-${message.id}`}>
            {message.content}
          </p>
        )}

        {renderAttachments()}

        <div className={cn(
          "flex items-center gap-1.5 mt-1",
          isOwnMessage ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-[10px]",
            isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
          )} data-testid={`text-message-time-${message.id}`}>
            {format(new Date(message.createdAt!), "HH:mm")}
          </span>
          {message.editedAt && (
            <span className={cn(
              "text-[10px]",
              isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              (edited)
            </span>
          )}
          {renderStatus()}
        </div>
      </div>

      <div
        className={cn(
          "absolute top-0 flex items-center gap-0.5 transition-opacity",
          isOwnMessage ? "left-0" : "right-0",
          showActions ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ visibility: showActions ? "visible" : "hidden" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onReply?.(message)}
          data-testid={`button-reply-${message.id}`}
        >
          <Reply className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-message-actions-${message.id}`}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isOwnMessage ? "start" : "end"}>
            <DropdownMenuItem onClick={() => onReply?.(message)} data-testid={`menu-reply-${message.id}`}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </DropdownMenuItem>
            {isOwnMessage && (
              <>
                <DropdownMenuItem onClick={() => onEdit?.(message)} data-testid={`menu-edit-${message.id}`}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(message.id)}
                  className="text-destructive focus:text-destructive"
                  data-testid={`menu-delete-${message.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
