import { Component as ReactComponent, useEffect, type ErrorInfo, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CanvasWorkspace from "@/components/CanvasWorkspace";
import { FloatingAIButton } from "@/components/FloatingAIButton";
import HomePage from "@/pages/home";
import WelcomePage from "@/pages/welcome";
import AuthPage from "@/pages/auth";
import SignupPage from "@/pages/auth-signup";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

class AppErrorBoundary extends ReactComponent<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("MyClouds render error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="auth-page">
        <div className="auth-dot-grid" />
        <div className="auth-container">
          <div className="auth-brand">
            <span className="auth-logo">MYCLOUD</span>
            <p className="auth-tagline">Chargement interrompu</p>
          </div>
          <div className="auth-alert auth-alert-error">
            MyClouds n'a pas pu afficher cette page. {this.state.error.message}
          </div>
          <div className="auth-card">
            <a className="auth-submit-btn" href="/">Retour a l'accueil</a>
          </div>
        </div>
      </main>
    );
  }
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth()
  const [, navigate] = useLocation()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [loading, user, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="auth-spinner" style={{ width: 20, height: 20, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#fff' }} />
      </div>
    )
  }

  if (!user) return null

  return <Component />
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/app">
        {() => <ProtectedRoute component={CanvasWorkspace} />}
      </Route>
      <Route path="/welcome">
        {() => <ProtectedRoute component={WelcomePage} />}
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/signup" component={SignupPage} />
      <Route path="/dashboard">
        {() => { window.location.replace('/welcome'); return null; }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth()

  return (
    <>
      <Router />
      {user && <FloatingAIButton />}
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppErrorBoundary>
            <AuthProvider>
              <AuthenticatedApp />
            </AuthProvider>
          </AppErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
