import { MessageCircle, Video, Users, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: MessageCircle,
    title: "Real-time Messaging",
    description: "Instant message delivery with read receipts and typing indicators for seamless conversations.",
  },
  {
    icon: Video,
    title: "Voice & Video Calls",
    description: "Crystal-clear audio and HD video calls with anyone, anywhere in the world.",
  },
  {
    icon: Users,
    title: "Group Chats",
    description: "Create groups for teams, friends, or communities with easy member management.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your conversations are protected with industry-standard security practices.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built for speed with optimized real-time infrastructure for instant responses.",
  },
  {
    icon: Globe,
    title: "Works Everywhere",
    description: "Access your chats from any device with our responsive, mobile-friendly design.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg" data-testid="text-brand-name">ChatFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" asChild data-testid="button-signin">
              <a href="/signin">Sign In</a>
            </Button>
            <Button asChild data-testid="button-signup">
              <a href="/signup">Sign Up</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Connect with anyone,
              <br />
              <span className="text-primary">anywhere, instantly</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-hero-description">
              Experience seamless communication with real-time messaging, crystal-clear voice and video calls, and powerful group collaboration features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/signup">Get Started Free</a>
              </Button>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4" data-testid="text-features-title">
              Everything you need to stay connected
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              From quick messages to important video calls, ChatFlow has all the tools you need for effective communication.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of users who are already enjoying seamless communication with ChatFlow.
            </p>
            <Button size="lg" asChild data-testid="button-cta-signup">
              <a href="/signup">Create Your Account</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p data-testid="text-footer-copyright">&copy; {new Date().getFullYear()} ChatFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
