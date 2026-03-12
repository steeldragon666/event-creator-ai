import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Streamdown } from 'streamdown';

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight">
              Event Creator <span className="text-primary">AI</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Generate stunning promotional campaigns for your events with AI-powered design and consistent visual identity
            </p>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4">
            {user ? (
              <Button size="lg" onClick={() => window.location.href = "/app/campaigns"} className="gap-2">
                Go to Campaigns
              </Button>
            ) : (
              <Button size="lg" onClick={() => window.location.href = getLoginUrl()} className="gap-2">
                Get Started
              </Button>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">Campaign DNA</h3>
              <p className="text-sm text-muted-foreground">
                AI generates a consistent visual identity with colors, typography, and style
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">Dual Creative Engines</h3>
              <p className="text-sm text-muted-foreground">
                Choose between structured templates or generative AI for each asset
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">Multi-Platform Assets</h3>
              <p className="text-sm text-muted-foreground">
                Generate Instagram posts, stories, and ticketing banners in one click
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
