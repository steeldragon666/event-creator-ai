import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Calendar, Music } from "lucide-react";
import { useLocation } from "wouter";

export default function Campaigns() {
  const [, setLocation] = useLocation();
  
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "generating": return "bg-blue-500";
      case "draft": return "bg-gray-500";
      case "archived": return "bg-gray-300";
      default: return "bg-gray-500";
    }
  };

  const getArchetypeLabel = (archetype: string) => {
    return archetype.replace('_', ' ').split(' ').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-12 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Event Campaigns</h1>
            <p className="text-muted-foreground mt-2">
              Create stunning promotional materials for your events
            </p>
          </div>
          <Button 
            size="lg"
            onClick={() => setLocation("/app/campaigns/new")}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            New Campaign
          </Button>
        </div>

        {/* Campaigns Grid */}
        {campaigns && campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign: any) => (
              <Card 
                key={campaign.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/app/campaigns/${campaign.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{campaign.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getArchetypeLabel(campaign.archetype)}
                        </Badge>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      <span>{campaign.archetype === 'club_night' ? 'Club Night' : campaign.archetype === 'festival' ? 'Festival' : 'Show'}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full">
                    View Campaign
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle>No Campaigns Yet</CardTitle>
              <CardDescription>
                Get started by creating your first event campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button 
                size="lg"
                onClick={() => setLocation("/app/campaigns/new")}
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
