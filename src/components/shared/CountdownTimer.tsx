import { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  className?: string;
  label?: string;
}

export function CountdownTimer({ className, label = 'Resets in' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntil0430UTC());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntil0430UTC());
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

function getTimeUntil0430UTC(): number {
  const now = new Date();
  const next0430 = new Date(now);
  
  // Set to 04:30:00 UTC today
  next0430.setUTCHours(4, 30, 0, 0);
  
  // If we've passed 04:30 UTC today, move to tomorrow
  if (now >= next0430) {
    next0430.setUTCDate(next0430.getUTCDate() + 1);
  }
  
  return next0430.getTime() - now.getTime();
}
