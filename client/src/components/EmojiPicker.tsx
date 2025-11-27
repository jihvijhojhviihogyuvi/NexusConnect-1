import { useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "😎", "🤩", "🥳"],
  "Gestures": ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🤙", "👌", "🤘", "👊", "✊", "💪", "🙏", "👋", "🤚", "✋", "🖐️", "🖖", "👐"],
  "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❤️‍🔥"],
  "Objects": ["🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "⭐", "🌟", "✨", "💫", "🔥", "💯", "⚡", "🚀", "🎯", "💡", "📱", "💻", "🎮", "🎵"],
};

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>("Smileys");

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", className)}
          data-testid="button-emoji-picker"
        >
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        side="top"
        sideOffset={8}
      >
        <div className="border-b p-2">
          <div className="flex gap-1">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "secondary" : "ghost"}
                size="sm"
                className="text-xs px-2 py-1 h-7"
                onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
                data-testid={`button-emoji-category-${category.toLowerCase()}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
        <div className="p-2 grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
          {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
            <button
              key={emoji}
              className="p-1.5 text-xl hover-elevate rounded-md transition-colors cursor-pointer"
              onClick={() => handleEmojiClick(emoji)}
              data-testid={`button-emoji-${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
