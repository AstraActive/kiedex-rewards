import { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  className?: string;
  label?: string;
}

export function CountdownTimer({ className, label = 'Resets in' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnightUTC());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnightUTC());
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

function getTimeUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}
