import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';

interface AppLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  showMobileNav?: boolean;
}

export function AppLayout({ children, showFooter = true, showMobileNav = true }: AppLayoutProps) {
  const { user } = useAuth();

  // Hide footer when user is logged in (authenticated app pages)
  const shouldShowFooter = showFooter && !user;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className={`flex-1 ${user && showMobileNav ? 'pb-20 md:pb-0' : ''}`}>
        {children}
      </main>
      {shouldShowFooter && <Footer />}
      {user && showMobileNav && <MobileNav />}
    </div>
  );
}
