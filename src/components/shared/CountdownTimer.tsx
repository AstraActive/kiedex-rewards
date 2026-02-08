import { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  className?: string;
  label?: string;
}

export function CountdownTimer({ className, label = 'Resets in' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntil0310UTC());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntil0310UTC());
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

function getTimeUntil0310UTC(): number {
  const now = new Date();
  const next0310 = new Date(now);
  
  // Set to 03:10:00 UTC today
  next0310.setUTCHours(3, 10, 0, 0);
  
  // If we've passed 03:10 UTC today, move to tomorrow
  if (now >= next0310) {
    next0310.setUTCDate(next0310.getUTCDate() + 1);
  }
  
  return next0310.getTime() - now.getTime();
}
