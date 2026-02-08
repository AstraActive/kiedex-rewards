import { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  className?: string;
  label?: string;
}

export function CountdownTimer({ className, label = 'Resets in' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntil0500UTC());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntil0500UTC());
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

function getTimeUntil0500UTC(): number {
  const now = new Date();
  const next0500 = new Date(now);
  
  // Set to 05:00:00 UTC today
  next0500.setUTCHours(5, 0, 0, 0);
  
  // If we've passed 05:00 UTC today, move to tomorrow
  if (now >= next0500) {
    next0500.setUTCDate(next0500.getUTCDate() + 1);
  }
  
  return next0500.getTime() - now.getTime();
}
