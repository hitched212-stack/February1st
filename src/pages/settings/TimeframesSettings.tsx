import { useTradingPreferences } from '@/hooks/useTradingPreferences';
import { Loader2, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ALL_TIMEFRAMES } from '@/lib/timeframes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { usePreferences } from '@/hooks/usePreferences';

export default function TimeframesSettings() {
  const {
    selectedTimeframes,
    isLoading,
    setSelectedTimeframes,
    toggleTimeframe
  } = useTradingPreferences();
  const { preferences } = usePreferences();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const profitColor = preferences.customColors?.winColor || 'hsl(var(--pnl-positive))';

  const handleAddTimeframe = (value: string) => {
    if (value && !selectedTimeframes.includes(value)) {
      toggleTimeframe(value);
      toast({
        title: 'Timeframe added'
      });
    }
  };

  const handleRemoveTimeframe = (value: string) => {
    toggleTimeframe(value);
    toast({
      title: 'Timeframe removed'
    });
  };

  const selectAllTimeframes = async () => {
    const all = ALL_TIMEFRAMES.map((tf) => tf.value);
    await setSelectedTimeframes(all);
    toast({ title: 'All timeframes selected' });
  };

  const clearAllTimeframes = async () => {
    await setSelectedTimeframes([]);
    toast({ title: 'All timeframes cleared' });
  };

  const availableTimeframes = ALL_TIMEFRAMES.filter(
    (tf) => !selectedTimeframes.includes(tf.value)
  );

  const filteredAvailableTimeframes = availableTimeframes.filter((tf) =>
    tf.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSelectedTimeframes = selectedTimeframes.filter((value) => {
    const timeframe = ALL_TIMEFRAMES.find((tf) => tf.value === value);
    return timeframe && timeframe.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen pb-32">
      <header className="px-4 pt-6 pb-6 md:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-5 w-1 rounded-full bg-[#9b8cff]" aria-hidden="true" />
          <div>
            <h1 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Chart Timeframes</h1>
            <p className="text-xs text-muted-foreground">Choose and refine your chart timeframe options</p>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            These timeframes will appear as options when logging trades, helping you track which charts you analyzed for each trade.
          </p>
        </div>
      </header>

      <div className="px-4 md:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Timeframes */}
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground mb-3">Add Timeframes</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search timeframes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-background/50"
                />
              </div>
            </div>

            <div className="p-4 max-h-[463px] overflow-y-auto">
              {filteredAvailableTimeframes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No matching timeframes found' : 'All timeframes selected'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableTimeframes.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => handleAddTimeframe(tf.value)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 active:scale-[0.98] text-left group"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {tf.label}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Timeframes */}
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Selected Timeframes</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTimeframes.length} timeframe
                  {selectedTimeframes.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllTimeframes}
                  className="h-8 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllTimeframes}
                  className="h-8 text-xs text-muted-foreground"
                  disabled={selectedTimeframes.length === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="p-4 max-h-[463px] overflow-y-auto">
              {selectedTimeframes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No timeframes selected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add timeframes from the list on the left
                  </p>
                </div>
              ) : filteredSelectedTimeframes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No matching timeframes in selection
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSelectedTimeframes.map((value) => {
                    const timeframe = ALL_TIMEFRAMES.find((tf) => tf.value === value);
                    if (!timeframe) return null;
                    
                    return (
                      <div
                        key={value}
                        className="flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 active:scale-[0.98] group cursor-default"
                        style={{
                          backgroundColor: `${profitColor}15`,
                          borderColor: `${profitColor}30`
                        }}
                      >
                        <span className="text-sm font-medium text-foreground">
                          {timeframe.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTimeframe(value)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground transition-all duration-200"
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}