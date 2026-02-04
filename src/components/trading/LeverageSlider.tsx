import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface LeverageSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
}

export function LeverageSlider({ value, onValueChange, className }: LeverageSliderProps) {
  const marks = [1, 5, 10, 20, 25, 50];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Leverage</span>
        <span className="font-mono font-bold text-primary text-lg">{value}x</span>
      </div>
      
      <Slider
        value={[value]}
        onValueChange={(vals) => onValueChange(vals[0])}
        min={1}
        max={50}
        step={1}
        className="py-2"
      />
      
      <div className="flex justify-between">
        {marks.map((mark) => (
          <button
            key={mark}
            onClick={() => onValueChange(mark)}
            className={cn(
              "text-xs px-2 py-1 rounded transition-colors",
              value === mark 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {mark}x
          </button>
        ))}
      </div>
    </div>
  );
}
