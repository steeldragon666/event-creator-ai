import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Campaigns from "@/pages/Campaigns";
import NewCampaign from "@/pages/NewCampaign";
import CampaignWizard from "@/pages/CampaignWizard";
import GenerationProgress from "@/pages/GenerationProgress";
import AssetPreview from "@/pages/AssetPreview";
import AssetCustomizer from "@/pages/AssetCustomizer";
import AssetDelivery from "@/pages/AssetDelivery";
import ExportAssets from "@/pages/ExportAssets";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/app/campaigns"} component={Campaigns} />
      <Route path={"/app/campaigns/new"} component={NewCampaign} />
      <Route path={"/app/campaigns/:id/wizard"} component={CampaignWizard} />
      <Route path={"/app/campaigns/:id/v/:vid/generate"} component={GenerationProgress} />
      <Route path={"/app/campaigns/:id/v/:vid/assets"} component={AssetPreview} />
      <Route path={"/app/campaigns/:id/v/:vid/customize"} component={AssetCustomizer} />
      <Route path={"/app/campaigns/:id/v/:vid/delivery"} component={AssetDelivery} />
      <Route path={"/app/campaigns/:id/v/:vid/export"} component={ExportAssets} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
