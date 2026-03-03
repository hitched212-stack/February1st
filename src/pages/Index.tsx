import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { useSettings } from '@/hooks/useSettings';
import { useAccount } from '@/hooks/useAccount';
import { useSubscription } from '@/hooks/useSubscription';
import { useDataStore } from '@/store/dataStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, BarChart3, Trophy, AlertTriangle, Zap, Wallet } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrencySymbol } from '@/types/trade';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { DashboardTradeCard } from '@/components/trade/DashboardTradeCard';
import { AccountTransition } from '@/components/account/AccountTransition';

export default function Index() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trades, isLoading: tradesLoading, getDailyPnl } = useTrades();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { activeAccount, loading: accountLoading, isSwitching } = useAccount();
  const { isHydrating, isTransitioning, previousStartingBalance, previousTrades } = useDataStore();
  const { subscription, loading: subscriptionLoading, refetch } = useSubscription();
  const currencySymbol = activeAccount?.currency ? getCurrencySymbol(activeAccount.currency as any) : getCurrencySymbol(settings.currency);
  const todayPnl = getDailyPnl(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed'>('all');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  // Check if just returned from payment
  useEffect(() => {
    const checkPostPayment = async () => {
      const isFromStripe = searchParams.get('fromStripe') === '1';
      if (isFromStripe) {
        setIsCheckingPayment(true);

        // Poll for subscription registration (max 15 seconds, every 500ms)
        let attempts = 0;
        const maxAttempts = 30;

        const checkSubscription = setInterval(async () => {
          attempts++;
          await refetch();

          if (attempts >= maxAttempts) {
            clearInterval(checkSubscription);
            setIsCheckingPayment(false);
          }
        }, 500);
      }
    };

    checkPostPayment();
  }, [refetch, searchParams]);

  // Clear URL params after reading them
  useEffect(() => {
    if (searchParams.get('new') || searchParams.get('returning') || searchParams.get('fromStripe')) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  // Calculate current account balance: starting balance + total P&L from trades - exclude paper trades
  // Use previous starting balance during transitions to prevent balance flash
  const accountBalance = useMemo(() => {
    const startingBalance = (isSwitching || isTransitioning) && previousStartingBalance > 0
      ? previousStartingBalance 
      : (activeAccount?.starting_balance || 0);
    const realTrades = trades.filter(t => !t.isPaperTrade && !t.noTradeTaken);
    const totalPnl = realTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
    return startingBalance + totalPnl;
  }, [trades, activeAccount, isSwitching, isTransitioning, previousStartingBalance]);

  // Calculate performance stats - exclude paper trades and no trade taken
  const stats = useMemo(() => {
    const realTrades = trades.filter(t => !t.isPaperTrade && !t.noTradeTaken);
    
    if (realTrades.length === 0) {
      return {
        totalPnl: 0,
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0,
        maxStreak: 0
      };
    }

    const wins = realTrades.filter(t => t.pnlAmount > 0);
    const losses = realTrades.filter(t => t.pnlAmount < 0);
    const totalPnl = realTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
    const winRate = realTrades.length > 0 ? (wins.length / realTrades.length) * 100 : 0;
    
    const totalWins = wins.reduce((sum, t) => sum + t.pnlAmount, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnlAmount, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnlAmount)) : 0;
    const largestLoss = losses.length > 0 ? Math.abs(Math.min(...losses.map(t => t.pnlAmount))) : 0;

    // Calculate current streak
    const sortedTrades = [...realTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    let isWinStreak = sortedTrades.length > 0 ? sortedTrades[0].pnlAmount >= 0 : true;
    
    for (const trade of sortedTrades) {
      const isWin = trade.pnlAmount >= 0;
      if (isWin === isWinStreak) {
        tempStreak++;
        if (currentStreak === 0) currentStreak = tempStreak;
      } else {
        if (tempStreak > maxStreak) maxStreak = tempStreak;
        tempStreak = 1;
        isWinStreak = isWin;
        if (currentStreak === 0) currentStreak = 1;
      }
    }
    if (tempStreak > maxStreak) maxStreak = tempStreak;

    return {
      totalPnl,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      totalTrades: realTrades.length,
      wins: wins.length,
      losses: losses.length,
      currentStreak: sortedTrades.length > 0 && sortedTrades[0].pnlAmount >= 0 ? currentStreak : 0,
      maxStreak
    };
  }, [trades]);

  // Calculate month-over-month comparisons - exclude paper trades and no trade taken
  const monthlyComparison = useMemo(() => {
    const realTrades = trades.filter(t => !t.isPaperTrade && !t.noTradeTaken);
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthTrades = realTrades.filter(t => {
      const date = new Date(t.date);
      return date >= thisMonthStart && date <= now;
    });

    const lastMonthTrades = realTrades.filter(t => {
      const date = new Date(t.date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    // This month stats
    const thisMonthPnl = thisMonthTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
    const thisMonthWins = thisMonthTrades.filter(t => t.pnlAmount > 0).length;
    const thisMonthWinRate = thisMonthTrades.length > 0 ? (thisMonthWins / thisMonthTrades.length) * 100 : 0;
    const thisMonthTotalWins = thisMonthTrades.filter(t => t.pnlAmount > 0).reduce((sum, t) => sum + t.pnlAmount, 0);
    const thisMonthTotalLosses = Math.abs(thisMonthTrades.filter(t => t.pnlAmount < 0).reduce((sum, t) => sum + t.pnlAmount, 0));
    const thisMonthPF = thisMonthTotalLosses > 0 ? thisMonthTotalWins / thisMonthTotalLosses : thisMonthTotalWins > 0 ? Infinity : 0;

    // Last month stats
    const lastMonthPnl = lastMonthTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
    const lastMonthWins = lastMonthTrades.filter(t => t.pnlAmount > 0).length;
    const lastMonthWinRate = lastMonthTrades.length > 0 ? (lastMonthWins / lastMonthTrades.length) * 100 : 0;
    const lastMonthTotalWins = lastMonthTrades.filter(t => t.pnlAmount > 0).reduce((sum, t) => sum + t.pnlAmount, 0);
    const lastMonthTotalLosses = Math.abs(lastMonthTrades.filter(t => t.pnlAmount < 0).reduce((sum, t) => sum + t.pnlAmount, 0));
    const lastMonthPF = lastMonthTotalLosses > 0 ? lastMonthTotalWins / lastMonthTotalLosses : lastMonthTotalWins > 0 ? Infinity : 0;

    // Calculate percentage changes
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    // Calculate P&L as percentage of account starting balance
    const accountStartingBalance = activeAccount?.starting_balance || 0;
    const pnlAsPercentageOfAccount = accountStartingBalance > 0 
      ? (thisMonthPnl / accountStartingBalance) * 100 
      : 0;

    return {
      pnlChange: pnlAsPercentageOfAccount,
      winRateChange: thisMonthWinRate - lastMonthWinRate,
      profitFactorChange: lastMonthPF === Infinity || thisMonthPF === Infinity ? 0 : calcChange(thisMonthPF, lastMonthPF),
      tradesChange: calcChange(thisMonthTrades.length, lastMonthTrades.length)
    };
  }, [trades]);

  // Filter trades based on tab and limit to 10 most recent
  const filteredTrades = useMemo(() => {
    let filtered = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by trade status
    if (activeTab === 'open') {
      filtered = filtered.filter(t => t.status === 'open');
    } else if (activeTab === 'closed') {
      filtered = filtered.filter(t => t.status !== 'open');
    }
    
    // Limit to 10 most recent trades
    return filtered.slice(0, 10);
  }, [trades, activeTab]);

  const openCount = useMemo(() => trades.filter(t => t.status === 'open').length, [trades]);
  const closedCount = useMemo(() => trades.filter(t => t.status !== 'open').length, [trades]);

  const handleTradeClick = useCallback((tradeId: string) => {
    navigate(`/edit/${tradeId}`);
  }, [navigate]);

  // Show loading state immediately when data hasn't loaded yet or hydrating after auth change
  const isLoading = tradesLoading || settingsLoading || accountLoading || isHydrating;

  // Show loading screen while checking for payment registration
  if (isCheckingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-24">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Processing your payment...</h2>
          <p className="text-sm text-muted-foreground">Setting up your subscription. This may take a few seconds.</p>
        </div>
      </div>
    );
  }

  const hasCachedData = trades.length > 0 || previousTrades.length > 0 || !settingsLoading || !!activeAccount;
  const showSkeleton = isLoading || (isHydrating && !hasCachedData);

  // Show splash screen for all loading states (mobile and desktop)
  if (showSkeleton) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-300">
      {/* Header - Static (doesn't change with account) */}
      <header className="px-4 pt-6 pb-4 md:px-6 lg:px-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              {settings.hasLoggedInBefore ? 'Welcome back' : 'Welcome'}{settings.username ? `, ${settings.username}` : ''}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Here's your trading overview</p>
          </div>
          <div className="text-right text-xs sm:text-sm text-muted-foreground ml-2 flex-shrink-0">
            <span className="text-pnl-positive mr-1">●</span>
            {format(new Date(), 'dd MMM yyyy')} | {format(new Date(), 'HH:mm')}
          </div>
        </div>

      </header>

      {/* All account-dependent content transitions together */}
      <AccountTransition>
        <div className="px-4 md:px-6 lg:px-8 space-y-8">
        {/* Performance Overview Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-pnl-positive" />
            <h2 className="text-lg font-semibold">Performance Overview</h2>
          </div>

          {/* Stats Grid - 3x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Account Balance - Highlighted */}
            <StatCard
              label="Account Balance"
              value={`${accountBalance >= 0 ? '' : '-'}${currencySymbol}${Math.abs(accountBalance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              subtext={`Total P&L: ${stats.totalPnl >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(stats.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              icon={<Wallet className="h-5 w-5" />}
              iconColor="text-pnl-positive"
              valueColor={accountBalance >= 0 ? "text-foreground" : "text-pnl-negative"}
              highlighted={stats.totalPnl >= 0}
              changePercent={monthlyComparison.pnlChange}
            />

            {/* Daily P&L */}
            <StatCard
              label="Daily P&L"
              value={`${todayPnl > 0 ? '+' : todayPnl < 0 ? '-' : ''}${currencySymbol}${Math.abs(todayPnl).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              subtext={`${stats.totalTrades} total trades`}
              icon={<Target className="h-5 w-5" />}
              iconColor="text-pnl-positive"
              valueColor={todayPnl > 0 ? "text-pnl-positive" : todayPnl < 0 ? "text-pnl-negative" : "text-foreground"}
            />

            {/* Profit Factor */}
            <StatCard
              label="Profit Factor"
              value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
              subtext="vs last month"
              icon={<BarChart3 className="h-5 w-5" />}
              iconColor="text-pnl-positive"
              valueColor="text-foreground"
              changePercent={monthlyComparison.profitFactorChange}
            />

            {/* Avg Win */}
            <StatCard
              label="Avg Win"
              value={`${currencySymbol}${stats.avgWin.toFixed(0)}`}
              subtext={`Largest: ${currencySymbol}${stats.largestWin.toFixed(0)}`}
              icon={<Trophy className="h-5 w-5" />}
              iconColor="text-pnl-positive"
              valueColor="text-pnl-positive"
            />

            {/* Avg Loss */}
            <StatCard
              label="Avg Loss"
              value={`${currencySymbol}${stats.avgLoss.toFixed(0)}`}
              subtext={`Largest: ${currencySymbol}${stats.largestLoss.toFixed(0)}`}
              icon={<AlertTriangle className="h-5 w-5" />}
              iconColor="text-pnl-negative"
              valueColor="text-foreground"
            />

            {/* Current Streak */}
            <StatCard
              label="Current Streak"
              value={`${stats.currentStreak} wins`}
              subtext={`Max streak: ${stats.maxStreak}`}
              icon={<Zap className="h-5 w-5" />}
              iconColor="text-pnl-positive"
              valueColor="text-pnl-positive"
            />
          </div>
        </section>

        {/* Trade Journal Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-foreground" />
              <h2 className="text-lg font-semibold">Trade Journal</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/journal')}
            >
              View All
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 mb-4">
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              label={`All (${trades.length})`}
            />
            <TabButton
              active={activeTab === 'open'}
              onClick={() => setActiveTab('open')}
              label={`Open (${openCount})`}
            />
            <TabButton
              active={activeTab === 'closed'}
              onClick={() => setActiveTab('closed')}
              label={`Closed (${closedCount})`}
            />
          </div>

          {/* Trade Cards */}
          {filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border bg-card">
              <p className="text-muted-foreground">No trades found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrades.map((trade) => (
                <DashboardTradeCard
                  key={trade.id}
                  trade={trade}
                  currencySymbol={currencySymbol}
                  onClick={() => handleTradeClick(trade.id)}
                />
              ))}
            </div>
          )}
        </section>
        </div>
      </AccountTransition>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  iconColor: string;
  valueColor?: string;
  highlighted?: boolean;
  changePercent?: number;
}

function StatCard({ label, value, subtext, icon, iconColor, valueColor, highlighted, changePercent }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border bg-card/70 p-4 relative overflow-hidden",
      "border-border/40",
      highlighted && "border-pnl-positive/40 bg-card/70"
    )}>
      {/* Icon in top right */}
      <div className="absolute top-4 right-4">
        <div className={cn("p-2 rounded-xl bg-muted/50", iconColor)}>
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="relative">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className={cn('text-2xl font-bold font-display tabular-nums', valueColor || 'text-foreground')}>
          {value}
        </p>
        
        {/* Subtext with optional change */}
        <div className="flex items-center gap-1.5 mt-1">
          {changePercent !== undefined && changePercent !== 0 && (
            <span className={cn(
              "text-xs font-medium",
              changePercent > 0 ? "text-pnl-positive" : "text-pnl-negative"
            )}>
              {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
            </span>
          )}
          <span className="text-xs text-muted-foreground">{subtext}</span>
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
        active 
          ? "bg-foreground text-background" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
