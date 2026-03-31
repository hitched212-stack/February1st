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

const QUICK_EVENT_TEMPLATES: Array<{ title: string; impact: NewsImpact }> = [
  { title: 'Non-Farm Payrolls', impact: 'high' },
  { title: 'CPI', impact: 'high' },
  { title: 'FOMC Rate Decision', impact: 'high' },
  { title: 'GDP', impact: 'medium' },
  { title: 'Unemployment Rate', impact: 'medium' },
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

  const addTemplateEvent = (template: { title: string; impact: NewsImpact }) => {
    syncEvents([
      ...localSelectedEvents,
      {
        title: template.title,
        impact: template.impact,
        currency: quickCurrency,
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

  const getImpactTone = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'border-red-500/30 bg-red-500/10 text-red-400';
      case 'medium':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
      case 'low':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      default:
        return 'border-border/60 bg-background/40 text-muted-foreground';
    }
  };

  return (
    <div className="space-y-5 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            <NewsIcon className="h-3.5 w-3.5" />
            News
          </div>
          <div>
            <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Economic News</h3>
            <p className="text-sm text-muted-foreground">Track news events that affected this trade.</p>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-1 rounded-[22px] border border-border/50 bg-black/20 p-1">
        <div
          className={cn(
            'absolute top-1 bottom-1 rounded-[15px] border transition-all duration-300',
            hasNews
              ? 'left-1 right-[calc(50%+0.125rem)] border-violet-400/35 bg-[linear-gradient(180deg,rgba(167,139,250,0.32),rgba(167,139,250,0.22))]'
              : 'left-[calc(50%+0.125rem)] right-1 border-zinc-400/30 bg-[linear-gradient(180deg,rgba(161,161,170,0.16),rgba(161,161,170,0.08))]'
          )}
        />
        <button
          type="button"
          onClick={() => onHasNewsChange(true)}
          className={cn(
            'relative z-10 h-11 rounded-[15px] text-sm font-semibold font-display transition-colors flex items-center justify-center gap-2',
            hasNews ? 'text-white' : 'text-muted-foreground hover:text-foreground'
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
            'relative z-10 h-11 rounded-[15px] text-sm font-semibold font-display transition-colors flex items-center justify-center gap-2',
            !hasNews ? 'text-zinc-200' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <X className="h-3.5 w-3.5" />
          No
        </button>
      </div>

      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        hasNews ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
      )}>
      <div className="overflow-hidden">
        <div className="space-y-4 pt-1">
          <div className="space-y-3 rounded-2xl border border-border/45 bg-background/20 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Quick add</Label>
              <span className="text-[10px] text-muted-foreground px-2.5 py-1 rounded-xl bg-background/40 border border-border/50 uppercase tracking-[0.14em] font-semibold">
                {localSelectedEvents.length} event{localSelectedEvents.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_EVENT_TEMPLATES.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  onClick={() => addTemplateEvent(template)}
                  className="group rounded-xl border border-border/55 bg-background/30 px-2.5 py-2.5 text-left transition-all hover:bg-background/50 hover:border-border"
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    <span className={cn('shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide', getImpactTone(template.impact))}>
                      {template.impact}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">
                    {template.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {localSelectedEvents.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={addManualEvent}
              className="h-11 rounded-2xl border-dashed border-border/60 bg-background/30 hover:bg-background/45"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First News Event
            </Button>
          ) : (
            <div className="space-y-3">
              {localSelectedEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/55 bg-gradient-to-br from-background/55 to-background/25 p-3.5 sm:p-4 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-2.5 py-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Event {idx + 1}</span>
                        {event.impact ? (
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', getImpactTone(event.impact))}>
                            {event.impact}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add the event name, expected impact, release time, and currency.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/35 p-1">
                      <button
                        type="button"
                        onClick={() => duplicateManualEvent(idx)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-colors"
                        title="Duplicate event"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeManualEvent(idx)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                        title="Remove event"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-6">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">News Event</Label>
                      <Input
                        value={event.title || ''}
                        onChange={(e) => updateManualEvent(idx, 'title', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addManualEvent(idx);
                          }
                        }}
                        placeholder="Non-Farm Payrolls"
                        className="h-10 rounded-xl bg-background/70 border-border/60 text-sm sm:text-[15px]"
                      />
                    </div>

                    <div className="space-y-1.5 lg:col-span-2 min-w-0">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Impact</Label>
                      <Select
                        value={event.impact || ''}
                        onValueChange={(value) => updateManualEvent(idx, 'impact', value)}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background/70 border-border/60 text-sm min-w-0">
                          <SelectValue placeholder="Impact" />
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

                    <div className="space-y-1.5 lg:col-span-2 min-w-0">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Time</Label>
                      <Input
                        type="time"
                        value={event.time || ''}
                        onChange={(e) => updateManualEvent(idx, 'time', e.target.value)}
                        className="h-10 rounded-xl bg-background/70 border-border/60 text-sm min-w-0"
                      />
                    </div>

                    <div className="space-y-1.5 lg:col-span-2 min-w-0">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Currency</Label>
                      <Input
                        value={event.currency || ''}
                        onChange={(e) => updateManualEvent(idx, 'currency', e.target.value)}
                        placeholder="USD"
                        className="h-10 rounded-xl bg-background/70 border-border/60 uppercase text-sm min-w-0"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addManualEvent}
                className="h-11 w-full rounded-2xl border-dashed border-border/60 bg-background/30 hover:bg-background/45"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Event
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
