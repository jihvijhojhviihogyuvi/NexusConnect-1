import { MessageCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-404-title">
            Page Not Found
          </h1>
          <p className="text-muted-foreground mb-6" data-testid="text-404-description">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild data-testid="button-go-home">
            <a href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
