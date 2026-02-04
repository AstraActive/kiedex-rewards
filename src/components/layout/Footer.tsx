import { Link } from 'react-router-dom';
import logo from '@/assets/logo.svg';

export function Footer() {
  return <footer className="border-t border-border bg-background py-8 mt-auto">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="KieDex" className="h-7" />
          </div>
          
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors">
              Support
            </Link>
          </nav>
        </div>
        
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} KieDex. All rights reserved.
          </p>
        </div>
      </div>
    </footer>;
}
