import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight } from 'lucide-react';

export function FinalCTASection() {
  const { user } = useAuth();

  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <Card className="bg-primary/5 border-primary/20 max-w-3xl mx-auto">
        <CardContent className="py-10 md:py-14 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            Join KieDex Early
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-lg mx-auto">
            Sign in, connect your wallet, trade, and start earning KDX daily 
            as part of the future airdrop ecosystem.
          </p>
          
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="group min-w-[200px]">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg" className="min-w-[200px]">
                Sign In
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
