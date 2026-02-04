import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from '@/config/wagmi';
import { AuthProvider } from '@/contexts/AuthContext';
import { WalletProvider } from '@/contexts/WalletContext';

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Component to capture referral code from URL - runs on every route change
function ReferralCodeCapture() {
  const location = useLocation();
  
  useEffect(() => {
    // Check URL search params for referral code
    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get('ref');
    
    if (refCode) {
      // Always update if ref code is in URL (user clicked a referral link)
      localStorage.setItem('referral_code', refCode);
      // Also store in sessionStorage as backup
      sessionStorage.setItem('referral_code', refCode);
      console.log('Referral code captured from URL:', refCode);
    } else {
      // On page load without ref param, check if sessionStorage has a code that localStorage lost
      const sessionCode = sessionStorage.getItem('referral_code');
      const localCode = localStorage.getItem('referral_code');
      if (sessionCode && !localCode) {
        localStorage.setItem('referral_code', sessionCode);
        console.log('Referral code restored from session:', sessionCode);
      }
    }
  }, [location.search, location.pathname]);
  
  return null;
}

// Lazy load pages for code splitting and better performance
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Trade = lazy(() => import("./pages/Trade"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Referral = lazy(() => import("./pages/Referral"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Settings = lazy(() => import("./pages/Settings"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={darkTheme({ accentColor: '#22c55e' })}>
        <AuthProvider>
          <WalletProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ReferralCodeCapture />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/trade" element={<Trade />} />
                    <Route path="/rewards" element={<Rewards />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/referral" element={<Referral />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </WalletProvider>
        </AuthProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
