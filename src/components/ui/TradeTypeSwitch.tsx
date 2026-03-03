import { cn } from '@/lib/utils';

type TradeType = 'real' | 'paper' | 'no_trade';

const tradeTypes: { value: TradeType; label: string }[] = [
  { value: 'real', label: 'Real' },
  { value: 'paper', label: 'Paper' },
  { value: 'no_trade', label: 'No Trade' },
];

interface TradeTypeSwitchProps {
  isPaperTrade: boolean;
  noTradeTaken: boolean;
  onChange: (isPaperTrade: boolean, noTradeTaken: boolean) => void;
}

export function TradeTypeSwitch({ isPaperTrade, noTradeTaken, onChange }: TradeTypeSwitchProps) {
  // Determine current value from props
  const value: TradeType = noTradeTaken ? 'no_trade' : isPaperTrade ? 'paper' : 'real';

  const handleChange = (newValue: TradeType) => {
    switch (newValue) {
      case 'real':
        onChange(false, false);
        break;
      case 'paper':
        onChange(true, false);
        break;
      case 'no_trade':
        onChange(false, true);
        break;
    }
  };

  // Calculate the position of the sliding background
  const activeIndex = tradeTypes.findIndex(t => t.value === value);
  const slidePercentage = (activeIndex * 100) / tradeTypes.length;

  return (
    <div className="relative flex gap-0 rounded-xl overflow-hidden border border-border/60 bg-background/90 p-1">
      {/* Sliding background */}
      <div
        className="absolute top-1 bottom-1 transition-all duration-500 rounded-lg bg-pnl-positive/10 border border-pnl-positive/30 shadow-sm"
        style={{
          width: `calc(${100 / tradeTypes.length}% - 0.5rem)`,
          left: `calc(${slidePercentage}% + 0.25rem)`,
        }}
      />
      
      {/* Buttons */}
      <div className="flex gap-0 w-full relative z-10">
        {tradeTypes.map((tradeType) => {
          const isActive = value === tradeType.value;
          
          return (
            <button
              key={tradeType.value}
              type="button"
              onClick={() => handleChange(tradeType.value)}
              className={cn(
                "flex-1 flex items-center justify-center h-7 px-2 text-xs font-medium transition-colors duration-500 rounded-lg",
                isActive
                  ? "text-pnl-positive"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <span>{tradeType.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
