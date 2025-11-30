import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function Onboarding() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("PATCH", "/api/auth/user", { firstName, lastName });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">ChatFlow</span>
          </div>
          <CardTitle data-testid="text-onboarding-title">Set Up Your Profile</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Complete your profile to get started
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleComplete} className="space-y-4">
            <div>
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name (Optional)
              </label>
              <Input
                id="firstName"
                data-testid="input-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name (Optional)
              </label>
              <Input
                id="lastName"
                data-testid="input-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-complete-onboarding"
            >
              {isLoading ? "Setting up..." : "Get Started"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            You can skip this and update your profile later in settings
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
