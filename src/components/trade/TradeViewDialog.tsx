import { useState } from 'react';
import { Trade, getCurrencySymbol, NEWS_IMPACTS } from '@/types/trade';
import { usePreferences } from '@/hooks/usePreferences';
import { useAccount } from '@/hooks/useAccount';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, Link2, Pencil, X, Meh, Frown, Smile, XIcon } from 'lucide-react';
import { getTimeframeLabel } from '@/lib/timeframes';
import { SymbolIcon } from '@/components/ui/SymbolIcon';

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

// Custom trading rules icon - minimal checklist matching nav
const TradingRulesIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <polyline points="3 6 4 7 6 5" />
    <polyline points="3 12 4 13 6 11" />
    <polyline points="3 18 4 19 6 17" />
  </svg>
);
type ViewTab = 'general' | 'charts' | 'pre-market' | 'post-market' | 'emotions';
interface Forecast {
  id: string;
  symbol: string;
  direction: 'bullish' | 'bearish';
  charts: any[];
  status: 'pending' | 'completed';
  outcome: 'win' | 'loss' | null;
  date: string;
  forecast_type: 'pre_market' | 'post_market';
}
const EMOTION_LABELS = [{
  value: 1,
  label: 'Disappointed',
  icon: Frown,
  color: 'text-red-500'
}, {
  value: 2,
  label: 'Indifferent',
  icon: Meh,
  color: 'text-yellow-500'
}, {
  value: 3,
  label: 'Proud',
  icon: Smile,
  color: 'text-emerald-500'
}];

const normalizeRichText = (value?: string | null) => {
  if (!value) return '';

  const looksLikeHtml = /<\s*\w[^>]*>/i.test(value);
  if (!looksLikeHtml) return value;

  const withBreaks = value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/(div|p|li|h[1-6]|ul|ol)\s*>/gi, '\n');

  if (typeof window !== 'undefined' && 'DOMParser' in window) {
    const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
    return (doc.body.textContent || '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return withBreaks
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
interface TradeViewDialogContentProps {
  trade: Trade;
  forecasts: Record<string, Forecast>;
  currencySymbol: string;
  formatPnl: (amount: number) => string;
  onClose: () => void;
  onEdit: (tab?: ViewTab) => void;
  onViewForecast: () => void;
  onImageClick: (images: string[], index: number) => void;
}
export function TradeViewDialogContent({
  trade,
  forecasts,
  currencySymbol,
  formatPnl,
  onClose,
  onEdit,
  onViewForecast,
  onImageClick
}: TradeViewDialogContentProps) {
  const { preferences } = usePreferences();
  const { activeAccount } = useAccount();
  const isGlassEnabled = preferences.liquidGlassEnabled ?? false;
  
  // Calculate PnL percentage based on account starting balance
  const calculatePnlPercentage = () => {
    const accountBalance = activeAccount?.starting_balance || 0;
    return accountBalance > 0 
      ? (trade.pnlAmount / accountBalance * 100)
      : trade.pnlPercentage;
  };
  
  const pnlPercentage = calculatePnlPercentage();
  const overallEmotionsText = trade.overallEmotions || '';
  
  const [activeTab, setActiveTab] = useState<ViewTab>('general');
  const tabs: {
    id: ViewTab;
    label: string;
    labelFull: string;
  }[] = [{
    id: 'general',
    label: 'Overview',
    labelFull: 'Overview'
  }, {
    id: 'charts',
    label: 'Chart',
    labelFull: 'Chart'
  }, {
    id: 'pre-market',
    label: 'Plan',
    labelFull: 'Plan'
  }, {
    id: 'post-market',
    label: 'Review',
    labelFull: 'Review'
  }, {
    id: 'emotions',
    label: 'Mindset',
    labelFull: 'Mindset'
  }];
  const currentEmotion = EMOTION_LABELS.find(e => e.value === trade.emotionalState) || EMOTION_LABELS[2];
  const EmotionIcon = currentEmotion.icon;
  const moodTone = trade.emotionalState === 1
    ? {
        chip: 'border-red-500/35 bg-red-500/10 text-red-400',
        track: 'bg-red-500'
      }
    : trade.emotionalState === 2
      ? {
          chip: 'border-amber-500/35 bg-amber-500/10 text-amber-400',
          track: 'bg-amber-500'
        }
      : {
          chip: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400',
          track: 'bg-emerald-500'
        };
  return <div className="w-full h-full flex flex-col flex-1 min-h-0 animate-in fade-in-0 slide-in-from-bottom-6 duration-500 ease-out">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
        {/* Dot pattern - only show when enabled */}
        {isGlassEnabled && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tradeview-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" className="fill-foreground/[0.08] dark:fill-foreground/[0.04]" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tradeview-dots)" />
          </svg>
        )}
        {/* Notch background filler on mobile */}
        <div 
          className="sm:hidden"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 'env(safe-area-inset-top)',
            backgroundColor: 'rgb(var(--color-muted) / 0.3)',
            zIndex: 5
          }}
        />
        {/* Header - theme-aware with safe area padding */}
        <div 
          className="border-b border-border/50 flex-shrink-0 bg-muted/30 dark:bg-white/[0.02] relative z-10 px-4 md:px-6 py-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:pt-3"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <SymbolIcon symbol={trade.symbol} size="md" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-semibold text-foreground">{trade.symbol}</span>
                  <span className={cn(
                    'inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap',
                    trade.direction === 'long' 
                      ? 'bg-pnl-positive/10 text-pnl-positive border border-pnl-positive/40'
                      : 'bg-pnl-negative/10 text-pnl-negative border border-pnl-negative/40'
                  )}>
                    {trade.direction === 'long' ? 'Long' : 'Short'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(trade.date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Tab Navigation - Modern Segmented Control */}
          <div className="flex justify-center w-full">
            <div className="w-full max-w-3xl rounded-2xl border border-border/50 bg-background/60 p-1.5 backdrop-blur-sm overflow-x-auto scrollbar-hide">
              <div className="grid min-w-max grid-cols-5 gap-1">
                {tabs.map(tab => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn("h-9 px-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap", activeTab === tab.id ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                    {tab.labelFull}
                  </button>)}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content - touch-friendly scrolling for mobile */}
        <div 
          className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y min-h-0 px-4 md:px-6 py-6 md:py-8"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'
          }}
        >
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-in fade-in-0 duration-300 ease-out">
              {/* Result - Redesigned */}
              <div className={cn(
                'rounded-xl border p-4 md:p-5',
                trade.isPaperTrade || trade.noTradeTaken
                  ? 'border-border/60 bg-muted/40 dark:bg-muted/20'
                  : trade.pnlAmount >= 0 
                    ? 'border-pnl-positive/20 bg-pnl-positive/5 dark:bg-pnl-positive/5' 
                    : 'border-pnl-negative/20 bg-pnl-negative/5 dark:bg-pnl-negative/5'
              )}>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</span>
                    {trade.isPaperTrade || trade.noTradeTaken ? (
                      <div className="text-2xl font-bold text-muted-foreground tabular-nums leading-none">—</div>
                    ) : (
                      <div className="flex items-end gap-2 flex-wrap">
                        <div className={cn('text-[2rem] md:text-[2.1rem] font-bold font-display tabular-nums tracking-tight leading-none', trade.pnlAmount >= 0 ? 'text-pnl-positive' : 'text-pnl-negative')}>
                          {formatPnl(trade.pnlAmount)}
                        </div>
                        <span className={cn('text-base font-semibold font-display tabular-nums tracking-tight leading-none pb-0.5', trade.pnlAmount >= 0 ? 'text-pnl-positive/75' : 'text-pnl-negative/75')}>
                          ({trade.pnlAmount >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="self-start sm:self-end">
                    {trade.isPaperTrade ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border/50">
                        Paper
                      </span>
                    ) : trade.noTradeTaken ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border/50">
                        No Trade
                      </span>
                    ) : (
                      <span className={cn(
                        'inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wider uppercase border',
                        trade.pnlAmount >= 0
                          ? 'bg-pnl-positive/15 text-pnl-positive border-pnl-positive/35'
                          : 'bg-pnl-negative/15 text-pnl-negative border-pnl-negative/35'
                      )}>
                        {trade.pnlAmount >= 0 ? 'WIN' : 'LOSS'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Trade Details - Redesigned Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Entry</span>
                  <span className="text-[1.05rem] font-semibold text-foreground tabular-nums leading-tight">{trade.entryPrice?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Stop Loss</span>
                  <span className="text-[1.05rem] font-semibold text-foreground tabular-nums leading-tight">
                    {trade.stopLoss ? trade.stopLoss.toLocaleString() : null}
                    {trade.stopLoss && trade.stopLossPips ? ' ' : null}
                    {trade.stopLossPips ? <span className={trade.stopLoss ? "text-xs text-muted-foreground font-medium" : "text-xs text-muted-foreground font-medium"}>({trade.stopLossPips} pips)</span> : null}
                    {!trade.stopLoss && !trade.stopLossPips ? '-' : null}
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Take Profit</span>
                  <span className="text-[1.05rem] font-semibold text-foreground tabular-nums leading-tight">{trade.takeProfit?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lot Size</span>
                  <span className="text-[1.05rem] font-semibold text-foreground tabular-nums leading-tight">{trade.lotSize?.toString() || '0'}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Entry Time</span>
                  <span className="text-[1.05rem] font-semibold text-foreground leading-tight">{trade.entryTime || '-'}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Duration</span>
                  <span className="text-[1.05rem] font-semibold text-foreground leading-tight">{trade.holdingTime || '-'}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Risk:Reward</span>
                  <span className="text-[1.05rem] font-semibold text-foreground leading-tight">{trade.riskRewardRatio || '-'}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grade</span>
                  <span className={cn(
                    "text-sm font-bold px-2 py-0.5 rounded-md w-fit",
                    trade.performanceGrade === 1 && "bg-pnl-negative/15 text-pnl-negative border border-pnl-negative/30",
                    trade.performanceGrade === 2 && "bg-amber-500/15 text-amber-500 border border-amber-500/30",
                    trade.performanceGrade === 3 && "bg-pnl-positive/15 text-pnl-positive border border-pnl-positive/30"
                  )}>{trade.performanceGrade}/3</span>
                </div>
              </div>

              {/* Rules Compliance & Category */}
              <div className="space-y-3">
                {/* Category + Strategy */}
                <div className={cn(
                  "grid gap-2.5",
                  trade.strategy ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                )}>
                  <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Category</span>
                    <span className="text-[1.05rem] font-semibold text-foreground capitalize leading-tight">{(trade as any).category || '-'}</span>
                  </div>

                  {trade.strategy && (
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border/50 min-h-[72px] justify-center">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Strategy</span>
                      <span className="text-[1.05rem] font-semibold text-foreground leading-tight">{trade.strategy}</span>
                    </div>
                  )}
                </div>

                {/* Rules & Mistakes Section */}
                {(trade.followedRulesList && trade.followedRulesList.length > 0) || (trade.brokenRules && trade.brokenRules.length > 0) || (trade.mistakeTags && trade.mistakeTags.length > 0) ? (
                  <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <TradingRulesIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Trading Rules & Mistakes</span>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground px-2 py-1 rounded-md bg-background/60 border border-border/50 tabular-nums">
                        {(trade.followedRulesList?.length || 0) + (trade.brokenRules?.length || 0)} rules · {trade.mistakeTags?.length || 0} mistakes
                      </span>
                    </div>

                    {((trade.followedRulesList && trade.followedRulesList.length > 0) || (trade.brokenRules && trade.brokenRules.length > 0)) && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <TradingRulesIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">Trading Rules</span>
                        </div>

                        {/* Followed Rules */}
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-pnl-positive uppercase tracking-wide">Rules Followed</span>
                          {trade.followedRulesList && trade.followedRulesList.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {trade.followedRulesList.map((rule, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 text-xs rounded-md bg-pnl-positive/10 text-pnl-positive border border-pnl-positive/20"
                                >
                                  {rule}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">None</p>
                          )}
                        </div>

                        {/* Broken Rules */}
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-pnl-negative uppercase tracking-wide">Rules Broken</span>
                          {trade.brokenRules && trade.brokenRules.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {trade.brokenRules.map((rule, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 text-xs rounded-md bg-pnl-negative/10 text-pnl-negative border border-pnl-negative/20"
                                >
                                  {rule}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">None</p>
                          )}
                        </div>
                      </div>
                    )}

                    {trade.mistakeTags && trade.mistakeTags.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <XIcon className="h-4 w-4 text-red-500/70" />
                          <span className="text-sm font-medium text-foreground">Identified Mistakes</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {trade.mistakeTags.map((mistake, index) => (
                            <span 
                              key={index}
                              className="px-2.5 py-1.5 text-xs rounded-md bg-red-500/15 text-red-500 border border-red-500/40 font-medium"
                            >
                              {mistake}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-xl border border-border/60 bg-background/35 flex items-center justify-center shrink-0">
                          <TradingRulesIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-tight">Trading Rules & Mistakes</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">No rules or mistakes were logged for this trade.</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-2.5 py-1 rounded-lg border border-border/50 bg-background/40">
                        Empty
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* News Section */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <NewsIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Economic News</span>
                </div>
                
                {trade.hasNews ? (
                  <div className="space-y-2 pt-1">
                    {/* Display new newsEvents array if available */}
                    {trade.newsEvents && trade.newsEvents.length > 0 ? (
                      trade.newsEvents.map((event, index) => (
                        <div key={event.id || index} className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-2">
                          {trade.newsEvents && trade.newsEvents.length > 1 && (
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Event {index + 1}</span>
                          )}
                          {event.type && (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</span>
                              <p className="text-sm font-medium text-foreground break-words">{event.type}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4">
                            {event.impact && (
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Impact</span>
                                <p className={cn(
                                  "text-sm font-medium",
                                  NEWS_IMPACTS.find(i => i.value === event.impact)?.color || 'text-foreground'
                                )}>
                                  {NEWS_IMPACTS.find(i => i.value === event.impact)?.label || event.impact}
                                </p>
                              </div>
                            )}
                            {event.currency && (
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Currency</span>
                                <p className="text-sm font-medium text-foreground">{event.currency}</p>
                              </div>
                            )}
                            {event.time && (
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</span>
                                <p className="text-sm font-medium text-foreground tabular-nums">{event.time}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      /* Fallback to legacy single news fields */
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-2">
                        {trade.newsType && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</span>
                            <p className="text-sm font-medium text-foreground break-words">{trade.newsType}</p>
                          </div>
                        )}
                        <div className="flex gap-4">
                          {trade.newsImpact && (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Impact</span>
                              <p className={cn(
                                "text-sm font-medium",
                                NEWS_IMPACTS.find(i => i.value === trade.newsImpact)?.color || 'text-foreground'
                              )}>
                                {NEWS_IMPACTS.find(i => i.value === trade.newsImpact)?.label || trade.newsImpact}
                              </p>
                            </div>
                          )}
                          {trade.newsTime && (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</span>
                              <p className="text-sm font-medium text-foreground tabular-nums">{trade.newsTime}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/50 bg-background/30 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg border border-border/60 bg-background/35 flex items-center justify-center shrink-0">
                          <NewsIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">No economic news logged</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">No events were recorded for this trade.</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-2.5 py-1 rounded-lg border border-border/50 bg-background/40">
                        Empty
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {trade.notes && (
                <div className="space-y-1.5">
                  <span className="text-sm font-semibold text-foreground">Notes</span>
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: trade.notes }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHARTS TAB */}
          {activeTab === 'charts' && <div className="space-y-6 animate-in fade-in-0 duration-300 ease-out">
              {(() => {
                // Parse chart analysis notes to extract before/after sections
                const parseChartSections = () => {
                  const beforeSections: { timeframe: string | null; notes: string }[] = [];
                  const afterSections: { timeframe: string | null; notes: string }[] = [];
                  
                  if (!trade.chartAnalysisNotes) {
                    return { before: beforeSections, after: afterSections };
                  }
                  
                  // Split sections by double newlines, then parse each
                  const sections = trade.chartAnalysisNotes.split(/\n\n+/);
                  
                  sections.forEach(section => {
                    const match = section.match(/^\[(Before|After)\s*-\s*([^\]]+)\]\n?([\s\S]*)/i);
                    if (match) {
                      const type = match[1].toLowerCase();
                      const timeframe = match[2]?.trim() || null;
                      const notes = match[3]?.trim() || '';
                      
                      if (type === 'before') {
                        beforeSections.push({ timeframe, notes });
                      } else if (type === 'after') {
                        afterSections.push({ timeframe, notes });
                      }
                    } else {
                      // Legacy format without Before/After prefix
                      const legacyMatch = section.match(/^\[([^\]]+)\]\n?([\s\S]*)/);
                      if (legacyMatch) {
                        beforeSections.push({ timeframe: legacyMatch[1], notes: legacyMatch[2]?.trim() || '' });
                      } else if (section.trim()) {
                        beforeSections.push({ timeframe: null, notes: section.trim() });
                      }
                    }
                  });
                  
                  return { before: beforeSections, after: afterSections };
                };
                
                const { before: beforeSections, after: afterSections } = parseChartSections();
                const images = trade.images || [];
                
                // Images are stored as: [...beforeImages, ...afterImages]
                // Use section counts to split, but ensure we show all images even without notes
                const beforeSectionCount = beforeSections.length;
                const afterSectionCount = afterSections.length;
                
                // If we have both sections, split by before count; otherwise show all in the section that exists
                let beforeImages: string[] = [];
                let afterImages: string[] = [];
                
                if (beforeSectionCount > 0 && afterSectionCount > 0) {
                  beforeImages = images.slice(0, beforeSectionCount);
                  afterImages = images.slice(beforeSectionCount);
                } else if (beforeSectionCount > 0) {
                  beforeImages = images;
                } else if (afterSectionCount > 0) {
                  afterImages = images;
                } else {
                  // No notes at all - split evenly or show all in before
                  beforeImages = images;
                }
                
                const hasBeforeContent = beforeImages.length > 0 || beforeSections.length > 0;
                const hasAfterContent = afterImages.length > 0 || afterSections.length > 0;
                const hasContent = hasBeforeContent || hasAfterContent;

                if (!hasContent) {
                  return <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No chart images or notes uploaded</p>
                  </div>;
                }
                
                return <div className="space-y-5">
                  {/* Chart Before Section */}
                  {hasBeforeContent && (
                    <div className="space-y-4 rounded-xl border border-border/50 bg-card/35 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Chart Before</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                            {Math.max(beforeImages.length, beforeSections.length)}
                          </span>
                        </div>
                        <div className="h-px flex-1 bg-border/70" />
                      </div>
                      
                      {(() => {
                        const cardCount = Math.max(beforeImages.length, beforeSections.length);
                        return <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                          {Array.from({ length: cardCount || 1 }).map((_, idx) => {
                          const image = beforeImages[idx];
                          const section = beforeSections[idx];
                          if (!image && !section) return null;
                          
                        return <div key={idx} className="space-y-2.5 p-3 rounded-lg border border-border/50 bg-background/40">
                            {section?.timeframe && (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md bg-muted/70 text-xs font-semibold text-foreground border border-border/50">
                                  {section.timeframe}
                                </span>
                              </div>
                            )}
                            {image && (
                              <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/20 aspect-[16/7]">
                              <img 
                                  src={image} 
                                  alt={section?.timeframe || `Chart Before ${idx + 1}`} 
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity block"
                                  loading="eager"
                                  decoding="sync"
                                  onClick={() => onImageClick(images, idx)} 
                                />
                              </div>
                            )}
                            {section?.notes && (
                              <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 mt-2">
                                <div 
                                  className="rich-text-content"
                                  dangerouslySetInnerHTML={{ __html: section.notes }}
                                />
                              </div>
                            )}
                          </div>;
                        })}
                        </div>;
                      })()}
                    </div>
                  )}

                  {/* Divider between sections - always visible when after content exists */}
                  {hasAfterContent && (
                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/70" />
                      </div>
                    </div>
                  )}

                  {/* Chart After Section */}
                  {hasAfterContent && (
                    <div className="space-y-4 rounded-xl border border-border/50 bg-card/35 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Chart After</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                            {Math.max(afterImages.length, afterSections.length)}
                          </span>
                        </div>
                        <div className="h-px flex-1 bg-border/70" />
                      </div>
                      
                      {(() => {
                        const cardCount = Math.max(afterImages.length, afterSections.length);
                        return <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                          {Array.from({ length: cardCount || 1 }).map((_, idx) => {
                          const image = afterImages[idx];
                          const section = afterSections[idx];
                          if (!image && !section) return null;
                          
                        return <div key={idx} className="space-y-2.5 p-3 rounded-lg border border-border/50 bg-background/40">
                            {section?.timeframe && (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md bg-muted/70 text-xs font-semibold text-foreground border border-border/50">
                                  {section.timeframe}
                                </span>
                              </div>
                            )}
                            {image && (
                              <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/20 aspect-[16/7]">
                              <img 
                                  src={image} 
                                  alt={section?.timeframe || `Chart After ${idx + 1}`} 
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity block"
                                  loading="eager"
                                  decoding="sync"
                                  onClick={() => onImageClick(images, beforeImages.length + idx)} 
                                />
                              </div>
                            )}
                            {section?.notes && (
                              <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 mt-2">
                                <div 
                                  className="rich-text-content"
                                  dangerouslySetInnerHTML={{ __html: section.notes }}
                                />
                              </div>
                            )}
                          </div>;
                        })}
                        </div>;
                      })()}
                    </div>
                  )}
                </div>;
              })()}

              {/* Linked Forecast Charts */}
              {trade.forecastId && forecasts[trade.forecastId]?.charts && forecasts[trade.forecastId].charts.length > 0}
            </div>}

          {/* PRE-MARKET TAB */}
          {activeTab === 'pre-market' && <div className="space-y-6">
              {(() => {
                // Parse pre-market notes to extract timeframe sections
                // Handle both [Timeframe]\nnotes and [Timeframe]\n formats (image with no notes)
                const parsePreMarketSections = () => {
                  if (!trade.preMarketNotes) return [];
                  // Split by sections that start with [something] - but keep the delimiter
                  const sectionMatches = trade.preMarketNotes.match(/\[[^\]]+\](?:\n[\s\S]*?)?(?=\n\n\[|\n\[|$)/g);
                  if (!sectionMatches) return [];
                  return sectionMatches.map(section => {
                    const match = section.match(/^\[([^\]]+)\]\n?([\s\S]*)/);
                    if (match) {
                      return { timeframe: match[1], notes: match[2]?.trim() || '' };
                    }
                    return { timeframe: null, notes: section.trim() };
                  }).filter(s => s.timeframe);
                };
                
                const chartSections = parsePreMarketSections();
                const images = trade.preMarketImages || [];
                const hasChartContent = images.length > 0 || chartSections.length > 0;

                return <>
                  {hasChartContent && <div className="space-y-4 rounded-xl border border-border/50 bg-card/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Plan Charts</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                          {Math.max(images.length, chartSections.length)}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-border/70" />
                    </div>
                    {(() => {
                      const cardCount = Math.max(images.length, chartSections.length);
                      return <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                        {Array.from({ length: cardCount }).map((_, idx) => {
                          const image = images[idx];
                          const section = chartSections[idx];
                          
                          return <div key={idx} className="space-y-2.5 p-3 rounded-lg border border-border/50 bg-background/40">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-md bg-muted/70 text-xs font-semibold text-foreground border border-border/50">
                                {section?.timeframe || `Chart ${idx + 1}`}
                              </span>
                            </div>
                            {image && <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/20 aspect-[16/7]">
                              <img 
                                src={image} 
                                alt={section?.timeframe || `Chart ${idx + 1}`} 
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity block"
                                loading="eager"
                                decoding="sync"
                                onClick={() => onImageClick(images, idx)} 
                              />
                            </div>}
                            {section?.notes && <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 mt-2">
                              <div 
                                className="rich-text-content"
                                dangerouslySetInnerHTML={{ __html: section.notes }}
                              />
                            </div>}
                          </div>;
                        })}
                      </div>;
                    })()}
                  </div>}

                  {trade.preMarketPlan && <div className="space-y-2">
                    <span className="text-sm font-semibold text-foreground">Pre-Market Analysis</span>
                    <div className="rounded-lg border border-border/50 bg-muted/40 p-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{trade.preMarketPlan}</p>
                    </div>
                  </div>}

                  {!hasChartContent && !trade.preMarketPlan && <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No pre-market analysis recorded</p>
                  </div>}
                </>;
              })()}
            </div>}

          {/* POST-MARKET TAB */}
          {activeTab === 'post-market' && <div className="space-y-6">
              {(() => {
                // Parse post-market notes to extract timeframe sections
                // Handle both [Timeframe]\nnotes and [Timeframe]\n formats (image with no notes)
                const parsePostMarketSections = () => {
                  if (!trade.postMarketNotes) return [];
                  // Split by sections that start with [something] - but keep the delimiter
                  const sectionMatches = trade.postMarketNotes.match(/\[[^\]]+\](?:\n[\s\S]*?)?(?=\n\n\[|\n\[|$)/g);
                  if (!sectionMatches) return [];
                  return sectionMatches.map(section => {
                    const match = section.match(/^\[([^\]]+)\]\n?([\s\S]*)/);
                    if (match) {
                      return { timeframe: match[1], notes: match[2]?.trim() || '' };
                    }
                    return { timeframe: null, notes: section.trim() };
                  }).filter(s => s.timeframe);
                };
                
                const chartSections = parsePostMarketSections();
                const images = trade.postMarketImages || [];
                const hasChartContent = images.length > 0 || chartSections.length > 0;

                return <>
                  {hasChartContent && <div className="space-y-4 rounded-xl border border-border/50 bg-card/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Review Charts</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                          {Math.max(images.length, chartSections.length)}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-border/70" />
                    </div>
                    {(() => {
                      const cardCount = Math.max(images.length, chartSections.length);
                      return <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                        {Array.from({ length: cardCount }).map((_, idx) => {
                          const image = images[idx];
                          const section = chartSections[idx];
                          
                          return <div key={idx} className="space-y-2.5 p-3 rounded-lg border border-border/50 bg-background/40">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-md bg-muted/70 text-xs font-semibold text-foreground border border-border/50">
                                {section?.timeframe || `Chart ${idx + 1}`}
                              </span>
                            </div>
                            {image && <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/20 aspect-[16/7]">
                              <img 
                                src={image} 
                                alt={section?.timeframe || `Chart ${idx + 1}`} 
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity block"
                                loading="eager"
                                decoding="sync"
                                onClick={() => onImageClick(images, idx)} 
                              />
                            </div>}
                            {section?.notes && <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 mt-2">
                              <div 
                                className="rich-text-content"
                                dangerouslySetInnerHTML={{ __html: section.notes }}
                              />
                            </div>}
                          </div>;
                        })}
                      </div>;
                    })()}
                  </div>}

                  {trade.postMarketReview && <div className="space-y-2">
                    <span className="text-sm font-semibold text-foreground">Post-Market Review</span>
                    <div className="rounded-lg border border-border/50 bg-muted/40 p-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{trade.postMarketReview}</p>
                    </div>
                  </div>}

                  {!hasChartContent && !trade.postMarketReview && <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No post-market review recorded</p>
                  </div>}
                </>;
              })()}
            </div>}

          {/* EMOTIONS TAB */}
          {activeTab === 'emotions' && <div className="space-y-6 animate-in fade-in-0 duration-300 ease-out">
              {/* Emotional State */}
              {trade.emotionalState && (
                <div className="rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-xl border flex items-center justify-center', moodTone.chip)}>
                      <EmotionIcon className={cn('h-5 w-5 flex-shrink-0', currentEmotion.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Mood</p>
                      <p className="text-xl font-semibold text-foreground leading-tight mt-0.5">{currentEmotion.label}</p>
                    </div>
                    <div className="ml-auto w-24 sm:w-32">
                      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                        <div className={cn('h-full rounded-full', moodTone.track)} style={{ width: `${trade.emotionalState / 3 * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {overallEmotionsText ? <div className="space-y-2.5 rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground block">Overall Emotions</span>
                  <div className="rounded-xl border border-border/50 bg-background/30 p-3.5">
                    <div
                      className="rich-text-content"
                      dangerouslySetInnerHTML={{ __html: overallEmotionsText }}
                    />
                  </div>
                </div> : null}

              {!overallEmotionsText && <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No emotional notes recorded</p>
                </div>}
            </div>}
        </div>

        {/* Footer - same style as TradeForm with safe area padding */}
        <div 
          className="flex-shrink-0 border-t border-border bg-card flex gap-3 sm:sticky sm:bottom-0 [padding-bottom:max(5rem,calc(env(safe-area-inset-bottom)+2rem))] sm:[padding-bottom:1rem]"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
            paddingTop: '1rem'
          }}
        >
          <Button 
            variant="outline" 
            className="flex-1 h-12 rounded-xl font-semibold border-border/60 hover:bg-muted/60 transition-all duration-200 hover:scale-[1.01]" 
            onClick={() => onEdit(activeTab)}
          >
            Edit
          </Button>
          <Button 
            className="flex-1 h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-0 shadow-lg shadow-violet-900/20 transition-all duration-200 hover:scale-[1.01]" 
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>;
}