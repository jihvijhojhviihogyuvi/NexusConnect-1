import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "./UserAvatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (conversationId: string) => void;
  currentUser: User;
}

export function NewGroupDialog({
  open,
  onOpenChange,
  onGroupCreated,
  currentUser,
}: NewGroupDialogProps) {
  const [step, setStep] = useState<"members" | "details">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users", searchQuery],
    enabled: open,
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        type: "group",
        name: groupName,
        description: groupDescription,
        participantIds: selectedUserIds,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onGroupCreated(data.id);
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setStep("members");
    setSearchQuery("");
    setSelectedUserIds([]);
    setGroupName("");
    setGroupDescription("");
  };

  const filteredUsers = users?.filter((user) => user.id !== currentUser.id);
  const selectedUsers = users?.filter((user) => selectedUserIds.includes(user.id)) || [];

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleNext = () => {
    if (step === "members" && selectedUserIds.length > 0) {
      setStep("details");
    }
  };

  const handleBack = () => {
    setStep("members");
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedUserIds.length > 0) {
      createGroupMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="sm:max-w-md" data-testid="new-group-dialog">
        <DialogHeader>
          <DialogTitle>
            {step === "members" ? "Create Group" : "Group Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "members"
              ? "Select members to add to the group."
              : "Set the group name and description."}
          </DialogDescription>
        </DialogHeader>

        {step === "members" ? (
          <div className="space-y-4">
            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                    data-testid={`selected-user-badge-${user.id}`}
                  >
                    {user.firstName} {user.lastName}
                    <button
                      className="ml-1 rounded-full hover:bg-background/20 p-0.5"
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

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

            <ScrollArea className="h-56">
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
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No users found</p>
                  </div>
                ) : (
                  filteredUsers?.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 p-2 rounded-lg text-left transition-colors hover-elevate",
                          isSelected && "bg-accent"
                        )}
                        onClick={() => toggleUserSelection(user.id)}
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
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })
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
                onClick={handleNext}
                disabled={selectedUserIds.length === 0}
                data-testid="button-next"
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                data-testid="input-group-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Description (optional)</Label>
              <Textarea
                id="group-description"
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-group-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Members ({selectedUserIds.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary">
                    {user.firstName} {user.lastName}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleBack} data-testid="button-back">
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!groupName.trim() || createGroupMutation.isPending}
                data-testid="button-create-group"
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
