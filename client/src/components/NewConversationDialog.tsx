import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "./UserAvatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
  currentUser: User;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
  currentUser,
}: NewConversationDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users", searchQuery],
    enabled: open,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await apiRequest("POST", "/api/conversations", {
        type: "direct",
        participantIds: [participantId],
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onConversationCreated(data.id);
      onOpenChange(false);
      setSearchQuery("");
      setSelectedUserId(null);
    },
  });

  const filteredUsers = users?.filter((user) => user.id !== currentUser.id);

  const handleStartConversation = () => {
    if (selectedUserId) {
      createConversationMutation.mutate(selectedUserId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="new-conversation-dialog">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Search for a user to start a conversation with.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-users"
            />
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))
              ) : filteredUsers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm" data-testid="text-no-users">No users found</p>
                </div>
              ) : (
                filteredUsers?.map((user) => (
                  <button
                    key={user.id}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 p-2 rounded-lg text-left transition-colors hover-elevate",
                      selectedUserId === user.id && "bg-accent"
                    )}
                    onClick={() => setSelectedUserId(user.id)}
                    data-testid={`user-item-${user.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} showStatus size="md" />
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.statusMessage && (
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {user.statusMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedUserId === user.id && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartConversation}
              disabled={!selectedUserId || createConversationMutation.isPending}
              data-testid="button-start-conversation"
            >
              {createConversationMutation.isPending ? "Creating..." : "Start Conversation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
