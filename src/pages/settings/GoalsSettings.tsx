import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { useAccount } from '@/hooks/useAccount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrencySymbol, PnlGoals } from '@/types/trade';

export default function GoalsSettings() {
  const navigate = useNavigate();
  const { settings, setGoals } = useSettings();
  const { activeAccount } = useAccount();
  const { toast } = useToast();
  const currencySymbol = getCurrencySymbol((activeAccount?.currency || settings.currency) as any);
  const [goals, setGoalsLocal] = useState({
    daily: settings.goals.daily.toString(),
    weekly: settings.goals.weekly.toString(),
    monthly: settings.goals.monthly.toString(),
    yearly: settings.goals.yearly.toString()
  });

  useEffect(() => {
    setGoalsLocal({
      daily: settings.goals.daily.toString(),
      weekly: settings.goals.weekly.toString(),
      monthly: settings.goals.monthly.toString(),
      yearly: settings.goals.yearly.toString()
    });
  }, [settings.goals]);

  const handleSave = async () => {
    const numericGoals: PnlGoals = {
      daily: parseFloat(goals.daily) || 0,
      weekly: parseFloat(goals.weekly) || 0,
      monthly: parseFloat(goals.monthly) || 0,
      yearly: parseFloat(goals.yearly) || 0
    };
    await setGoals(numericGoals);
    toast({
      title: 'Goals updated',
      description: 'Your P&L goals have been saved',
      variant: 'success'
    });
  };

  const goalPeriods = [{
    key: 'daily' as const,
    label: 'Daily'
  }, {
    key: 'weekly' as const,
    label: 'Weekly'
  }, {
    key: 'monthly' as const,
    label: 'Monthly'
  }, {
    key: 'yearly' as const,
    label: 'Yearly'
  }];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-4 pt-6 pb-5 md:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-5 w-1 rounded-full bg-[#9b8cff]" aria-hidden="true" />
          <div>
            <h1 className="text-[11px] font-bold uppercase tracking-widest text-foreground">P&L Goals</h1>
            <p className="text-xs text-muted-foreground">Set and refine your trading targets</p>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-6 lg:px-8 space-y-4">
        {/* Goal Settings - Compact Row Layout */}
        {goalPeriods.map(({ key, label }) => (
          <div 
            key={key} 
            className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/90 transition-colors relative"
          >
            {/* Label */}
            <div className="relative flex-1">
              <span className="text-[11px] font-bold font-display uppercase tracking-widest text-foreground">{label}</span>
            </div>

            {/* Value with Border */}
            <div className="relative flex items-center gap-2 flex-shrink-0 min-w-[136px] px-3 py-2.5 rounded-lg border border-border/60 bg-background/70">
              <span className="text-sm text-muted-foreground font-display font-bold">{currencySymbol}</span>
              <input
                type="number"
                value={goals[key]}
                onChange={(e) => setGoalsLocal((prev) => ({
                  ...prev,
                  [key]: e.target.value
                }))}
                className="w-20 px-0 py-0 h-auto font-display font-bold tabular-nums bg-transparent border-0 focus:ring-0 text-base text-right text-foreground"
                placeholder="0"
                step="0.01"
              />
            </div>
          </div>
        ))}

        {/* Save Button */}
        <div className="sticky bottom-20 md:bottom-6 pt-6">
          <Button
            onClick={handleSave}
            className="w-full h-12 bg-white text-black hover:bg-white/90 rounded-2xl shadow-lg font-display font-bold tracking-wide"
          >
            Save Goals
          </Button>
        </div>
      </div>
    </div>
  );
}