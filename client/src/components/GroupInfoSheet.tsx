import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Users, Crown, Shield, MoreVertical, UserPlus, LogOut, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "./UserAvatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ConversationWithDetails, User } from "@shared/schema";

interface GroupInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationWithDetails;
  currentUser: User;
}

export function GroupInfoSheet({
  open,
  onOpenChange,
  conversation,
  currentUser,
}: GroupInfoSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(conversation.name || "");
  const [editDescription, setEditDescription] = useState(conversation.description || "");

  const currentParticipant = conversation.participants.find(
    (p) => p.userId === currentUser.id
  );
  const isAdmin = currentParticipant?.role === "owner" || currentParticipant?.role === "admin";

  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/conversations/${conversation.id}`, {
        name: editName,
        description: editDescription,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id] });
      setIsEditing(false);
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/conversations/${conversation.id}/participants/${currentUser.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onOpenChange(false);
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/conversations/${conversation.id}/participants/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/conversations/${conversation.id}/participants/${userId}`, {
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id] });
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge variant="default" className="gap-1" data-testid="badge-owner">
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="secondary" className="gap-1" data-testid="badge-admin">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="group-info-sheet">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>Group Info</SheetTitle>
            {isAdmin && !isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-group"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-10 w-10 text-primary" />
            </div>

            {isEditing ? (
              <div className="w-full space-y-4">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Group name"
                  data-testid="input-edit-group-name"
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Group description"
                  className="resize-none"
                  rows={2}
                  data-testid="input-edit-group-description"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(conversation.name || "");
                      setEditDescription(conversation.description || "");
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => updateGroupMutation.mutate()}
                    disabled={updateGroupMutation.isPending}
                    data-testid="button-save-edit"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold" data-testid="text-group-name">
                  {conversation.name || "Unnamed Group"}
                </h3>
                {conversation.description && (
                  <p className="text-sm text-muted-foreground text-center" data-testid="text-group-description">
                    {conversation.description}
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium" data-testid="text-members-count">
                Members ({conversation.participants.length})
              </h4>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="gap-1" data-testid="button-add-members">
                  <UserPlus className="h-4 w-4" />
                  Add
                </Button>
              )}
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {conversation.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted"
                    data-testid={`member-item-${participant.userId}`}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar user={participant.user} showStatus size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {participant.user.firstName} {participant.user.lastName}
                          </span>
                          {participant.userId === currentUser.id && (
                            <span className="text-xs text-muted-foreground">(You)</span>
                          )}
                        </div>
                        {getRoleBadge(participant.role || "member")}
                      </div>
                    </div>

                    {isAdmin && participant.userId !== currentUser.id && participant.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-member-menu-${participant.userId}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {participant.role !== "admin" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateRoleMutation.mutate({
                                  userId: participant.userId,
                                  role: "admin",
                                })
                              }
                              data-testid={`menu-make-admin-${participant.userId}`}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make admin
                            </DropdownMenuItem>
                          )}
                          {participant.role === "admin" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateRoleMutation.mutate({
                                  userId: participant.userId,
                                  role: "member",
                                })
                              }
                              data-testid={`menu-remove-admin-${participant.userId}`}
                            >
                              Remove admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => removeParticipantMutation.mutate(participant.userId)}
                            className="text-destructive focus:text-destructive"
                            data-testid={`menu-remove-member-${participant.userId}`}
                          >
                            Remove from group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => leaveGroupMutation.mutate()}
            disabled={leaveGroupMutation.isPending}
            data-testid="button-leave-group"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave Group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
