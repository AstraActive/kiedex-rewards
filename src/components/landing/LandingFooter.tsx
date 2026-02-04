import { Link } from 'react-router-dom';
import logo from '@/assets/logo.svg';

const footerLinks = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Support', href: '/support' },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container py-8 md:py-12">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={logo} alt="KieDex" className="h-7" />
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-4 md:gap-8">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} KieDex. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
