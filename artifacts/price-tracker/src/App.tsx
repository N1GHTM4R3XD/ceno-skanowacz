import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { AppProvider, useAppContext } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ProfilePicker } from './pages/ProfilePicker';
import { Dashboard } from './pages/Dashboard';
import { Historia } from './pages/Historia';
import { Profil } from './pages/Profil';

const queryClient = new QueryClient();

function MainLayout() {
  const { userProfile } = useAppContext();

  // Show profile picker when no user is selected
  if (!userProfile) {
    return <ProfilePicker />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="container mx-auto max-w-5xl px-4 pt-6 pb-24 md:pb-12">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/historia" component={Historia} />
          <Route path="/profil" component={Profil} />
          <Route component={Dashboard} />
        </Switch>
      </main>
      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppProvider>
            <MainLayout />
          </AppProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
