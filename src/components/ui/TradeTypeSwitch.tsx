import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type TradeType = 'trade' | 'no_trade';

const tradeTypes: { value: TradeType; label: string }[] = [
  { value: 'trade', label: 'Trade' },
  { value: 'no_trade', label: 'No Trade' },
];

interface TradeTypeSwitchProps {
  isPaperTrade: boolean;
  noTradeTaken: boolean;
  onChange: (isPaperTrade: boolean, noTradeTaken: boolean) => void;
}

export function TradeTypeSwitch({ isPaperTrade, noTradeTaken, onChange }: TradeTypeSwitchProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Set hasMounted after a brief delay to prevent initial animation
    const timer = setTimeout(() => setHasMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Determine current value from props
  const value: TradeType = noTradeTaken ? 'no_trade' : 'trade';

  const handleChange = (newValue: TradeType) => {
    switch (newValue) {
      case 'trade':
        onChange(false, false);
        break;
      case 'no_trade':
        onChange(false, true);
        break;
    }
  };

  const isTradeActive = value === 'trade';

  return (
    <div className="relative flex gap-0 rounded-xl overflow-hidden border border-border/60 bg-background/90 p-1">
      {/* Sliding background */}
      <div
        className={cn(
          "absolute top-1 bottom-1 rounded-lg pointer-events-none shadow-sm",
          hasMounted && "transition-all duration-500",
          isTradeActive ? "border border-pnl-positive/30 bg-pnl-positive/10" : "border border-pnl-negative/30 bg-pnl-negative/10"
        )}
        style={{
          width: "calc(50% - 0.5rem)",
          left: isTradeActive ? "0.25rem" : "calc(50% + 0.25rem)",
        }}
      />
      
      {/* Buttons */}
      <div className="flex gap-0 w-full relative z-10">
        {tradeTypes.map((tradeType) => {
          const isActive = value === tradeType.value;
          const isPositive = tradeType.value === 'trade';
          
          return (
            <button
              key={tradeType.value}
              type="button"
              onClick={() => handleChange(tradeType.value)}
              className={cn(
                "flex-1 flex items-center justify-center h-7 px-2 text-xs font-medium rounded-lg",
                hasMounted && "transition-colors duration-500",
                isActive
                  ? isPositive ? "text-pnl-positive" : "text-pnl-negative"
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
