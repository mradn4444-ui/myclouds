import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CanvasWorkspace from "@/components/CanvasWorkspace";
import AuthPage from "@/pages/auth";
import SignupPage from "@/pages/auth-signup";
import AuthCallback from "@/pages/auth-callback";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={CanvasWorkspace} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/dashboard">
        {() => { window.location.replace('/'); return null; }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
