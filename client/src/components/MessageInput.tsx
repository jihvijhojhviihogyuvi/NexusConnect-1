import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "./EmojiPicker";
import { cn } from "@/lib/utils";
import type { MessageWithSender } from "@shared/schema";

interface MessageInputProps {
  onSend: (content: string, attachments?: File[], replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  replyingTo?: MessageWithSender | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled = false,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    return () => {
      attachmentPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [attachmentPreviews]);

  const handleContentChange = (value: string) => {
    setContent(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim()) {
      onTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    } else {
      onTyping(false);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && attachments.length === 0) return;

    onSend(content.trim(), attachments, replyingTo?.id);
    setContent("");
    setAttachments([]);
    setAttachmentPreviews([]);
    onCancelReply?.();
    onTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    setAttachments((prev) => [...prev, ...imageFiles]);

    const previews = imageFiles.map((file) => URL.createObjectURL(file));
    setAttachmentPreviews((prev) => [...prev, ...previews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    URL.revokeObjectURL(attachmentPreviews[index]);
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  return (
    <div className="border-t bg-background p-4">
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 mb-2 p-2 bg-muted rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Replying to {replyingTo.sender.firstName} {replyingTo.sender.lastName}
            </p>
            <p className="text-sm truncate">{replyingTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-7 w-7"
            onClick={onCancelReply}
            data-testid="button-cancel-reply"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {attachmentPreviews.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachmentPreviews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Attachment ${index + 1}`}
                className="h-16 w-16 object-cover rounded-lg"
              />
              <button
                className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(index)}
                data-testid={`button-remove-attachment-${index}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />
        
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          data-testid="button-attach-file"
        >
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </Button>

        <EmojiPicker onEmojiSelect={handleEmojiSelect} />

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none pr-12"
            disabled={disabled}
            rows={1}
            data-testid="input-message"
          />
        </div>

        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={disabled || (!content.trim() && attachments.length === 0)}
          data-testid="button-send-message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
