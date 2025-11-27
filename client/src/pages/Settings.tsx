import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Bell, Shield, Video, MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SettingsProps {
  onBack?: () => void;
}

interface DeviceInfo {
  id: string;
  label: string;
}

export default function Settings({ onBack }: SettingsProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    soundEnabled: true,
    messagePreview: true,
    readReceipts: true,
    typingIndicators: true,
    onlineStatus: true,
  });

  const [devices, setDevices] = useState({
    audioInput: [] as DeviceInfo[],
    audioOutput: [] as DeviceInfo[],
    videoInput: [] as DeviceInfo[],
  });

  const [selectedDevices, setSelectedDevices] = useState({
    audioInput: "",
    audioOutput: "",
    videoInput: "",
  });

  useEffect(() => {
    if (user) {
      setSettings((prev) => ({
        ...prev,
        notificationsEnabled: user.notificationsEnabled ?? true,
        soundEnabled: user.soundEnabled ?? true,
      }));
    }
  }, [user]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const deviceList = await navigator.mediaDevices.enumerateDevices();

        setDevices({
          audioInput: deviceList
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({ id: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}` })),
          audioOutput: deviceList
            .filter((d) => d.kind === "audiooutput")
            .map((d) => ({ id: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` })),
          videoInput: deviceList
            .filter((d) => d.kind === "videoinput")
            .map((d) => ({ id: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` })),
        });

        const savedDevices = localStorage.getItem("selectedDevices");
        if (savedDevices) {
          setSelectedDevices(JSON.parse(savedDevices));
        } else {
          setSelectedDevices({
            audioInput: deviceList.find((d) => d.kind === "audioinput")?.deviceId || "",
            audioOutput: deviceList.find((d) => d.kind === "audiooutput")?.deviceId || "",
            videoInput: deviceList.find((d) => d.kind === "videoinput")?.deviceId || "",
          });
        }
      } catch (err) {
        console.error("Failed to get media devices:", err);
      }
    };

    getDevices();
  }, []);

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const response = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationsEnabled: newSettings.notificationsEnabled,
          soundEnabled: newSettings.soundEnabled,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Settings saved",
        description: "Your settings have been updated.",
      });
    },
  });

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettingsMutation.mutate(newSettings);
  };

  const handleDeviceChange = (type: keyof typeof selectedDevices, deviceId: string) => {
    const newDevices = { ...selectedDevices, [type]: deviceId };
    setSelectedDevices(newDevices);
    localStorage.setItem("selectedDevices", JSON.stringify(newDevices));
    toast({
      title: "Device updated",
      description: "Your device selection has been saved.",
    });
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl font-semibold" data-testid="text-settings-title">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for new messages
                </p>
              </div>
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(value) => handleSettingChange("notificationsEnabled", value)}
                data-testid="switch-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sound</Label>
                <p className="text-sm text-muted-foreground">
                  Play sounds for notifications
                </p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(value) => handleSettingChange("soundEnabled", value)}
                data-testid="switch-sound"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Message Preview</Label>
                <p className="text-sm text-muted-foreground">
                  Show message content in notifications
                </p>
              </div>
              <Switch
                checked={settings.messagePreview}
                onCheckedChange={(value) => handleSettingChange("messagePreview", value)}
                data-testid="switch-message-preview"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Privacy</CardTitle>
            </div>
            <CardDescription>
              Control your privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Read Receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Let others know when you've read their messages
                </p>
              </div>
              <Switch
                checked={settings.readReceipts}
                onCheckedChange={(value) => handleSettingChange("readReceipts", value)}
                data-testid="switch-read-receipts"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Typing Indicators</Label>
                <p className="text-sm text-muted-foreground">
                  Show when you're typing a message
                </p>
              </div>
              <Switch
                checked={settings.typingIndicators}
                onCheckedChange={(value) => handleSettingChange("typingIndicators", value)}
                data-testid="switch-typing-indicators"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Online Status</Label>
                <p className="text-sm text-muted-foreground">
                  Show your online status to others
                </p>
              </div>
              <Switch
                checked={settings.onlineStatus}
                onCheckedChange={(value) => handleSettingChange("onlineStatus", value)}
                data-testid="switch-online-status"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <CardTitle>Audio & Video</CardTitle>
            </div>
            <CardDescription>
              Select your preferred devices for calls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Microphone</Label>
              <Select
                value={selectedDevices.audioInput}
                onValueChange={(value) => handleDeviceChange("audioInput", value)}
              >
                <SelectTrigger data-testid="select-microphone">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {devices.audioInput.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Speakers</Label>
              <Select
                value={selectedDevices.audioOutput}
                onValueChange={(value) => handleDeviceChange("audioOutput", value)}
              >
                <SelectTrigger data-testid="select-speakers">
                  <SelectValue placeholder="Select speakers" />
                </SelectTrigger>
                <SelectContent>
                  {devices.audioOutput.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Camera</Label>
              <Select
                value={selectedDevices.videoInput}
                onValueChange={(value) => handleDeviceChange("videoInput", value)}
              >
                <SelectTrigger data-testid="select-camera">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.videoInput.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
