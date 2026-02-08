import { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  className?: string;
  label?: string;
}

export function CountdownTimer({ className, label = 'Resets in' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntil0000UTC());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntil0000UTC());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatted = useMemo(() => {
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  return (
    <div className={className}>
      <span className="text-muted-foreground text-sm">{label} </span>
      <span className="font-mono text-foreground font-medium">{formatted}</span>
    </div>
  );
}

function getTimeUntil0000UTC(): number {
  const now = new Date();
  const next0000 = new Date(now);
  
  // Set to 00:00:00 UTC tomorrow
  next0000.setUTCDate(next0000.getUTCDate() + 1);
  next0000.setUTCHours(0, 0, 0, 0);
  
  return next0000.getTime() - now.getTime();
}
