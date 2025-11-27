import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Check, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/StatusDot";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

interface ProfileProps {
  onBack?: () => void;
}

export default function Profile({ onBack }: ProfileProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    bio: "",
    statusMessage: "",
    status: "online" as "online" | "away" | "busy" | "offline",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        bio: user.bio || "",
        statusMessage: user.statusMessage || "",
        status: user.status || "online",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) form.append(key, value);
      });
      if (avatarFile) {
        form.append("avatar", avatarFile);
      }

      const response = await fetch("/api/auth/user", {
        method: "PATCH",
        body: form,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        bio: user.bio || "",
        statusMessage: user.statusMessage || "",
        status: user.status || "online",
      });
    }
  };

  const initials = [formData.firstName?.[0], formData.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  if (authLoading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <div className="w-full space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl font-semibold flex-1" data-testid="text-profile-title">Profile</h1>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                <Check className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 mb-8">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={avatarPreview || user?.profileImageUrl || undefined}
                    alt="Profile"
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <button
                      className="absolute bottom-0 right-0 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-change-avatar"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </>
                )}
                <StatusDot
                  status={formData.status}
                  size="lg"
                  className="absolute bottom-0 left-0"
                />
              </div>
              {!isEditing && (
                <div className="text-center">
                  <h2 className="text-xl font-semibold" data-testid="text-display-name">
                    {formData.firstName} {formData.lastName}
                  </h2>
                  {formData.username && (
                    <p className="text-muted-foreground" data-testid="text-username">
                      @{formData.username}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    disabled={!isEditing}
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={!isEditing}
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Choose a unique username"
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as typeof formData.status })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger id="status" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">
                      <div className="flex items-center gap-2">
                        <StatusDot status="online" size="sm" />
                        Online
                      </div>
                    </SelectItem>
                    <SelectItem value="away">
                      <div className="flex items-center gap-2">
                        <StatusDot status="away" size="sm" />
                        Away
                      </div>
                    </SelectItem>
                    <SelectItem value="busy">
                      <div className="flex items-center gap-2">
                        <StatusDot status="busy" size="sm" />
                        Do Not Disturb
                      </div>
                    </SelectItem>
                    <SelectItem value="offline">
                      <div className="flex items-center gap-2">
                        <StatusDot status="offline" size="sm" />
                        Invisible
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusMessage">Status Message</Label>
                <Input
                  id="statusMessage"
                  value={formData.statusMessage}
                  onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
                  disabled={!isEditing}
                  placeholder="What's on your mind?"
                  data-testid="input-status-message"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself..."
                  className="resize-none"
                  rows={3}
                  data-testid="input-bio"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
