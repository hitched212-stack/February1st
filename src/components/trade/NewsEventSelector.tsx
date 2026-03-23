import { useState, useEffect } from 'react';
import { Check, X, Plus, Copy } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { NEWS_IMPACTS, NewsImpact } from '@/types/trade';

// Custom news/globe icon - matches navigation
const NewsIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

interface NewsEvent {
  title: string;
  impact: NewsImpact | '';
  currency?: string;
  time?: string;
}

interface SelectedNewsEvent {
  title: string;
  impact: string;
  currency?: string;
  time?: string;
}

interface NewsEventSelectorProps {
  date: string | null;
  hasNews: boolean;
  selectedEvents?: SelectedNewsEvent[];
  // Legacy single-select props for backward compatibility
  selectedNewsTitle?: string;
  newsImpact?: string;
  onHasNewsChange: (hasNews: boolean) => void;
  onNewsSelect: (title: string, impact: string) => void;
  onMultiNewsSelect?: (events: SelectedNewsEvent[]) => void;
}

const QUICK_EVENT_TEMPLATES: Array<{ title: string; impact: NewsImpact; currency: string }> = [
  { title: 'Non-Farm Payrolls', impact: 'high', currency: 'USD' },
  { title: 'CPI', impact: 'high', currency: 'USD' },
  { title: 'FOMC Rate Decision', impact: 'high', currency: 'USD' },
  { title: 'GDP', impact: 'medium', currency: 'USD' },
  { title: 'Unemployment Rate', impact: 'medium', currency: 'USD' },
];

export function NewsEventSelector({
  date,
  hasNews,
  selectedEvents = [],
  selectedNewsTitle,
  newsImpact,
  onHasNewsChange,
  onNewsSelect,
  onMultiNewsSelect,
}: NewsEventSelectorProps) {
  const createEmptyEvent = (): NewsEvent => ({
    title: '',
    impact: '',
    currency: '',
    time: '',
  });

  const [localSelectedEvents, setLocalSelectedEvents] = useState<SelectedNewsEvent[]>(() => {
    if (selectedEvents.length > 0) return selectedEvents;
    if (selectedNewsTitle && newsImpact) return [{ title: selectedNewsTitle, impact: newsImpact }];
    return [];
  });

  // Sync with props
  useEffect(() => {
    if (selectedEvents.length > 0) {
      setLocalSelectedEvents(selectedEvents);
    } else if (selectedNewsTitle && newsImpact) {
      setLocalSelectedEvents([{ title: selectedNewsTitle, impact: newsImpact }]);
    } else if (!hasNews) {
      setLocalSelectedEvents([]);
    }
  }, [selectedEvents, selectedNewsTitle, newsImpact, hasNews]);
  const syncEvents = (updated: SelectedNewsEvent[]) => {
    setLocalSelectedEvents(updated);
    if (onMultiNewsSelect) {
      onMultiNewsSelect(updated);
    }
    if (updated.length > 0) {
      const first = updated[0];
      if ((first.title || '').trim() || (first.impact || '').trim()) {
        onNewsSelect(first.title, first.impact);
      }
    } else {
      onNewsSelect('', '');
    }
  };

  const buildNextEvent = (): SelectedNewsEvent => {
    const lastWithImpact = [...localSelectedEvents].reverse().find((e) => (e.impact || '').trim());
    const lastWithCurrency = [...localSelectedEvents].reverse().find((e) => (e.currency || '').trim());

    return {
      title: '',
      impact: lastWithImpact?.impact || '',
      currency: lastWithCurrency?.currency || '',
      time: '',
    };
  };

  const addManualEvent = (afterIndex?: number) => {
    const next = buildNextEvent();
    if (typeof afterIndex === 'number') {
      const updated = [...localSelectedEvents];
      updated.splice(afterIndex + 1, 0, next);
      syncEvents(updated);
      return;
    }
    syncEvents([...localSelectedEvents, next]);
  };

  const addTemplateEvent = (template: { title: string; impact: NewsImpact; currency: string }) => {
    syncEvents([
      ...localSelectedEvents,
      {
        title: template.title,
        impact: template.impact,
        currency: template.currency,
        time: '',
      },
    ]);
  };

  const updateManualEvent = (index: number, field: keyof SelectedNewsEvent, value: string) => {
    const updated = localSelectedEvents.map((event, idx) => {
      if (idx !== index) return event;
      if (field === 'currency') {
        return { ...event, [field]: value.toUpperCase().slice(0, 6) };
      }
      return { ...event, [field]: value };
    });
    syncEvents(updated);
  };

  const removeManualEvent = (index: number) => {
    const updated = localSelectedEvents.filter((_, idx) => idx !== index);
    syncEvents(updated);
  };

  const duplicateManualEvent = (index: number) => {
    const source = localSelectedEvents[index];
    if (!source) return;

    const updated = [...localSelectedEvents];
    updated.splice(index + 1, 0, {
      ...source,
      title: source.title,
    });
    syncEvents(updated);
  };

  useEffect(() => {
    if (hasNews && localSelectedEvents.length === 0) {
      const starter = [createEmptyEvent()];
      setLocalSelectedEvents(starter);
      if (onMultiNewsSelect) onMultiNewsSelect(starter);
    }
  }, [hasNews]);

  return (
    <div className="space-y-3 p-3 sm:p-3.5 rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg border border-border/60 bg-background/30 flex items-center justify-center">
            <NewsIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <Label className="text-xs sm:text-sm font-semibold font-display text-foreground">Economic News</Label>
        </div>
        <span className="text-[10px] sm:text-xs px-2 py-1 rounded-md border border-border/60 bg-background/30 text-muted-foreground">
          Optional
        </span>
      </div>
      
      <div className="flex justify-center">
        <div className="w-full max-w-md grid grid-cols-2 gap-1.5 rounded-xl border border-border/60 bg-background/25 p-1">
        <button 
          type="button" 
          onClick={() => onHasNewsChange(true)} 
          className={cn(
            "h-8.5 sm:h-9 rounded-lg text-sm font-semibold font-display transition-all flex items-center justify-center gap-2", 
            hasNews 
              ? "bg-[#9b8cff] text-white shadow-sm" 
              : "text-muted-foreground hover:bg-muted/55 hover:text-foreground"
          )}
        >
          <Check className="h-3.5 w-3.5" />
          Yes
        </button>
        <button 
          type="button" 
          onClick={() => {
            onHasNewsChange(false);
            setLocalSelectedEvents([]);
            onNewsSelect('', '');
            if (onMultiNewsSelect) onMultiNewsSelect([]);
          }} 
          className={cn(
            "h-8.5 sm:h-9 rounded-lg text-sm font-semibold font-display transition-all flex items-center justify-center gap-2", 
            !hasNews 
              ? "bg-[#9b8cff] text-white shadow-sm" 
              : "text-muted-foreground hover:bg-muted/55 hover:text-foreground"
          )}
        >
          <X className="h-3.5 w-3.5" />
          No
        </button>
        </div>
      </div>

      {hasNews && (
        <div className="space-y-4 pt-1 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-2">
            {QUICK_EVENT_TEMPLATES.map((template) => (
              <button
                key={`${template.title}-${template.currency}`}
                type="button"
                onClick={() => addTemplateEvent(template)}
                className="h-8 px-2.5 rounded-lg border border-border/60 bg-background/25 hover:bg-muted/50 text-xs text-foreground/90"
              >
                {template.title}
                <span className="ml-1.5 text-muted-foreground">• {template.currency}</span>
              </button>
            ))}
          </div>

          {localSelectedEvents.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={addManualEvent}
              className="h-10 rounded-xl border-border/60 bg-background/30 hover:bg-muted/45"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First News Event
            </Button>
          ) : (
            <div className="space-y-3">
              {localSelectedEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/60 bg-background/35 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Event {idx + 1}
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => duplicateManualEvent(idx)}
                        className="h-7 w-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                        title="Duplicate event"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeManualEvent(idx)}
                        className="h-7 w-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center"
                        title="Remove event"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-6">
                    <div className="md:col-span-3 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">News Event</Label>
                      <Input
                        value={event.title || ''}
                        onChange={(e) => updateManualEvent(idx, 'title', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addManualEvent(idx);
                          }
                        }}
                        placeholder="e.g. Non-Farm Payrolls"
                        className="h-9 bg-background/70 border-border/60 text-sm"
                      />
                    </div>

                    <div className="md:col-span-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Impact</Label>
                      <Select
                        value={event.impact || ''}
                        onValueChange={(value) => updateManualEvent(idx, 'impact', value)}
                      >
                        <SelectTrigger className="h-9 bg-background/70 border-border/60 text-sm">
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {NEWS_IMPACTS.map((impact) => (
                            <SelectItem key={impact.value} value={impact.value}>
                              <span className={cn('font-medium', impact.color)}>{impact.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Time</Label>
                      <Input
                        type="time"
                        value={event.time || ''}
                        onChange={(e) => updateManualEvent(idx, 'time', e.target.value)}
                        className="h-9 bg-background/70 border-border/60 text-sm"
                      />
                    </div>

                    <div className="md:col-span-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Currency</Label>
                      <Input
                        value={event.currency || ''}
                        onChange={(e) => updateManualEvent(idx, 'currency', e.target.value)}
                        placeholder="e.g. USD"
                        className="h-9 bg-background/70 border-border/60 uppercase text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addManualEvent}
                className="h-10 rounded-xl border-border/60 bg-background/30 hover:bg-muted/45"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Event
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
