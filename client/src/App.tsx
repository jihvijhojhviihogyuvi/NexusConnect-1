import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { CallProvider } from "@/contexts/CallContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import DevPage from "@/pages/DevPage";
import Signin from "@/pages/Signin";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const needsOnboarding = isAuthenticated && user && !user.firstName;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center animate-pulse">
            <svg
              className="w-6 h-6 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/signin" component={Signin} />
        <Route path="/signup" component={Signup} />
        <Route component={Landing} />
      </Switch>
    );
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return (
    <SocketProvider>
      <CallProvider>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/viewer" component={Home} />
          <Route path="/dev" component={DevPage} />
          <Route component={NotFound} />
        </Switch>
      </CallProvider>
    </SocketProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
