import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useTrades } from '@/hooks/useTrades';
import { useSettings } from '@/hooks/useSettings';
import { useAccount } from '@/hooks/useAccount';
import { usePreferences } from '@/hooks/usePreferences';
import { useDataStore } from '@/store/dataStore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, DollarSign, Target, Wallet, Activity, Eye, Check, Copy, ChevronsUpDown, Sun, Moon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrencySymbol, Trade, Currency } from '@/types/trade';
import { cn } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { ForecastViewDialog } from '@/components/forecast/ForecastViewDialog';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { ImageZoomDialog } from '@/components/ui/ImageZoomDialog';
import { TradeViewDialogContent } from '@/components/trade/TradeViewDialog';
import { BalanceCard } from '@/components/journal/BalanceCard';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { AccountTransition } from '@/components/account/AccountTransition';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { TypewriterDate } from '@/components/ui/TypewriterDate';

// Extract short symbol for display (e.g., "EURUSD" -> "EUR", "NAS100" -> "NAS")
const getSymbolAbbreviation = (symbol: string): string => {
  const upper = symbol.toUpperCase();
  // Common indices
  if (upper.includes('NAS') || upper.includes('NASDAQ')) return 'NAS';
  if (upper.includes('SPX') || upper.includes('SP500') || upper.includes('US500')) return 'SPX';
  if (upper.includes('DOW') || upper.includes('US30')) return 'DOW';
  if (upper.includes('DAX') || upper.includes('GER')) return 'DAX';
  // Forex pairs - take first 3 chars
  if (upper.length >= 6 && /^[A-Z]{6}$/.test(upper)) return upper.slice(0, 3);
  // Crypto
  if (upper.includes('BTC')) return 'BTC';
  if (upper.includes('ETH')) return 'ETH';
  // Default: first 3 chars
  return upper.slice(0, 3);
};

// Get color classes for trading symbol
const getSymbolColors = (symbol: string): {
  bg: string;
  text: string;
} => {
  const upper = symbol.toUpperCase();

  // Indices
  if (upper.includes('NAS') || upper.includes('NASDAQ') || upper.includes('NDX')) return {
    bg: 'bg-blue-500/20',
    text: 'text-blue-500'
  };
  if (upper.includes('SPX') || upper.includes('SP500') || upper.includes('US500')) return {
    bg: 'bg-orange-500/20',
    text: 'text-orange-500'
  };
  if (upper.includes('DOW') || upper.includes('US30') || upper.includes('DJI')) return {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-500'
  };
  if (upper.includes('DAX') || upper.includes('GER')) return {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-500'
  };
  if (upper.includes('FTSE') || upper.includes('UK100')) return {
    bg: 'bg-red-500/20',
    text: 'text-red-500'
  };
  if (upper.includes('NIK') || upper.includes('JP225')) return {
    bg: 'bg-pink-500/20',
    text: 'text-pink-500'
  };

  // Crypto
  if (upper.includes('BTC')) return {
    bg: 'bg-orange-500/20',
    text: 'text-orange-500'
  };
  if (upper.includes('ETH')) return {
    bg: 'bg-purple-500/20',
    text: 'text-purple-500'
  };
  if (upper.includes('SOL')) return {
    bg: 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20',
    text: 'text-purple-400'
  };
  if (upper.includes('XRP')) return {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400'
  };

  // Forex - Major currencies
  if (upper.includes('EUR')) return {
    bg: 'bg-blue-600/20',
    text: 'text-blue-400'
  };
  if (upper.includes('GBP')) return {
    bg: 'bg-violet-500/20',
    text: 'text-violet-400'
  };
  if (upper.includes('JPY')) return {
    bg: 'bg-red-500/20',
    text: 'text-red-400'
  };
  if (upper.includes('USD')) return {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400'
  };
  if (upper.includes('AUD')) return {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400'
  };
  if (upper.includes('CAD')) return {
    bg: 'bg-red-600/20',
    text: 'text-red-400'
  };
  if (upper.includes('CHF')) return {
    bg: 'bg-red-500/20',
    text: 'text-red-400'
  };
  if (upper.includes('NZD')) return {
    bg: 'bg-teal-500/20',
    text: 'text-teal-400'
  };

  // Commodities
  if (upper.includes('GOLD') || upper.includes('XAU')) return {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-500'
  };
  if (upper.includes('SILVER') || upper.includes('XAG')) return {
    bg: 'bg-slate-400/20',
    text: 'text-slate-400'
  };
  if (upper.includes('OIL') || upper.includes('WTI') || upper.includes('BRENT')) return {
    bg: 'bg-stone-500/20',
    text: 'text-stone-400'
  };

  // Default
  return {
    bg: 'bg-muted',
    text: 'text-muted-foreground'
  };
};
type SortField = 'date' | 'symbol' | 'pnlAmount';
type SortDirection = 'asc' | 'desc';
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
export default function Journal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    activeAccount,
    accounts,
    setActiveAccount,
    loading: accountLoading,
    isSwitching
  } = useAccount();
  const {
    preferences,
    setTheme
  } = usePreferences();
  const isGlassEnabled = preferences.liquidGlassEnabled;
  const { previousStartingBalance, isTransitioning } = useDataStore();
  const {
    trades: allTrades,
    deleteTrade,
    duplicateTrade,
    getDailyPnl
  } = useTrades();
  
  // Filter trades to only show trades for the current active account
  // This prevents showing old account's trades during transitions which causes wrong balance
  const trades = useMemo(() => {
    if (!activeAccount) return allTrades;
    const scopedTrades = allTrades.filter(t => t.accountId === activeAccount.id);
    return scopedTrades.length > 0 ? scopedTrades : allTrades;
  }, [allTrades, activeAccount?.id]);
  const todayPnl = getDailyPnl(format(new Date(), 'yyyy-MM-dd'));
  const {
    settings,
    setBalanceHidden,
    isLoading: settingsLoading
  } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
  const [viewingForecast, setViewingForecast] = useState<Forecast | null>(null);
  const [forecasts, setForecasts] = useState<Record<string, Forecast>>({});
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Use active account's currency, fallback to profile settings
  const currencySymbol = activeAccount?.currency ? getCurrencySymbol(activeAccount.currency as Currency) : getCurrencySymbol(settings.currency);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Check if this is a new user (first login after signup)
  const isNewUser = searchParams.get('new') === 'true';

  // Clear URL params after reading them
  useEffect(() => {
    if (searchParams.get('new') || searchParams.get('returning')) {
      setSearchParams({}, {
        replace: true
      });
    }
  }, [searchParams, setSearchParams]);

  // Show loading state only when critical data is loading (accounts/settings)
  // Don't block on isHydrating or tradesLoading - trades load in parallel with UI
  const isLoading = settingsLoading || accountLoading;

  // Update time every second for real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch linked forecasts for trades
  useMemo(() => {
    const forecastIds = trades.map(t => t.forecastId).filter(Boolean) as string[];
    if (forecastIds.length === 0) return;
    const fetchForecasts = async () => {
      const {
        data
      } = await supabase.from('morning_forecasts').select('id,symbol,direction,forecast,status,outcome,date,forecast_type').in('id', forecastIds);
      if (data) {
        const forecastMap: Record<string, Forecast> = {};
        data.forEach((f: any) => {
          let charts: any[] = [];
          try {
            charts = JSON.parse(f.forecast || '[]');
          } catch {}
          forecastMap[f.id] = {
            id: f.id,
            symbol: f.symbol || 'Unknown',
            direction: f.direction as 'bullish' | 'bearish',
            charts,
            status: f.status as 'pending' | 'completed',
            outcome: f.outcome as 'win' | 'loss' | null,
            date: f.date,
            forecast_type: f.forecast_type as 'pre_market' | 'post_market' || 'pre_market'
          };
        });
        setForecasts(forecastMap);
      }
    };
    fetchForecasts();
  }, [trades]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const previousMonthTrades = trades.filter(t => {
      const date = new Date(t.date);
      return date >= subMonths(lastMonth, 1) && date < lastMonth;
    });
    const totalPnl = trades.reduce((sum, t) => sum + t.pnlAmount, 0);
    const lastMonthPnl = previousMonthTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
    const pnlChange = lastMonthPnl !== 0 ? (totalPnl - lastMonthPnl) / Math.abs(lastMonthPnl) * 100 : 0;
    const wins = trades.filter(t => t.pnlAmount > 0).length;
    const winRate = trades.length > 0 ? wins / trades.length * 100 : 0;
    const lastMonthWins = previousMonthTrades.filter(t => t.pnlAmount > 0).length;
    const lastMonthWinRate = previousMonthTrades.length > 0 ? lastMonthWins / previousMonthTrades.length * 100 : 0;
    const winRateChange = lastMonthWinRate !== 0 ? winRate - lastMonthWinRate : 0;
    const totalTrades = trades.length;
    const lastMonthTotalTrades = previousMonthTrades.length;
    const tradesChange = lastMonthTotalTrades !== 0 ? (totalTrades - lastMonthTotalTrades) / lastMonthTotalTrades * 100 : 0;

    // Use previous starting balance during transitions to prevent balance flash
    // When switching accounts, use cached balance until new trades are loaded
    const initialBalance = (isSwitching || isTransitioning) && previousStartingBalance > 0
      ? previousStartingBalance 
      : (activeAccount?.starting_balance || 0);
    
    // Calculate current account balance = starting balance + total P&L from current account trades
    const currentBalance = initialBalance + totalPnl;
    const previousBalance = initialBalance + lastMonthPnl;
    const balanceChange = previousBalance !== 0 ? (currentBalance - previousBalance) / Math.abs(previousBalance) * 100 : 0;
    return {
      totalPnl,
      pnlChange,
      winRate,
      winRateChange,
      totalTrades,
      tradesChange,
      currentBalance,
      balanceChange,
      initialBalance
    };
  }, [trades, activeAccount?.starting_balance, isSwitching, isTransitioning, previousStartingBalance]);

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let result = [...trades];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(trade => trade.symbol.toLowerCase().includes(query));
    }

    // Tab filter (all trades are "closed" since we don't track open trades)
    if (activeTab === 'open') {
      result = [];
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'symbol') {
        comparison = a.symbol.localeCompare(b.symbol);
      } else if (sortField === 'pnlAmount') {
        comparison = a.pnlAmount - b.pnlAmount;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
    // Limit to 10 most recent trades for the dashboard view
    return result.slice(0, 10);
  }, [trades, searchQuery, activeTab, sortField, sortDirection]);
  const openCount = 0;
  const closedCount = trades.length;
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  const handleDelete = async (id: string) => {
    await deleteTrade(id);
    setDeleteConfirmId(null);
  };
  const handleViewForecast = (trade: Trade) => {
    if (trade.forecastId && forecasts[trade.forecastId]) {
      setViewingTrade(null);
      setViewingForecast(forecasts[trade.forecastId]);
    }
  };
  const formatPnl = (value: number) => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${currencySymbol}${Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };
  const formatPnlCompact = (value: number) => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absValue >= 1000) {
      return `${sign}${currencySymbol}${(absValue / 1000).toFixed(1)}k`;
    }
    return `${sign}${currencySymbol}${absValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };
  const calculatePnlPercentage = (trade: Trade) => {
    // Calculate percentage based on account starting balance
    const accountBalance = activeAccount?.starting_balance || 0;
    return accountBalance > 0 
      ? (trade.pnlAmount / accountBalance * 100)
      : trade.pnlPercentage || 0;
  };
  const accountBalanceCard = {
    title: 'Account Balance',
    value: `${stats.currentBalance < 0 ? '-' : ''}${currencySymbol}${Math.abs(stats.currentBalance).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`,
    change: stats.balanceChange,
    icon: Wallet,
    positive: stats.currentBalance >= 0
  };
  const statsCards = [{
    title: 'Net P&L',
    value: `${stats.totalPnl < 0 ? '-' : ''}${currencySymbol}${Math.abs(stats.totalPnl).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`,
    change: stats.pnlChange,
    icon: DollarSign,
    positive: stats.totalPnl >= 0
  }, {
    title: 'Daily P&L',
    value: `${todayPnl > 0 ? '+' : todayPnl < 0 ? '-' : ''}${currencySymbol}${Math.abs(todayPnl).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`,
    change: 0,
    icon: Target,
    positive: todayPnl > 0
  }, {
    title: 'Total Trades',
    value: stats.totalTrades.toString(),
    change: stats.tradesChange,
    icon: Activity,
    positive: true
  }];

  // Show skeleton loader to prevent flash of stale/old data
  if (isLoading) {
    return <div className="min-h-screen pb-24">
        <div className="px-4 py-6 md:px-6 lg:px-8">
          {/* Header skeleton */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <div className="md:flex-shrink-0">
              <Skeleton className="h-8 w-64 mb-2 bg-muted/50" />
              <Skeleton className="h-4 w-48 bg-muted/30" />
            </div>
            <div className="flex-1 flex justify-center">
              <Skeleton className="h-10 w-48 rounded-full bg-muted/40" />
            </div>
            <Skeleton className="hidden md:block h-4 w-32 bg-muted/30" />
          </div>
          
          {/* Performance Overview skeleton */}
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-40 bg-muted/40" />
          </div>
          
          {/* Balance card skeleton */}
          <div className="mb-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <Skeleton className="h-4 w-32 mb-3 bg-muted/40" />
              <Skeleton className="h-10 w-48 mb-4 bg-muted/50" />
              <Skeleton className="h-24 w-full bg-muted/30 rounded-lg" />
            </div>
          </div>
          
          {/* Trade Log skeleton */}
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-24 bg-muted/40" />
          </div>
          
          {/* Tabs skeleton */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex gap-1">
              <Skeleton className="h-9 w-16 rounded-full bg-muted/40" />
              <Skeleton className="h-9 w-16 rounded-full bg-muted/30" />
              <Skeleton className="h-9 w-20 rounded-full bg-muted/30" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-36 rounded-full bg-muted/30" />
              <Skeleton className="h-9 w-9 rounded-full bg-muted/30" />
            </div>
          </div>
          
          {/* Trade cards skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl bg-muted/50" />
                    <div>
                      <Skeleton className="h-5 w-24 mb-1 bg-muted/50" />
                      <Skeleton className="h-4 w-32 bg-muted/30" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-6 w-20 mb-1 bg-muted/50" />
                    <Skeleton className="h-4 w-12 bg-muted/30" />
                  </div>
                </div>
              </div>)}
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen">
      {/* Header - Static greeting and account selector */}
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between">
          {/* Greeting with date below */}
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Hey{settings.username ? `, ${settings.username}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              <TypewriterDate date={currentTime} />
            </p>
          </div>
          
          {/* Mobile Account Switcher */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate max-w-[100px]">
                    {activeAccount?.name || 'Account'}
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Trading Accounts
                </DropdownMenuLabel>
                
                {accounts.map((account) => (
                  <DropdownMenuItem
                    key={account.id}
                    onClick={() => setActiveAccount(account)}
                    className="py-2 px-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium truncate">{account.name}</span>
                      </div>
                      {activeAccount?.id === account.id && (
                        <Check className="h-4 w-4 text-pnl-positive flex-shrink-0" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="my-1" />
                
                <DropdownMenuItem onClick={() => navigate("/settings/accounts")} className="py-2 px-2 cursor-pointer">
                  <Wallet className="mr-3 h-4 w-4 text-muted-foreground" />
                  <span>Manage accounts</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* All account-dependent content transitions together */}
        <AccountTransition>
          {/* Performance Overview Header */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              
              
            </div>
          </div>

          {/* Account Balance - Full Width with Chart */}
          <div className="mb-3">
            <BalanceCard currentBalance={stats.currentBalance} currencySymbol={currencySymbol} trades={trades.map(t => ({
            date: t.date,
            pnlAmount: t.pnlAmount
          }))} initialBalance={stats.initialBalance} isBalanceHidden={settings.balanceHidden} onToggleBalanceHidden={() => setBalanceHidden(!settings.balanceHidden)} />
        </div>


        {/* Trade Log Header with View All */}
        <div className="flex items-center justify-between mb-3 mt-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Trades</h3>
          
          <button 
            onClick={() => navigate('/history')}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 bg-foreground text-background shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            View All
          </button>
        </div>

        {/* Empty State */}
        {trades.length === 0 ? <div className={cn("flex flex-col items-center justify-center py-20 text-center rounded-2xl border relative overflow-hidden", isGlassEnabled ? "border-border/50 bg-card/95 dark:bg-card/80 backdrop-blur-xl" : "border-border/50 bg-card")}>
            {isGlassEnabled && (
              <>
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="empty-state-dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="0.75" className="fill-foreground/[0.08] dark:fill-foreground/[0.05]" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#empty-state-dots)" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
              </>
            )}
            <div className="mb-4 rounded-full bg-muted p-4 relative z-10">
              <Plus className="h-8 w-8 text-neutral-400" />
            </div>
            <h2 className="mb-2 text-lg font-medium relative z-10">No trades yet</h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground relative z-10">
              Start logging your trades to track performance.
            </p>
            <Button onClick={() => navigate('/add')} className="relative z-10">
              <Plus className="mr-2 h-4 w-4" />
              Log Your First Trade
            </Button>
          </div> : filteredTrades.length === 0 ? <div className={cn("flex flex-col items-center justify-center py-20 text-center rounded-2xl border relative overflow-hidden", isGlassEnabled ? "border-border/50 bg-card/95 dark:bg-card/80 backdrop-blur-xl" : "border-border/50 bg-card")}>
            {isGlassEnabled && (
              <>
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="no-match-dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="0.75" className="fill-foreground/[0.08] dark:fill-foreground/[0.05]" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#no-match-dots)" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
              </>
            )}
            <h2 className="mb-2 text-lg font-medium relative">No matching trades</h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground relative">
              Try adjusting your search or filters.
            </p>
            <Button variant="outline" className="relative" onClick={() => {
            setSearchQuery('');
            setActiveTab('all');
          }}>
              Clear Filters
            </Button>
          </div> : <>
            {/* Desktop Card View */}
            <div className="hidden md:block space-y-3">
              {filteredTrades.map(trade => {
              const hasLinkedForecast = trade.forecastId && forecasts[trade.forecastId];
              const symbolColors = getSymbolColors(trade.symbol);
              return <div key={trade.id} onClick={() => setViewingTrade(trade)} className={cn("rounded-xl border px-4 py-3 cursor-pointer relative overflow-hidden group", "transition-all duration-200", "hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20", isGlassEnabled ? "border-border/50 bg-card/95 dark:bg-card/80 backdrop-blur-xl" : "border-border/50 bg-card")}>
                    {isGlassEnabled && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id={`journal-card-${trade.id}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                            <circle cx="1.5" cy="1.5" r="1" className="fill-foreground/[0.08] dark:fill-foreground/[0.04]" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#journal-card-${trade.id})`} />
                      </svg>
                    )}
                    <div className="flex items-center justify-between relative">
                      <div className="flex items-center gap-3">
                        <SymbolIcon symbol={trade.symbol} size="md" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">{trade.symbol}</span>
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold tracking-wide capitalize whitespace-nowrap",
                              trade.direction === 'long' 
                                ? "bg-pnl-positive/10 text-pnl-positive border border-pnl-positive/40" 
                                : "bg-pnl-negative/10 text-pnl-negative border border-pnl-negative/40"
                            )}>
                              {trade.direction}
                            </span>
                            {trade.isPaperTrade}
                            {trade.noTradeTaken}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(trade.date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {!trade.isPaperTrade && !trade.noTradeTaken ? <div className="text-right flex flex-col">
                            <AnimatedNumber value={trade.pnlAmount} formatFn={formatPnl} className={cn('font-semibold text-base font-display', trade.pnlAmount >= 0 ? 'text-pnl-positive' : 'text-pnl-negative')} />
                            <AnimatedNumber value={calculatePnlPercentage(trade)} formatFn={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} className={cn("text-xs font-display mt-0.5", trade.pnlAmount >= 0 ? "text-pnl-positive" : "text-pnl-negative")} />
                          </div> : <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-muted/40 text-muted-foreground/80 border border-border/40 whitespace-nowrap">
                            {trade.isPaperTrade ? 'Paper' : 'No Trade'}
                          </span>}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-transparent active:bg-transparent">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          setViewingTrade(trade);
                        }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          navigate(`/edit/${trade.id}`);
                        }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async e => {
                          e.stopPropagation();
                          await duplicateTrade(trade.id);
                          toast.success('Trade duplicated');
                        }}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          setDeleteConfirmId(trade.id);
                        }} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>;
            })}
            </div>

            {/* Mobile Card View - Matching Screenshot Design */}
            <div className="md:hidden space-y-3">
              {filteredTrades.map(trade => {
              const hasLinkedForecast = trade.forecastId && forecasts[trade.forecastId];
              const symbolColors = getSymbolColors(trade.symbol);
              return <div key={trade.id} onClick={() => setViewingTrade(trade)} className={cn("rounded-xl border overflow-hidden cursor-pointer relative group", "transition-[background-color,border-color,box-shadow] duration-200", isGlassEnabled ? "border-border/50 bg-card/95 dark:bg-card/80 backdrop-blur-xl hover:bg-card" : "border-border/50 bg-card hover:bg-accent")}>
                    {isGlassEnabled && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id={`journal-mobile-${trade.id}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                            <circle cx="1.5" cy="1.5" r="1" className="fill-foreground/[0.08] dark:fill-foreground/[0.04]" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#journal-mobile-${trade.id})`} />
                      </svg>
                    )}
                    <div className="px-4 py-3 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <SymbolIcon symbol={trade.symbol} size="md" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground">{trade.symbol}</span>
                              <span className={cn(
                                "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold tracking-wide capitalize whitespace-nowrap",
                                trade.direction === 'long' 
                                  ? "bg-pnl-positive/10 text-pnl-positive border border-pnl-positive/40" 
                                  : "bg-pnl-negative/10 text-pnl-negative border border-pnl-negative/40"
                              )}>
                                {trade.direction}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(trade.date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {trade.isPaperTrade || trade.noTradeTaken ? <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-muted/40 text-muted-foreground/80 border border-border/40 whitespace-nowrap">
                              {trade.isPaperTrade ? 'Paper' : 'No Trade'}
                            </span> : <div className="text-right flex flex-col">
                              <AnimatedNumber value={trade.pnlAmount} formatFn={formatPnl} className={cn('font-semibold text-base font-display', trade.pnlAmount >= 0 ? 'text-pnl-positive' : 'text-pnl-negative')} />
                              <AnimatedNumber value={calculatePnlPercentage(trade)} formatFn={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} className={cn('text-xs font-display mt-0.5', trade.pnlAmount >= 0 ? 'text-pnl-positive' : 'text-pnl-negative')} />
                            </div>}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-transparent active:bg-transparent">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={e => {
                            e.stopPropagation();
                            setViewingTrade(trade);
                          }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={e => {
                            e.stopPropagation();
                            navigate(`/edit/${trade.id}`);
                          }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async e => {
                            e.stopPropagation();
                            await duplicateTrade(trade.id);
                            toast.success('Trade duplicated');
                          }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={e => {
                            e.stopPropagation();
                            setDeleteConfirmId(trade.id);
                          }} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>;
            })}
            </div>
          </>}
        </AccountTransition>
      </div>

      {/* Trade View Dialog */}
      <Dialog open={!!viewingTrade} onOpenChange={open => !open && setViewingTrade(null)}>
        <DialogContent fullScreenOnMobile hideCloseButton className="max-w-6xl xl:max-w-[76rem] sm:max-h-[90vh] p-0 sm:overflow-hidden">
          {viewingTrade && <TradeViewDialogContent trade={viewingTrade} forecasts={forecasts} currencySymbol={currencySymbol} formatPnl={formatPnl} onClose={() => setViewingTrade(null)} onEdit={tab => {
          setViewingTrade(null);
          navigate(`/edit/${viewingTrade.id}${tab ? `?tab=${tab}` : ''}`);
        }} onViewForecast={() => handleViewForecast(viewingTrade)} onImageClick={(images, index) => {
          setZoomImages(images);
          setZoomIndex(index);
          setZoomOpen(true);
        }} />}
        </DialogContent>
      </Dialog>

      {/* Forecast View Dialog */}
      <ForecastViewDialog open={!!viewingForecast} onOpenChange={open => !open && setViewingForecast(null)} forecast={viewingForecast} />

      {/* Image Zoom Dialog */}
      <ImageZoomDialog images={zoomImages} initialIndex={zoomIndex} open={zoomOpen} onOpenChange={setZoomOpen} />

      {/* Delete Trade Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}