import { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTrades } from '@/hooks/useTrades';
import { useSettings } from '@/hooks/useSettings';
import { useAccount } from '@/hooks/useAccount';
import { usePreferences, GoalPeriod } from '@/hooks/usePreferences';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowLeftRight, Target, Activity, X, Plus, Link2, Calendar as CalendarIcon, MoreVertical, Eye, EyeOff, Pencil, Trash2, BarChart3, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay, startOfWeek, endOfWeek, isSameMonth, eachWeekOfInterval, addYears, subYears, startOfYear, eachMonthOfInterval, endOfYear, subDays, startOfDay, endOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, LabelList, RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, CartesianGrid, Line, AreaChart, Area, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
// Weekdays only (Mon-Fri) - excludes Saturday (6) and Sunday (0)
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SHORT_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKDAY_INDICES = [1, 2, 3, 4, 5]; // Monday=1 through Friday=5
const FULL_SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getCurrencySymbol, Trade, Currency } from '@/types/trade';
import { TradingInsights } from '@/components/trade/TradingInsights';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTrades as useTradesStore } from '@/hooks/useTrades';
import { toast } from 'sonner';
import { TradeViewDialogContent } from '@/components/trade/TradeViewDialog';
import { ImageZoomDialog } from '@/components/ui/ImageZoomDialog';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { TypewriterDate } from '@/components/ui/TypewriterDate';
import { DashboardAccountSelector } from '@/components/account/DashboardAccountSelector';
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipTrigger as UiTooltipTrigger } from '@/components/ui/tooltip';

export default function CalendarPage() {
  const navigate = useNavigate();
  const {
    preferences,
    setGoalPeriod
  } = usePreferences();
  
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [dateRangePopoverOpen, setDateRangePopoverOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeViewOpen, setTradeViewOpen] = useState(false);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [allTimeMode, setAllTimeMode] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(() => {
    const saved = localStorage.getItem('balanceHidden');
    return saved === 'true';
  });
  const isMobile = useIsMobile();
  const goalPeriod = preferences.goalPeriod;
  const [currentTime, setCurrentTime] = useState(new Date());

  // Persist balance hidden preference
  useEffect(() => {
    localStorage.setItem('balanceHidden', balanceHidden.toString());
  }, [balanceHidden]);

  const displayRange = useMemo(() => {
    if (dateRange.from) return dateRange;
    if (viewMode === 'year') {
      return { from: startOfYear(currentMonth), to: endOfYear(currentMonth) };
    }
    return { from: startOfMonth(currentMonth), to: endOfMonth(currentMonth) };
  }, [currentMonth, dateRange, viewMode]);
  
  // No browser storage persistence for calendar filters
  const {
    trades,
    getMonthlyPnl,
    getDailyPnl,
    getWeeklyPnl,
    getYearlyPnl,
    deleteTrade
  } = useTrades();
  const { settings } = useSettings();
  const { activeAccount } = useAccount();
  // Use active account's currency, fallback to profile settings (match dashboard)
  const currencySymbol = useMemo(
    () => (activeAccount?.currency
      ? getCurrencySymbol(activeAccount.currency as any)
      : getCurrencySymbol(settings.currency)),
    [activeAccount?.currency, settings.currency]
  );

  // Format PnL with "k" suffix for 1000+ values, show 2 decimal places otherwise
  const formatPnlWithK = (value: number, includeSign = true) => {
    const absValue = Math.abs(value);
    const sign = includeSign ? (value >= 0 ? '+' : '-') : '';
    if (absValue >= 1000) {
      const kValue = absValue / 1000;
      return `${sign}${currencySymbol}${kValue.toFixed(1)}k`;
    }
    return `${sign}${currencySymbol}${absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPnlCompact = (value: number) => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${currencySymbol}${Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatPnlAxis = (value: number) => {
    const absValue = Math.abs(value);
    const sign = value >= 0 ? '+' : '-';
    if (absValue >= 1000) {
      return `${sign}${currencySymbol}${(absValue / 1000).toFixed(1)}k`;
    }
    return value >= 0 ? `+${currencySymbol}${value.toFixed(0)}` : `-${currencySymbol}${absValue.toFixed(0)}`;
  };

  const formatCurrency = (value: number, showSign = true) => {
    const sign = value > 0 ? '+' : value < 0 ? '-' : showSign ? '+' : '';
    return `${sign}${currencySymbol}${Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const accountTrades = useMemo(() => {
    if (!activeAccount) return trades;
    return trades.filter(trade => trade.accountId === activeAccount.id);
  }, [trades, activeAccount?.id]);

  const hasDateRangeFilter = Boolean(dateRange.from || dateRange.to);

  // Filter trades by date range
  const filteredTrades = useMemo(() => {
    if (!hasDateRangeFilter) return accountTrades;

    const fromDate = dateRange.from ? startOfDay(new Date(dateRange.from)) : undefined;
    const toDate = dateRange.to ? endOfDay(new Date(dateRange.to)) : undefined;

    return accountTrades.filter(trade => {
      const tradeDate = startOfDay(new Date(trade.date));

      if (fromDate && toDate) {
        return tradeDate >= fromDate && tradeDate <= toDate;
      }

      if (fromDate) {
        return tradeDate >= fromDate;
      }

      if (toDate) {
        return tradeDate <= toDate;
      }

      return true;
    });
  }, [accountTrades, hasDateRangeFilter, dateRange.from, dateRange.to]);

  const filteredDailyPnlMap = useMemo(() => {
    const map = new Map<string, number>();
    filteredTrades
      .filter(t => !t.isPaperTrade && !t.noTradeTaken)
      .forEach((trade) => {
        map.set(trade.date, (map.get(trade.date) || 0) + trade.pnlAmount);
      });
    return map;
  }, [filteredTrades]);

  const getFilteredDailyPnl = (dateStr: string) => filteredDailyPnlMap.get(dateStr) || 0;

  const profitColor = preferences.customColors.winColor;
  const lossColor = preferences.customColors.lossColor;

  const parseHoldingTime = (time: string): number => {
    if (!time || time.trim() === '') return 0;
    let totalMinutes = 0;
    const hourMatch = time.match(/(\d+)\s*h/i);
    const minMatch = time.match(/(\d+)\s*m/i);
    const secMatch = time.match(/(\d+)\s*s/i);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    if (secMatch) totalMinutes += parseInt(secMatch[1]) / 60;
    return totalMinutes;
  };

  const formatHoldingTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const holdingTimeByDay = useMemo(() => {
    const dayData: {
      [key: number]: {
        winMinutes: number;
        winCount: number;
        lossMinutes: number;
        lossCount: number;
      };
    } = {};

    for (let i = 0; i < 7; i++) {
      dayData[i] = {
        winMinutes: 0,
        winCount: 0,
        lossMinutes: 0,
        lossCount: 0
      };
    }

    const filtered = filteredTrades.filter(t => !t.isPaperTrade && !t.noTradeTaken);
    filtered.forEach(trade => {
      const holdingMinutes = parseHoldingTime(trade.holdingTime);
      if (holdingMinutes === 0) return;
      const dayOfWeek = new Date(trade.date).getDay();
      if (trade.pnlAmount > 0) {
        dayData[dayOfWeek].winMinutes += holdingMinutes;
        dayData[dayOfWeek].winCount += 1;
      } else if (trade.pnlAmount < 0) {
        dayData[dayOfWeek].lossMinutes += holdingMinutes;
        dayData[dayOfWeek].lossCount += 1;
      }
    });

    return FULL_SHORT_DAY_NAMES.map((day, index) => ({
      day,
      wins: dayData[index].winCount > 0 ? dayData[index].winMinutes / dayData[index].winCount : 0,
      losses: dayData[index].lossCount > 0 ? dayData[index].lossMinutes / dayData[index].lossCount : 0
    }));
  }, [filteredTrades]);

  const avgHoldingTimeWins = useMemo(() => {
    const wins = filteredTrades.filter(t => t.pnlAmount > 0 && !t.isPaperTrade && !t.noTradeTaken);
    const totalMinutes = wins.reduce((sum, t) => sum + parseHoldingTime(t.holdingTime), 0);
    const avgMinutes = wins.length > 0 ? totalMinutes / wins.length : 0;
    return formatHoldingTime(avgMinutes);
  }, [filteredTrades]);

  const avgHoldingTimeLosses = useMemo(() => {
    const losses = filteredTrades.filter(t => t.pnlAmount < 0 && !t.isPaperTrade && !t.noTradeTaken);
    const totalMinutes = losses.reduce((sum, t) => sum + parseHoldingTime(t.holdingTime), 0);
    const avgMinutes = losses.length > 0 ? totalMinutes / losses.length : 0;
    return formatHoldingTime(avgMinutes);
  }, [filteredTrades]);

  const entryTimeChartData = useMemo(() => {
    const hourlyData = new Map<number, number>();
    const filtered = filteredTrades.filter(t => !t.isPaperTrade && !t.noTradeTaken);

    filtered.forEach(trade => {
      if (!trade.entryTime) return;
      const [hours] = trade.entryTime.split(':').map(Number);
      if (isNaN(hours)) return;
      const existing = hourlyData.get(hours) || 0;
      hourlyData.set(hours, existing + trade.pnlAmount);
    });

    const formatHourRange = (h: number) => {
      const formatSingle = (hour: number) => {
        if (hour === 0) return '12AM';
        if (hour === 12) return '12PM';
        if (hour < 12) return `${hour}AM`;
        return `${hour - 12}PM`;
      };
      return `${formatSingle(h)}-${formatSingle((h + 1) % 24)}`;
    };

    const data = Array.from(hourlyData.entries())
      .map(([hour, pnl]) => ({
        hour,
        timeRange: formatHourRange(hour),
        pnl
      }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 4);

    return data;
  }, [filteredTrades]);

  // Calculate PnL percentage based on account starting balance
  const calculatePnlPercentage = (pnlAmount: number) => {
    const accountBalance = activeAccount?.starting_balance || 0;
    return accountBalance > 0 
      ? (pnlAmount / accountBalance * 100)
      : 0;
  };

  const dashboardStats = useMemo(() => {
    const realTrades = accountTrades.filter(t => !t.isPaperTrade && !t.noTradeTaken);

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
  }, [accountTrades]);

  const todayPnl = useMemo(() => getFilteredDailyPnl(format(new Date(), 'yyyy-MM-dd')), [filteredDailyPnlMap]);

  const recentTrades = useMemo(() => {
    return [...filteredTrades]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [filteredTrades]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close date range popover when day dialog opens
  useEffect(() => {
    if (dayDialogOpen) {
      setDateRangePopoverOpen(false);
    }
  }, [dayDialogOpen]);

  // Get dashboard trades for stats/cards - respects date range when active
  const monthlyTrades = useMemo(() => {
    if (hasDateRangeFilter || allTimeMode) {
      return filteredTrades.filter(trade => !trade.isPaperTrade && !trade.noTradeTaken);
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    return filteredTrades.filter(trade => {
      if (trade.isPaperTrade || trade.noTradeTaken) return false;
      const tradeDate = new Date(trade.date);
      return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
    });
  }, [filteredTrades, currentMonth, hasDateRangeFilter, allTimeMode]);

  // Calculate true account balance (all-time, ignores date filters)
  const accountBalance = useMemo(() => {
    const startingBalance = activeAccount?.starting_balance || 0;
    const allTimePnl = accountTrades
      .filter(t => !t.isPaperTrade && !t.noTradeTaken)
      .reduce((sum, t) => sum + t.pnlAmount, 0);
    return startingBalance + allTimePnl;
  }, [activeAccount?.starting_balance, accountTrades]);

  // Calculate wins and losses
  const {
    wins,
    losses,
    winRate
  } = useMemo(() => {
    if (monthlyTrades.length === 0) return {
      wins: 0,
      losses: 0,
      winRate: 0
    };
    const winCount = monthlyTrades.filter(t => t.pnlAmount > 0).length;
    const lossCount = monthlyTrades.filter(t => t.pnlAmount < 0).length;
    return {
      wins: winCount,
      losses: lossCount,
      winRate: Math.round(winCount / monthlyTrades.length * 100)
    };
  }, [monthlyTrades]);

  const monthlyOverview = useMemo(() => {
    if (monthlyTrades.length === 0) {
      return {
        netPnl: 0,
        profitFactor: 0,
        expectancy: 0,
        avgWin: 0,
        avgLoss: 0,
        breakeven: 0,
        totalTrades: 0
      };
    }

    const winningTrades = monthlyTrades.filter(t => t.pnlAmount > 0);
    const losingTrades = monthlyTrades.filter(t => t.pnlAmount < 0);
    const breakevenTrades = monthlyTrades.filter(t => t.pnlAmount === 0);

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlAmount, 0));
    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const winProbability = winningTrades.length / monthlyTrades.length;
    const lossProbability = losingTrades.length / monthlyTrades.length;

    return {
      netPnl: monthlyTrades.reduce((sum, t) => sum + t.pnlAmount, 0),
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
      expectancy: (winProbability * avgWin) - (lossProbability * avgLoss),
      avgWin,
      avgLoss,
      breakeven: breakevenTrades.length,
      totalTrades: monthlyTrades.length
    };
  }, [monthlyTrades]);

  const avgPnlPerTrade = useMemo(() => {
    if (monthlyOverview.totalTrades === 0) return 0;
    return monthlyOverview.netPnl / monthlyOverview.totalTrades;
  }, [monthlyOverview.netPnl, monthlyOverview.totalTrades]);

  const monthlyNetPnlPercentage = useMemo(() => {
    return monthlyTrades
      .filter(t => !t.isPaperTrade && !t.noTradeTaken)
      .reduce((sum, t) => sum + (t.pnlPercentage || 0), 0);
  }, [monthlyTrades]);

  const cumulativePnlChart = useMemo(() => {
    const relevantTrades = monthlyTrades
      .filter(t => !t.isPaperTrade && !t.noTradeTaken)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (relevantTrades.length === 0) {
      return {
        data: [],
        peak: 0,
        trough: 0,
        current: 0,
        sessions: 0
      };
    }

    const defaultFrom = hasDateRangeFilter && dateRange.from
      ? startOfDay(dateRange.from)
      : startOfMonth(currentMonth);

    const defaultTo = hasDateRangeFilter
      ? endOfDay(dateRange.to || dateRange.from || defaultFrom)
      : endOfMonth(currentMonth);

    const fromDate = defaultFrom;
    const toDate = defaultTo;

    const dailyPnlMap = new Map<string, number>();
    relevantTrades.forEach(trade => {
      const dayKey = format(new Date(trade.date), 'yyyy-MM-dd');
      dailyPnlMap.set(dayKey, (dailyPnlMap.get(dayKey) || 0) + (trade.pnlAmount || 0));
    });

    let cumulativePnl = 0;
    const data = eachDayOfInterval({ start: fromDate, end: toDate }).map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      cumulativePnl += dailyPnlMap.get(dayKey) || 0;
      return {
        date: format(day, 'MMM d'),
        pnl: Number(cumulativePnl.toFixed(2))
      };
    });

    const values = data.map(point => point.pnl);
    const peak = values.length > 0 ? Math.max(...values) : 0;
    const trough = values.length > 0 ? Math.min(...values) : 0;
    const current = values.length > 0 ? values[values.length - 1] : 0;

    return {
      data,
      peak,
      trough,
      current,
      sessions: new Set(relevantTrades.map(trade => format(new Date(trade.date), 'yyyy-MM-dd'))).size
    };
  }, [monthlyTrades, hasDateRangeFilter, dateRange.from, dateRange.to, currentMonth]);

  const holdingTimeInsight = useMemo(() => {
    const winners = monthlyTrades.filter(t => t.pnlAmount > 0 && !t.isPaperTrade && !t.noTradeTaken);
    const losers = monthlyTrades.filter(t => t.pnlAmount < 0 && !t.isPaperTrade && !t.noTradeTaken);

    const winnerMinutes = winners.reduce((sum, t) => sum + parseHoldingTime(t.holdingTime), 0);
    const loserMinutes = losers.reduce((sum, t) => sum + parseHoldingTime(t.holdingTime), 0);

    const winnerAvg = winners.length > 0 ? winnerMinutes / winners.length : 0;
    const loserAvg = losers.length > 0 ? loserMinutes / losers.length : 0;

    return {
      winnerAvg,
      loserAvg,
      edgeMinutes: winnerAvg - loserAvg
    };
  }, [monthlyTrades]);

  const entryTimeInsight = useMemo(() => {
    if (entryTimeChartData.length === 0) {
      return {
        bestWindow: '—',
        worstWindow: '—',
        dataPoints: 0
      };
    }

    const sortedByPnl = [...entryTimeChartData].sort((a, b) => b.pnl - a.pnl);
    const best = sortedByPnl[0];
    const worst = sortedByPnl[sortedByPnl.length - 1];

    return {
      bestWindow: best?.timeRange || '—',
      worstWindow: worst?.timeRange || '—',
      dataPoints: entryTimeChartData.length
    };
  }, [entryTimeChartData]);

  // Calculate average R-R
  const avgRR = useMemo(() => {
    if (monthlyTrades.length === 0) return 0;
    const validRRs = monthlyTrades.map(t => parseFloat(t.riskRewardRatio) || 0).filter(rr => rr > 0);
    if (validRRs.length === 0) return 0;
    return validRRs.reduce((sum, rr) => sum + rr, 0) / validRRs.length;
  }, [monthlyTrades]);

  // Calculate performance consistency score - based on performance grades
  const performanceScore = useMemo(() => {
    const tradesWithGrade = monthlyTrades.filter(t => t.performanceGrade);
    
    if (tradesWithGrade.length === 0) {
      return 0;
    }

    const avgGrade = tradesWithGrade.reduce((sum, t) => sum + (t.performanceGrade || 0), 0) / tradesWithGrade.length;
    const consistencyScore = (avgGrade / 3) * 100;
    
    return Math.round(consistencyScore);
  }, [monthlyTrades]);

  // Tradepath Score data for radar chart - based on monthly trades
  const tradepathScoreData = useMemo(() => {
    if (monthlyTrades.length === 0) {
      return {
        radarData: [{
          metric: 'Win %',
          value: 0,
          fullMark: 100
        }, {
          metric: 'Profit Factor',
          value: 0,
          fullMark: 100
        }, {
          metric: 'Win/Loss Ratio',
          value: 0,
          fullMark: 100
        }, {
          metric: 'Consistency',
          value: 0,
          fullMark: 100
        }, {
          metric: 'Rule Adherence',
          value: 0,
          fullMark: 100
        }],
        overallScore: 0
      };
    }

    const winningTrades = monthlyTrades.filter(t => t.pnlAmount > 0);
    const losingTrades = monthlyTrades.filter(t => t.pnlAmount < 0);
    const winPercent = winningTrades.length / monthlyTrades.length * 100;
    
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlAmount, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 3 : 0;
    const profitFactorScore = Math.min(profitFactor / 3 * 100, 100);
    
    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 1;
    const winLossRatio = avgWin / avgLoss;
    const winLossScore = Math.min(winLossRatio / 2 * 100, 100);
    
    const tradeDays = new Set(monthlyTrades.map(t => t.date));
    const profitableDays = new Set(monthlyTrades.filter(t => t.pnlAmount > 0).map(t => t.date));
    const consistencyScore = tradeDays.size > 0 ? profitableDays.size / tradeDays.size * 100 : 0;

    const avgGrade = monthlyTrades.reduce((sum, t) => sum + (t.performanceGrade || 0), 0) / monthlyTrades.length;
    const gradeScore = avgGrade / 3 * 100;

    let ruleComplianceScore = 50;
    const tradesWithRuleData = monthlyTrades.filter(t => t.followedRulesList && t.followedRulesList.length > 0 || t.brokenRules && t.brokenRules.length > 0);
    if (tradesWithRuleData.length > 0) {
      const totalFollowed = tradesWithRuleData.reduce((sum, t) => sum + (t.followedRulesList?.length || 0), 0);
      const totalBroken = tradesWithRuleData.reduce((sum, t) => sum + (t.brokenRules?.length || 0), 0);
      ruleComplianceScore = totalFollowed + totalBroken > 0 ? totalFollowed / (totalFollowed + totalBroken) * 100 : 50;
    }

    const ruleAdherenceScore = gradeScore * 0.6 + ruleComplianceScore * 0.4;
    
    const radarData = [{
      metric: 'Win %',
      value: winPercent,
      fullMark: 100
    }, {
      metric: 'Profit Factor',
      value: profitFactorScore,
      fullMark: 100
    }, {
      metric: 'Win/Loss Ratio',
      value: winLossScore,
      fullMark: 100
    }, {
      metric: 'Consistency',
      value: consistencyScore,
      fullMark: 100
    }, {
      metric: 'Rule Adherence',
      value: ruleAdherenceScore,
      fullMark: 100
    }];
    
    const overallScore = winPercent * 0.25 + profitFactorScore * 0.25 + winLossScore * 0.2 + consistencyScore * 0.15 + ruleAdherenceScore * 0.15;
    
    return {
      radarData,
      overallScore
    };
  }, [monthlyTrades]);

  // Calculate best and worst trades
  const {
    bestTrade,
    worstTrade
  } = useMemo(() => {
    if (monthlyTrades.length === 0) return {
      bestTrade: null,
      worstTrade: null
    };
    const sorted = [...monthlyTrades].sort((a, b) => b.pnlAmount - a.pnlAmount);
    return {
      bestTrade: sorted[0],
      worstTrade: sorted[sorted.length - 1]
    };
  }, [monthlyTrades]);

  // Calculate PnL and goal based on selected period
  const {
    currentPnl,
    currentGoal,
    goalLabel
  } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const today = format(new Date(), 'yyyy-MM-dd');
    switch (goalPeriod) {
      case 'D':
        return {
          currentPnl: getDailyPnl(today),
          currentGoal: settings.goals.daily,
          goalLabel: 'Daily Goal Progress'
        };
      case 'W':
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        return {
          currentPnl: getWeeklyPnl(format(startOfWeek, 'yyyy-MM-dd')),
          currentGoal: settings.goals.weekly,
          goalLabel: 'Weekly Goal Progress'
        };
      case 'M':
        return {
          currentPnl: getMonthlyPnl(year, month),
          currentGoal: settings.goals.monthly,
          goalLabel: 'Monthly Goal Progress'
        };
      case 'Y':
        return {
          currentPnl: getYearlyPnl(year),
          currentGoal: settings.goals.yearly,
          goalLabel: 'Yearly Goal Progress'
        };
      default:
        return {
          currentPnl: getMonthlyPnl(year, month),
          currentGoal: settings.goals.monthly,
          goalLabel: 'Monthly Goal Progress'
        };
    }
  }, [goalPeriod, currentMonth, getDailyPnl, getWeeklyPnl, getMonthlyPnl, getYearlyPnl, settings.goals]);
  const goalProgress = currentGoal > 0 ? Math.min(currentPnl / currentGoal * 100, 100) : 0;
  
  // Dashboard cards P&L (respects date range filter)
  const monthlyPnl = useMemo(() => monthlyTrades.reduce((sum, t) => sum + t.pnlAmount, 0), [monthlyTrades]);
  
  // Header display P&L (always shows current month, ignores date range)
  const displayedMonthlyPnl = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return filteredTrades
      .filter(trade => {
        if (trade.isPaperTrade || trade.noTradeTaken) return false;
        const tradeDate = new Date(trade.date);
        return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
      })
      .reduce((sum, t) => sum + t.pnlAmount, 0);
  }, [filteredTrades, currentMonth]);
  
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({
      start,
      end
    });
  }, [currentMonth]);
  // startDayOffset no longer needed - weekday calendar handles positioning internally
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handlePrevYear = () => setCurrentMonth(subYears(currentMonth, 1));
  const handleNextYear = () => setCurrentMonth(addYears(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());
  const handleMonthClick = (month: Date) => {
    setCurrentMonth(month);
    setViewMode('month');
  };
  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    // Close the date range popover first
    setDateRangePopoverOpen(false);
    // Then open the day dialog after a brief delay to ensure popover is closed
    setTimeout(() => {
      setDayDialogOpen(true);
    }, 50);
  };
  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTrades.filter(t => t.date === selectedDate);
  }, [filteredTrades, selectedDate]);
  const getTradeCountForDay = (dateStr: string) => {
    return filteredTrades.filter(t => t.date === dateStr).length;
  };

  // Count trading days - exclude paper trades
  const tradingDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const uniqueDates = new Set(filteredTrades.filter(trade => {
      if (trade.isPaperTrade || trade.noTradeTaken) return false;
      const tradeDate = new Date(trade.date);
      return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
    }).map(t => t.date));
    return uniqueDates.size;
  }, [filteredTrades, currentMonth]);

  // Year view data - monthly P&L for all 12 months - exclude paper trades
  const yearMonthsData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const yearStart = startOfYear(currentMonth);
    const yearEnd = endOfYear(currentMonth);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthTrades = filteredTrades.filter(trade => {
        if (trade.isPaperTrade || trade.noTradeTaken) return false;
        const tradeDate = new Date(trade.date);
        return tradeDate >= monthStart && tradeDate <= monthEnd;
      });
      const pnl = monthTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
      const tradingDaysCount = new Set(monthTrades.map(t => t.date)).size;
      return {
        month,
        pnl,
        tradingDays: tradingDaysCount,
        tradeCount: monthTrades.length
      };
    });
  }, [filteredTrades, currentMonth]);

  // Calculate weekly P&L for the current month - exclude paper trades
  const weeklyPnlData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weeks = eachWeekOfInterval({
      start: monthStart,
      end: monthEnd
    }, {
      weekStartsOn: 0
    });
    return weeks.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, {
        weekStartsOn: 0
      });

      // Filter trades within this week that are also in the current month - exclude paper trades
      const weekTrades = filteredTrades.filter(trade => {
        if (trade.isPaperTrade || trade.noTradeTaken) return false;
        const tradeDate = new Date(trade.date);
        return tradeDate >= weekStart && tradeDate <= weekEnd && isSameMonth(tradeDate, currentMonth);
      });
      const pnl = weekTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
      const tradingDaysInWeek = new Set(weekTrades.map(t => t.date)).size;
      return {
        weekNumber: index + 1,
        pnl,
        tradingDays: tradingDaysInWeek,
        tradeCount: weekTrades.length
      };
    });
  }, [filteredTrades, currentMonth]);

  // Day of week performance for current month (weekdays only)
  const dayOfWeekStats = useMemo(() => {
    const dayStats = DAY_NAMES.map((name, index) => ({
      day: name,
      shortDay: SHORT_DAY_NAMES[index],
      pnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0
    }));
    monthlyTrades.forEach(trade => {
      const dayIndex = getDay(new Date(trade.date));
      // Map Sunday=0...Saturday=6 to our weekday indices (Mon=0...Fri=4)
      if (dayIndex >= 1 && dayIndex <= 5) {
        const weekdayIndex = dayIndex - 1; // Convert to 0-4 index
        dayStats[weekdayIndex].pnl += trade.pnlAmount;
        dayStats[weekdayIndex].trades += 1;
        if (trade.pnlAmount > 0) dayStats[weekdayIndex].wins += 1;
        else if (trade.pnlAmount < 0) dayStats[weekdayIndex].losses += 1;
      }
    });
    dayStats.forEach(day => {
      day.winRate = day.trades > 0 ? day.wins / day.trades * 100 : 0;
    });
    return dayStats;
  }, [monthlyTrades]);

  // Day of week performance for entire year - exclude paper trades (weekdays only)
  const yearlyDayOfWeekStats = useMemo(() => {
    const yearStart = startOfYear(currentMonth);
    const yearEnd = endOfYear(currentMonth);
    
    const yearTrades = filteredTrades.filter(trade => {
      if (trade.isPaperTrade || trade.noTradeTaken) return false;
      const tradeDate = new Date(trade.date);
      return tradeDate >= yearStart && tradeDate <= yearEnd;
    });

    const dayStats = DAY_NAMES.map((name, index) => ({
      day: name,
      shortDay: SHORT_DAY_NAMES[index],
      pnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0
    }));
    
    yearTrades.forEach(trade => {
      const dayIndex = getDay(new Date(trade.date));
      // Map Sunday=0...Saturday=6 to our weekday indices (Mon=0...Fri=4)
      if (dayIndex >= 1 && dayIndex <= 5) {
        const weekdayIndex = dayIndex - 1;
        dayStats[weekdayIndex].pnl += trade.pnlAmount;
        dayStats[weekdayIndex].trades += 1;
        if (trade.pnlAmount > 0) dayStats[weekdayIndex].wins += 1;
        else if (trade.pnlAmount < 0) dayStats[weekdayIndex].losses += 1;
      }
    });
    
    dayStats.forEach(day => {
      day.winRate = day.trades > 0 ? day.wins / day.trades * 100 : 0;
    });
    
    return dayStats;
  }, [filteredTrades, currentMonth]);

  // Find best and worst days
  const bestDay = useMemo(() => {
    return dayOfWeekStats.reduce((best, day) => day.pnl > best.pnl ? day : best, dayOfWeekStats[0]);
  }, [dayOfWeekStats]);
  const worstDay = useMemo(() => {
    return dayOfWeekStats.reduce((worst, day) => day.pnl < worst.pnl ? day : worst, dayOfWeekStats[0]);
  }, [dayOfWeekStats]);
    return <div className="min-h-screen pb-24">
      <div className="px-4 pt-2 md:px-6 md:pt-6 lg:px-8">
        <div className="flex flex-col gap-6">
          {/* Modern Header */}
          <section className="w-full">
            <div className="mb-4 flex items-center justify-between gap-3">
              {/* Greeting */}
              <div className="flex-1 min-w-0">
                <h1
                  className="text-xl sm:text-2xl text-foreground"
                  style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 700, letterSpacing: '0.02em' }}
                >
                  Hey{settings.username ? `, ${settings.username}` : ''}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1 font-display font-bold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                  <TypewriterDate date={currentTime} />
                </p>
              </div>

              {/* Action Pills */}
              <div className="flex items-center gap-2">
                {/* Account Selector */}
                <div className="rounded-full border border-border/40 bg-card/95 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
                  <DashboardAccountSelector />
                </div>
                
                {/* Date Range Selector */}
                
                {/* Date Range Selector */}
                <div className="rounded-full border border-border/40 bg-card/95 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
                {dayDialogOpen ? (
                  <Button
                    key="disabled-btn"
                    variant="ghost"
                    className={cn(
                      "h-10 rounded-full px-4 gap-2 flex-shrink-0 text-sm",
                      "opacity-50 cursor-not-allowed"
                    )}
                    disabled
                  >
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="hidden md:inline text-muted-foreground font-display font-bold tabular-nums">Date Range</span>
                    <ChevronDown className="hidden md:inline-flex h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                ) : (
                  <Popover key="date-popover" open={dateRangePopoverOpen && !dayDialogOpen && !tradeViewOpen} onOpenChange={(open) => {
                    if (!dayDialogOpen && !tradeViewOpen) {
                      setDateRangePopoverOpen(open);
                    } else {
                      setDateRangePopoverOpen(false);
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "group h-10 transition-all duration-200 px-4 gap-2 flex-shrink-0 text-sm rounded-full",
                          "hover:bg-muted/30"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 text-foreground" />
                        <span className="hidden md:inline text-foreground font-display font-bold tabular-nums">
                          {displayRange.from ? (
                            displayRange.to ? (
                              `${format(displayRange.from, 'MMM dd')} - ${format(displayRange.to, 'MMM dd')}`
                            ) : (
                              format(displayRange.from, 'MMM dd')
                            )
                          ) : 'Date Range'}
                        </span>
                        <ChevronDown className="hidden md:inline-flex h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:rotate-180 duration-200" />
                      </Button>
                    </PopoverTrigger>
                    {!dayDialogOpen && !tradeViewOpen && (
                      <PopoverContent className="w-auto p-0" align="end">
                        <div className="flex">
                          {/* Left side - Preset buttons */}
                          <div className="flex flex-col gap-2 p-3 border-r border-border min-w-[160px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                setDateRange({ from: today, to: today });
                                setCurrentMonth(today);
                              }}
                              className={cn(
                                "justify-start hover:bg-muted",
                                dateRange.from && dateRange.to && 
                                format(dateRange.from, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                                format(dateRange.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                                "bg-muted font-medium"
                              )}
                            >
                              Today
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const yesterday = subDays(new Date(), 1);
                                setDateRange({ from: yesterday, to: yesterday });
                                setCurrentMonth(yesterday);
                              }}
                              className={cn(
                                "justify-start hover:bg-muted",
                                dateRange.from && dateRange.to &&
                                format(dateRange.from, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd') &&
                                format(dateRange.to, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd') &&
                                "bg-muted font-medium"
                              )}
                            >
                              Yesterday
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                const weekStart = startOfWeek(today, { weekStartsOn: 1 });
                                setDateRange({ from: weekStart, to: today });
                                setCurrentMonth(today);
                              }}
                              className={cn(
                                "justify-start hover:bg-muted",
                                dateRange.from && dateRange.to &&
                                format(dateRange.from, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') &&
                                format(dateRange.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                                "bg-muted font-medium"
                              )}
                            >
                              This week
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                const sevenDaysAgo = subDays(today, 6);
                                setDateRange({ from: sevenDaysAgo, to: today });
                                setCurrentMonth(today);
                              }}
                              className={cn(
                                "justify-start hover:bg-muted",
                                dateRange.from && dateRange.to &&
                                format(dateRange.from, 'yyyy-MM-dd') === format(subDays(new Date(), 6), 'yyyy-MM-dd') &&
                                format(dateRange.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                                "bg-muted font-medium"
                              )}
                            >
                              Last 7 days
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                const thirtyDaysAgo = subDays(today, 29);
                                setDateRange({ from: thirtyDaysAgo, to: today });
                                setCurrentMonth(today);
                              }}
                              className={cn(
                                "justify-start hover:bg-muted",
                                dateRange.from && dateRange.to &&
                                format(dateRange.from, 'yyyy-MM-dd') === format(subDays(new Date(), 29), 'yyyy-MM-dd') &&
                                format(dateRange.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                                "bg-muted font-medium"
                              )}
                            >
                              Last 30 days
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                const monthStart = startOfMonth(today);
                                setDateRange({ from: monthStart, to: today });
                                setCurrentMonth(today);
                                setAllTimeMode(false);
                              }}
                              className={cn(
                                "justify-start hover:bg-muted",
                                dateRange.from && dateRange.to &&
                                format(dateRange.from, 'yyyy-MM-dd') === format(startOfMonth(new Date()), 'yyyy-MM-dd') &&
                                format(dateRange.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                                "bg-muted font-medium"
                              )}
                            >
                              This month
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                const yearStart = startOfYear(today);
                                setDateRange({ from: yearStart, to: today });
                                setCurrentMonth(today);
                                setAllTimeMode(false);
                              }}
                              className={cn(
                                "justify-start hover:bg-muted",
                                dateRange.from && dateRange.to &&
                                format(dateRange.from, 'yyyy-MM-dd') === format(startOfYear(new Date()), 'yyyy-MM-dd') &&
                                format(dateRange.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                                "bg-muted font-medium"
                              )}
                            >
                              This year
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDateRange({ from: undefined, to: undefined });
                                setCurrentMonth(new Date());
                                setAllTimeMode(true);
                              }}
                              className={cn(
                                "justify-start hover:bg-muted",
                                allTimeMode && "bg-muted font-medium"
                              )}
                            >
                              All time
                            </Button>
                          </div>
                          {/* Right side - Calendar */}
                          <div>
                            <Calendar
                              mode="range"
                              selected={dateRange}
                              onSelect={(range) => {
                                setDateRange(range || { from: undefined, to: undefined } as any);
                                setAllTimeMode(false);
                                if (range?.from) {
                                  setCurrentMonth(range.from);
                                }
                              }}
                              month={currentMonth}
                              onMonthChange={setCurrentMonth}
                              numberOfMonths={2}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </div>
                        </div>
                        {dateRange.from && (
                          <div className="p-3 border-t border-border">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full text-muted-foreground"
                              onClick={() => {
                                setDateRange({ from: undefined, to: undefined });
                                setAllTimeMode(false);
                              }}
                            >
                              Clear date filter
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    )}
                  </Popover>
                )}
                </div>
              </div>
            </div>

            {/* 4 KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                  {/* Account Balance Card */}
                  <div className={cn(
                    "group rounded-2xl border p-4 relative overflow-hidden min-h-[128px] flex flex-col transition-all duration-300 shadow-sm",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/45 hover:border-white/15"
                      : "border-border/60 bg-card hover:border-border hover:shadow-md"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Balance</p>
                        <button 
                          type="button" 
                          onClick={() => setBalanceHidden(!balanceHidden)}
                          className="inline-flex p-1 rounded hover:bg-foreground/5 transition-colors"
                        >
                          {balanceHidden ? (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                          )}
                        </button>
                      </div>
                      <UiTooltip>
                        <UiTooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                          </button>
                        </UiTooltipTrigger>
                        <UiTooltipContent>
                          <p>Current account balance based on starting balance and cumulative P&L.</p>
                        </UiTooltipContent>
                      </UiTooltip>
                    </div>
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Account</span>
                        <span className="text-[10px] text-foreground font-bold uppercase tracking-wider">
                          {activeAccount?.name || 'Default'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold font-display tabular-nums tracking-tight text-foreground">
                        {balanceHidden ? '••••••' : `${currencySymbol}${accountBalance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`}
                      </p>
                    </div>
                  </div>

                  <div className={cn(
                    "group rounded-2xl border p-4 relative overflow-hidden min-h-[128px] flex flex-col transition-all duration-300 shadow-sm",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/45 hover:border-white/15"
                      : "border-border/60 bg-card hover:border-border hover:shadow-md"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Net P&L</p>
                      </div>
                      <UiTooltip>
                        <UiTooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                          </button>
                        </UiTooltipTrigger>
                        <UiTooltipContent>
                          <p>Total net profit or loss for the selected period.</p>
                        </UiTooltipContent>
                      </UiTooltip>
                    </div>
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Return</span>
                        <span className={cn(
                          "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold font-display tabular-nums",
                          monthlyNetPnlPercentage >= 0
                            ? "text-pnl-positive bg-pnl-positive/15 border-pnl-positive/30"
                            : "text-pnl-negative bg-pnl-negative/15 border-pnl-negative/30"
                        )}>
                          {monthlyNetPnlPercentage >= 0 ? '+' : ''}{monthlyNetPnlPercentage.toFixed(2)}%
                        </span>
                      </div>
                      <p className={cn(
                        "text-2xl font-bold font-display tabular-nums tracking-tight",
                        monthlyOverview.netPnl >= 0 ? "text-pnl-positive" : "text-pnl-negative"
                      )}>
                        {formatCurrency(monthlyOverview.netPnl)}
                      </p>
                    </div>
                  </div>

                  <div className={cn(
                    "group rounded-2xl border p-4 relative overflow-hidden min-h-[128px] flex flex-col transition-all duration-300 shadow-sm",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/45 hover:border-white/15"
                      : "border-border/60 bg-card hover:border-border hover:shadow-md"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Trade Win %</p>
                      </div>
                      <UiTooltip>
                        <UiTooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                          </button>
                        </UiTooltipTrigger>
                        <UiTooltipContent>
                          <p>Percentage of winning trades. Chips show wins, breakeven, and losses.</p>
                        </UiTooltipContent>
                      </UiTooltip>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-4">
                      <p className="text-2xl font-bold font-display tabular-nums tracking-tight text-foreground">{winRate.toFixed(1)}%</p>

                      <div className="flex flex-col items-end gap-1">
                        <svg viewBox="0 0 100 55" className="w-20 h-10">
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="hsl(var(--muted))"
                            strokeWidth="10"
                            strokeLinecap="round"
                            pathLength={100}
                          />
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="#9b8cff"
                            strokeWidth="10"
                            strokeLinecap="round"
                            pathLength={100}
                            strokeDasharray={`${Math.max(0, Math.min(100, winRate))} 100`}
                            className="transition-all duration-500"
                          />
                        </svg>

                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-pnl-positive/15 text-pnl-positive border border-pnl-positive/20">{wins}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-[#9b8cff]/20 text-[#9b8cff] border border-[#9b8cff]/30">{monthlyOverview.breakeven}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums bg-pnl-negative/15 text-pnl-negative border border-pnl-negative/20">{losses}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "group rounded-2xl border p-4 relative overflow-hidden min-h-[128px] flex flex-col transition-all duration-300 shadow-sm",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/45 hover:border-white/15"
                      : "border-border/60 bg-card hover:border-border hover:shadow-md"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Avg Win/Loss</p>
                      </div>
                      <UiTooltip>
                        <UiTooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                          </button>
                        </UiTooltipTrigger>
                        <UiTooltipContent>
                          <p>Average P&amp;L per trade over the selected period.</p>
                        </UiTooltipContent>
                      </UiTooltip>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-auto">
                      <p className="text-[10px] text-muted-foreground/80 font-semibold uppercase tracking-wider">per Trade</p>
                      <p className={cn(
                        "text-2xl font-bold font-display tabular-nums tracking-tight",
                        avgPnlPerTrade >= 0 ? "text-foreground" : "text-pnl-negative"
                      )}>
                        {avgPnlPerTrade.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className={cn(
                    "group rounded-2xl border p-4 relative overflow-hidden min-h-[128px] flex flex-col transition-all duration-300 shadow-sm",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/45 hover:border-white/15"
                      : "border-border/60 bg-card hover:border-border hover:shadow-md"
                  )}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Expected Value</p>
                      </div>
                      <UiTooltip>
                        <UiTooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                          </button>
                        </UiTooltipTrigger>
                        <UiTooltipContent>
                          <p>Expected return per trade based on historical outcomes.</p>
                        </UiTooltipContent>
                      </UiTooltip>
                    </div>
                    <div className="flex items-center gap-1 mb-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] leading-none font-bold tabular-nums bg-pnl-positive/15 text-pnl-positive border border-pnl-positive/20">{wins}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] leading-none font-bold tabular-nums bg-pnl-negative/15 text-pnl-negative border border-pnl-negative/20">{losses}</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-bold font-display tabular-nums tracking-tight mt-auto",
                      monthlyOverview.expectancy >= 0 ? "text-pnl-positive" : "text-pnl-negative"
                    )}>
                      {formatCurrency(monthlyOverview.expectancy)}
                    </p>
                  </div>
                </div>

                {/* 3 Card Row: Best/Worst Trades, Performance by Day, Recent Trades */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  {/* Daily Net Cumulative P&L Chart */}
                  <div className={cn(
                    "group rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 min-h-[320px] shadow-sm",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/45 hover:border-white/15"
                      : "border-border/60 bg-card hover:border-border hover:shadow-md"
                  )}>
                    <div className="relative flex flex-col h-full">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Daily Cumulative P&L</h3>
                        </div>
                        <UiTooltip>
                          <UiTooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                            </button>
                          </UiTooltipTrigger>
                          <UiTooltipContent>
                            <p>Cumulative P&L growth throughout the month by day.</p>
                          </UiTooltipContent>
                        </UiTooltip>
                      </div>

                      {monthlyTrades.length === 0 ? (
                        <div className="h-56 flex items-center justify-center">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">No trades this month</p>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col">
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="rounded-xl border border-border/50 bg-background/40 px-2.5 py-2 text-center">
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Peak</p>
                              <p className={cn("text-xs font-bold font-display tabular-nums", cumulativePnlChart.peak >= 0 ? "text-pnl-positive" : "text-pnl-negative")}>
                                {formatCurrency(cumulativePnlChart.peak)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border/50 bg-background/40 px-2.5 py-2 text-center">
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Lowest P&L</p>
                              <p className={cn("text-xs font-bold font-display tabular-nums", cumulativePnlChart.trough >= 0 ? "text-pnl-positive" : "text-pnl-negative")}>
                                {formatCurrency(cumulativePnlChart.trough)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border/50 bg-background/40 px-2.5 py-2 text-center">
                              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Sessions</p>
                              <p className="text-xs font-bold font-display text-foreground tabular-nums">{cumulativePnlChart.sessions}</p>
                            </div>
                          </div>

                          <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={cumulativePnlChart.data} margin={{ top: 8, right: 8, left: -8, bottom: 6 }}>
                                <defs>
                                  <linearGradient id="cumulativePnlFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                      offset="0%"
                                      stopColor={cumulativePnlChart.current >= 0 ? '#9b8cff' : '#ef4444'}
                                      stopOpacity={0.32}
                                    />
                                    <stop
                                      offset="100%"
                                      stopColor={cumulativePnlChart.current >= 0 ? '#9b8cff' : '#ef4444'}
                                      stopOpacity={0.02}
                                    />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.28} strokeDasharray="4 6" vertical={false} />
                                <XAxis 
                                  dataKey="date" 
                                  tick={{
                                    fontSize: 10,
                                    fill: 'hsl(var(--muted-foreground))',
                                    fontFamily: 'Outfit, system-ui, sans-serif',
                                    fontWeight: 700,
                                    letterSpacing: '0.06em'
                                  }}
                                  tickLine={false}
                                  axisLine={false}
                                  minTickGap={24}
                                  dy={8}
                                />
                                <YAxis 
                                  tick={{
                                    fontSize: 10,
                                    fill: 'hsl(var(--muted-foreground))',
                                    fontFamily: 'Outfit, system-ui, sans-serif',
                                    fontWeight: 700
                                  }}
                                  tickLine={false}
                                  axisLine={false}
                                  width={58}
                                  tickMargin={10}
                                  tickFormatter={(value: number) => formatPnlAxis(value)}
                                  domain={[
                                    (dataMin: number) => Math.floor((dataMin - 40) / 50) * 50,
                                    (dataMax: number) => Math.ceil((dataMax + 40) / 50) * 50,
                                  ]}
                                />
                                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeOpacity={0.6} strokeDasharray="3 5" />
                                <Tooltip 
                                  cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 5', strokeOpacity: 0.5 }}
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--background) / 0.94)',
                                    border: '1px solid hsl(var(--border) / 0.7)',
                                    borderRadius: '12px',
                                    fontSize: '10px',
                                    fontFamily: 'Outfit, system-ui, sans-serif',
                                    fontWeight: 700,
                                    letterSpacing: '0.06em',
                                    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.28)',
                                  }}
                                  formatter={(value: number) => formatCurrency(value)}
                                  labelStyle={{
                                    color: 'hsl(var(--foreground))',
                                    fontFamily: 'Outfit, system-ui, sans-serif',
                                    fontWeight: 700,
                                    letterSpacing: '0.06em'
                                  }}
                                  itemStyle={{
                                    fontFamily: 'Outfit, system-ui, sans-serif',
                                    fontWeight: 700,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase'
                                  }}
                                />
                                <Area
                                  type="monotone" 
                                  dataKey="pnl" 
                                  stroke={cumulativePnlChart.current >= 0 ? '#9b8cff' : '#ef4444'}
                                  fill="url(#cumulativePnlFill)"
                                  strokeWidth={2.4}
                                  dot={false}
                                  activeDot={{
                                    r: 5,
                                    strokeWidth: 2,
                                    stroke: 'hsl(var(--background))',
                                    fill: cumulativePnlChart.current >= 0 ? '#9b8cff' : '#ef4444'
                                  }}
                                  isAnimationActive
                                />
                                <Line
                                  type="monotone"
                                  dataKey="pnl"
                                  stroke={cumulativePnlChart.current >= 0 ? '#9b8cff' : '#ef4444'}
                                  strokeWidth={1.25}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Summary Stats */}
                          <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border/40">
                            <div className="text-center">
                              <p
                                className="text-[10px] text-muted-foreground font-bold uppercase"
                                style={{ fontFamily: 'Outfit, system-ui, sans-serif', letterSpacing: '0.06em' }}
                              >
                                Start
                              </p>
                              <p className="text-sm font-bold font-display text-foreground">£0.00</p>
                            </div>
                            <div className="text-center">
                              <p
                                className="text-[10px] text-muted-foreground font-bold uppercase"
                                style={{ fontFamily: 'Outfit, system-ui, sans-serif', letterSpacing: '0.06em' }}
                              >
                                Current
                              </p>
                              <p className={cn("text-sm font-bold font-display", cumulativePnlChart.current >= 0 ? "text-pnl-positive" : "text-pnl-negative")}>
                                {formatCurrency(cumulativePnlChart.current)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p
                                className="text-[10px] text-muted-foreground font-bold uppercase"
                                style={{ fontFamily: 'Outfit, system-ui, sans-serif', letterSpacing: '0.06em' }}
                              >
                                Range
                              </p>
                              <p className="text-sm font-bold font-display text-foreground">
                                {formatCurrency(cumulativePnlChart.peak - cumulativePnlChart.trough)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance by Day */}
                  <div className={cn(
                    "group rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 min-h-[320px] shadow-sm hover:shadow-md",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/50"
                      : "border-border/60 bg-card hover:border-border"
                  )}>
                    <div className="relative flex flex-col h-full">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Performance by Day</h3>
                        </div>
                        <UiTooltip>
                          <UiTooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                            </button>
                          </UiTooltipTrigger>
                          <UiTooltipContent>
                            <p>Your performance for each day of the week.</p>
                          </UiTooltipContent>
                        </UiTooltip>
                      </div>

                      <div className="flex-1 space-y-2.5">
                        {dayOfWeekStats.map((day) => {
                          const isBestDay = day.day === bestDay.day && bestDay.pnl > 0;
                          const isWorstDay = day.day === worstDay.day && worstDay.pnl < 0;
                          const maxPnl = Math.max(...dayOfWeekStats.map(d => Math.abs(d.pnl)), 1);
                          const barWidth = day.pnl !== 0 ? Math.abs(day.pnl) / maxPnl * 100 : 0;
                          
                          return (
                            <div 
                              key={day.day} 
                              className={cn(
                                'relative px-3.5 py-2.5 rounded-2xl transition-all duration-200 border',
                                isBestDay && 'bg-pnl-positive/10 border-pnl-positive/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
                                isWorstDay && 'bg-pnl-negative/10 border-pnl-negative/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
                                !isBestDay && !isWorstDay && 'bg-muted/10 border-border/25'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {/* Day Label */}
                                <div className={cn(
                                  'w-14 h-8 rounded-xl flex items-center justify-center border flex-shrink-0',
                                  isBestDay && 'bg-pnl-positive/15 border-pnl-positive/35',
                                  isWorstDay && 'bg-pnl-negative/15 border-pnl-negative/35',
                                  !isBestDay && !isWorstDay && 'bg-muted/20 border-border/30'
                                )}>
                                  <span className={cn(
                                    'text-xs font-bold uppercase tracking-widest',
                                    isBestDay ? 'text-pnl-positive' : isWorstDay ? 'text-pnl-negative' : 'text-muted-foreground'
                                  )}>
                                    {day.shortDay}
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    'h-8 rounded-xl overflow-hidden border border-border/20',
                                    day.pnl === 0 ? 'bg-muted/15' : 'bg-muted/25'
                                  )}>
                                    {day.pnl !== 0 && (
                                      <div 
                                        className={cn(
                                          'h-full rounded-xl transition-all duration-500',
                                          day.pnl >= 0 
                                            ? isBestDay 
                                              ? 'bg-gradient-to-r from-pnl-positive/85 to-pnl-positive' 
                                              : 'bg-gradient-to-r from-pnl-positive/45 to-pnl-positive/70'
                                            : isWorstDay
                                              ? 'bg-gradient-to-r from-pnl-negative/85 to-pnl-negative'
                                              : 'bg-gradient-to-r from-pnl-negative/45 to-pnl-negative/70'
                                        )} 
                                        style={{ width: `${barWidth}%` }}
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* P&L Amount and Badge */}
                                <div className="flex items-center gap-2.5 flex-shrink-0">
                                  <span className={cn(
                                    'text-sm font-bold font-display tabular-nums min-w-[86px] text-right',
                                    day.pnl > 0 ? 'text-pnl-positive' : day.pnl < 0 ? 'text-pnl-negative' : 'text-muted-foreground'
                                  )}>
                                    {formatPnlWithK(day.pnl)}
                                  </span>
                                  
                                  {(isBestDay || isWorstDay) && (
                                    <div className={cn(
                                      'px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border',
                                      isBestDay && 'bg-pnl-positive/20 text-pnl-positive border-pnl-positive/30',
                                      isWorstDay && 'bg-pnl-negative/20 text-pnl-negative border-pnl-negative/30'
                                    )}>
                                      {isBestDay ? 'Best' : 'Worst'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Recent Trades */}
                  <div className={cn(
                    "group rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 min-h-[320px] shadow-sm hover:shadow-md",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/50"
                      : "border-border/60 bg-card hover:border-border"
                  )}>
                    <div className="relative flex flex-col h-full">
                      <div className="flex items-center justify-between gap-2 mb-5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Recent Trades</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <UiTooltip>
                            <UiTooltipTrigger asChild>
                              <button type="button" className="inline-flex">
                                <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                              </button>
                            </UiTooltipTrigger>
                            <UiTooltipContent>
                              <p>Your 5 most recent trades</p>
                            </UiTooltipContent>
                          </UiTooltip>
                          <button
                            type="button"
                            onClick={() => navigate('/history')}
                            className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-border transition-colors whitespace-nowrap"
                          >
                            View all
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Recent trades list with improved spacing */}
                      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
                        {monthlyTrades.length > 0 ? (
                          [...monthlyTrades]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 5)
                            .map(trade => (
                            <div
                              key={trade.id}
                              onClick={() => {
                                setSelectedTrade(trade);
                                setTradeViewOpen(true);
                              }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-card/40 hover:bg-card/60 border border-border/40 transition-all duration-200 cursor-pointer group/trade relative overflow-hidden"
                            >
                              {/* Left border accent based on P&L */}
                              <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-200",
                                trade.pnlAmount >= 0 ? "bg-[#9b8cff]" : "bg-pnl-negative",
                                "opacity-0 group-hover/trade:opacity-100"
                              )} />
                              {/* Left: Trade type icon and symbol */}
                              <div className="flex-shrink-0">
                                <SymbolIcon symbol={trade.symbol} size="sm" />
                              </div>

                              {/* Middle: Symbol and date */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {trade.symbol}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium tracking-wide block">
                                  {format(new Date(trade.date), 'dd/MM/yyyy')}
                                </span>
                              </div>

                              {/* Right: P&L Info */}
                              <div className="flex-shrink-0 text-right space-y-0.5">
                                <span className={cn(
                                  "text-sm font-bold font-display tabular-nums block",
                                  trade.pnlAmount >= 0 ? "text-pnl-positive" : "text-pnl-negative"
                                )}>
                                  {formatCurrency(trade.pnlAmount)}
                                </span>
                                <span className={cn(
                                  "text-[9px] font-semibold tabular-nums block",
                                  trade.pnlPercentage >= 0 ? "text-pnl-positive" : "text-pnl-negative"
                                )}>
                                  {trade.pnlPercentage >= 0 ? '+' : ''}{trade.pnlPercentage.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p className="text-xs">No recent trades</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
          </section>

          {/* Main Calendar Section - Full width on desktop */}
          <div className="w-full space-y-3">
            {/* Goal Progress Card - Modern Redesign */}
            <div className={cn(
              "rounded-2xl border relative overflow-hidden transition-all duration-300 shadow-sm",
              preferences.liquidGlassEnabled
                ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                : "border-border/60 bg-card"
            )}>
              <div className="relative px-5 py-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-5 bg-[#9b8cff] rounded-full" />
                    <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Goal Progress</h3>
                    <UiTooltip>
                      <UiTooltipTrigger asChild>
                        <button type="button" className="inline-flex">
                          <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 hover:text-[#9b8cff] transition-colors" />
                        </button>
                      </UiTooltipTrigger>
                      <UiTooltipContent>
                        <p>Track your progress toward your {goalPeriod === 'D' ? 'daily' : goalPeriod === 'W' ? 'weekly' : goalPeriod === 'M' ? 'monthly' : 'yearly'} P&L goal.</p>
                      </UiTooltipContent>
                    </UiTooltip>
                  </div>
                  <div className="flex gap-1 p-1 rounded-lg border border-border/50 bg-background/50">
                    {(['D', 'W', 'M', 'Y'] as GoalPeriod[]).map(period => <button key={period} onClick={() => setGoalPeriod(period)} className={cn('px-3 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200 uppercase tracking-wider', goalPeriod === period ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                        {period}
                      </button>)}
                  </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-6">
                  {/* Left: Stats and Progress Bar */}
                  <div className="space-y-4">
                    {/* Period Label */}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy')}</span>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>
                    
                    {/* P&L Value */}
                    <div className="flex items-baseline gap-3">
                      <p className={cn('text-4xl font-bold font-display tabular-nums leading-none tracking-tight', currentPnl >= 0 ? 'text-[#9b8cff]' : 'text-pnl-negative')}>
                        {formatPnlWithK(currentPnl)}
                      </p>
                      <div className={cn('px-2.5 py-1 rounded-md text-xs font-bold tabular-nums', currentPnl >= 0 ? 'bg-[#9b8cff]/10 text-[#9b8cff]' : 'bg-pnl-negative/10 text-pnl-negative')}>
                        {Math.round(goalProgress)}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground">{formatPnlWithK(currentGoal, false)} Goal</span>
                      </div>
                      <div className="relative h-3 rounded-full bg-muted/40 overflow-hidden border border-border/30">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700 ease-out', currentPnl >= 0 ? 'bg-gradient-to-r from-[#9b8cff] to-[#b8acff]' : 'bg-gradient-to-r from-pnl-negative to-red-400')}
                          style={{ width: `${Math.max(0, Math.min(goalProgress, 100))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider">
                        <span className="text-muted-foreground/60">0%</span>
                        <span className="text-muted-foreground/60">100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Circular Progress */}
                  <div className="flex items-center justify-center lg:justify-end">
                    <div className="relative">
                      <svg className="transform -rotate-90" width="120" height="120">
                        {/* Background circle */}
                        <circle
                          cx="60"
                          cy="60"
                          r="52"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-muted/20"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="60"
                          cy="60"
                          r="52"
                          fill="none"
                          stroke={currentPnl >= 0 ? "#9b8cff" : "hsl(var(--pnl-negative))"}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 52}`}
                          strokeDashoffset={`${2 * Math.PI * 52 * (1 - Math.max(0, Math.min(goalProgress, 100)) / 100)}`}
                          className="transition-all duration-700 ease-out"
                          style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold font-display tabular-nums text-foreground leading-none">
                          {Math.round(goalProgress)}%
                        </span>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                          {goalPeriod === 'D' ? 'Daily' : goalPeriod === 'W' ? 'Weekly' : goalPeriod === 'M' ? 'Monthly' : 'Yearly'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Navigation */}
            <div className="relative flex items-center justify-between py-2">
              <div className="flex items-center">
                <button 
                  onClick={viewMode === 'year' ? handlePrevYear : handlePrevMonth}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-muted/50 flex items-center justify-center transition-all shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <span className="text-base font-semibold text-foreground text-center whitespace-nowrap min-w-[96px] sm:min-w-[140px] font-display">
                  {viewMode === 'year' ? format(currentMonth, 'yyyy') : (
                    <>
                      <span className="sm:hidden">{format(currentMonth, 'MMM yyyy')}</span>
                      <span className="hidden sm:inline">{format(currentMonth, 'MMM yyyy')}</span>
                    </>
                  )}
                </span>
                <button 
                  onClick={viewMode === 'year' ? handleNextYear : handleNextMonth}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-muted/50 flex items-center justify-center transition-all shrink-0"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <button 
                  onClick={handleToday} 
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0 ml-1 sm:ml-2',
                    viewMode === 'month' ? '' : 'hidden',
                    'bg-foreground text-background'
                  )}
                >
                  Today
                </button>
              </div>
              
              {/* Center - Stats */}
              {viewMode === 'month' && (
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 absolute left-1/2 -translate-x-1/2 text-center justify-center">
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-display font-semibold tabular-nums">Trades: <span className="text-xs text-foreground font-display font-semibold tabular-nums">{filteredTrades.filter(t => {
                    const tradeDate = new Date(t.date);
                    return !t.isPaperTrade && !t.noTradeTaken && tradeDate.getMonth() === currentMonth.getMonth() && tradeDate.getFullYear() === currentMonth.getFullYear();
                  }).length}</span></span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap font-display font-semibold tabular-nums">Monthly P&L: <span className="text-xs font-display font-semibold tabular-nums" style={{
                    color: `hsl(var(${displayedMonthlyPnl >= 0 ? '--pnl-positive' : '--pnl-negative'}))`
                  }}>{formatPnlWithK(displayedMonthlyPnl)}</span></span>
                </div>
              )}
              
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {/* Mobile View Mode Toggle - Minimal M/Y switch */}
                <div className="sm:hidden flex items-center">
                  <button
                    onClick={() => setViewMode(viewMode === 'month' ? 'year' : 'month')}
                    className="flex items-center h-7 rounded-full bg-muted/50 border border-border/50 p-0.5"
                  >
                    <span 
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
                        viewMode === 'month' ? 'bg-foreground text-background' : 'text-muted-foreground'
                      )}
                    >
                      M
                    </span>
                    <span 
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
                        viewMode === 'year' ? 'bg-foreground text-background' : 'text-muted-foreground'
                      )}
                    >
                      Y
                    </span>
                  </button>
                </div>
                {/* Desktop View Mode Toggle */}
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    onClick={() => setViewMode('month')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                      viewMode === 'month' 
                        ? 'bg-foreground text-background' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode('year')}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                      viewMode === 'year' 
                        ? 'bg-foreground text-background' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    Year
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'year' ? (
              /* Year View - 12 Month Grid */
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {yearMonthsData.map((monthData, index) => {
                  const isCurrentMonth = monthData.month.getMonth() === new Date().getMonth() && 
                                         monthData.month.getFullYear() === new Date().getFullYear();
                  const hasTrades = monthData.tradeCount > 0;
                  const isWin = monthData.pnl > 0;
                  const isLoss = monthData.pnl < 0;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleMonthClick(monthData.month)}
                      className={cn(
                        'group p-4 sm:p-5 rounded-2xl transition-all text-left relative overflow-hidden border',
                        'hover:scale-[1.02] active:scale-[0.98]',
                        preferences.liquidGlassEnabled
                          ? 'border-border/40 bg-card/95 dark:bg-card/80 backdrop-blur-xl hover:bg-card hover:border-border/60'
                          : 'bg-card border-border/50 hover:border-border hover:bg-muted/20',
                        isCurrentMonth && 'ring-2 ring-primary/40 border-primary/40'
                      )}
                    >
                      {/* Gradient overlay for months with trades */}
                      {hasTrades && (
                        <div 
                          className={cn(
                            'absolute inset-0 opacity-[0.03] pointer-events-none',
                            isWin ? 'bg-gradient-to-br from-pnl-positive/20 to-transparent' : 'bg-gradient-to-br from-pnl-negative/20 to-transparent'
                          )} 
                        />
                      )}
                      
                      <div className="relative flex flex-col gap-3">
                        {/* Month Header */}
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            'text-sm sm:text-base font-semibold',
                            isCurrentMonth ? 'text-primary' : 'text-foreground'
                          )}>
                            {format(monthData.month, 'MMMM')}
                          </span>
                        </div>
                        
                        {/* P&L Display */}
                        <div>
                          <span className={cn(
                            'text-2xl sm:text-3xl font-bold font-display tracking-tight block',
                            hasTrades 
                              ? isWin ? 'text-pnl-positive' : isLoss ? 'text-pnl-negative' : 'text-foreground'
                              : 'text-muted-foreground/30'
                          )}>
                            {hasTrades ? formatPnlWithK(monthData.pnl) : '—'}
                          </span>
                        </div>
                        
                        {/* Stats Row */}
                        <div className="flex items-center gap-3 text-xs">
                          <div className={cn(
                            "flex items-center gap-1.5",
                            hasTrades ? "text-muted-foreground" : "text-muted-foreground"
                          )}>
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              hasTrades ? 'bg-foreground/30' : 'bg-foreground/10'
                            )} />
                            <span className={cn(
                              "font-display tabular-nums",
                              hasTrades ? "font-medium" : "font-bold"
                            )}>{monthData.tradeCount} {monthData.tradeCount === 1 ? 'trade' : 'trades'}</span>
                          </div>
                          <div className={cn(
                            "flex items-center gap-1.5",
                            hasTrades ? "text-muted-foreground" : "text-muted-foreground"
                          )}>
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              hasTrades ? 'bg-foreground/30' : 'bg-foreground/10'
                            )} />
                            <span className={cn(
                              "font-display tabular-nums",
                              hasTrades ? "font-medium" : "font-bold"
                            )}>{monthData.tradingDays} {monthData.tradingDays === 1 ? 'day' : 'days'}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>
                <div className="flex items-center justify-center pt-1">
                  <div className="inline-flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md border-2 border-primary/50 bg-transparent" />
                    <span className="text-sm text-muted-foreground font-display font-bold tabular-nums">Current Month</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Month View - Original Calendar */
              <>
                {/* Day Headers with Weekly P&L column - Mon-Fri on mobile, Full week on tablet+ */}
                <div className="hidden md:grid grid-cols-8 gap-2 text-center mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <div key={i} className="h-7 flex items-center justify-center text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      {day}
                    </div>
                  ))}
                  <div className="h-7 flex items-center justify-center text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    WEEK
                  </div>
                </div>
                {/* Mobile headers - Mon to Fri only */}
                <div className="grid md:hidden grid-cols-6 gap-1 text-center mb-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                    <div key={i} className="h-6 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                      {day}
                    </div>
                  ))}
                  <div className="h-6 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    WK
                  </div>
                </div>

                {/* Calendar Grid with Weekly P&L - Full week */}
                <div className="space-y-2 md:space-y-3">
                  {(() => {
                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(currentMonth);
                    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
                    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
                    
                    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                    const weeks: Date[][] = [];
                    
                    for (let i = 0; i < allDays.length; i += 7) {
                      weeks.push(allDays.slice(i, i + 7));
                    }
                    
                    return weeks.map((week, weekIndex) => {
                      const weekData = weeklyPnlData[weekIndex];
                      const weekStartBalance = activeAccount?.starting_balance || 0;
                      const weekPnlPercent = weekStartBalance > 0 ? ((weekData?.pnl || 0) / weekStartBalance * 100).toFixed(2) : '0.00';
                      
                      // For mobile: only Mon-Fri (indices 1-5), for tablet+: full week
                      const weekdaysOnly = week.slice(1, 6); // Mon to Fri
                      
                      return (
                        <>
                        {/* Desktop/Tablet - Full week */}
                        <div key={weekIndex} className={cn(
                          "hidden md:grid grid-cols-8 gap-2 p-3 rounded-2xl border transition-all",
                          !weekData?.tradeCount && (preferences.liquidGlassEnabled
                            ? "border-white/10 bg-card/30 backdrop-blur-xl"
                            : "border-border/40 bg-muted/20")
                        )} style={{
                          backgroundColor: (weekData?.tradeCount && weekData?.pnl) ? `hsl(var(${weekData.pnl >= 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.05)` : undefined,
                          borderColor: (weekData?.tradeCount && weekData?.pnl) ? `hsl(var(${weekData.pnl >= 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.2)` : undefined
                        }}>
                          {week.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayPnl = getFilteredDailyPnl(dateStr);
                            const dayTrades = filteredTrades.filter(t => t.date === dateStr && !t.isPaperTrade && !t.noTradeTaken);
                            const noTradeTakenCount = filteredTrades.filter(t => t.date === dateStr && t.noTradeTaken).length;
                            const tradeCount = dayTrades.length;
                            const wins = dayTrades.filter(t => t.pnlAmount > 0).length;
                            const winRate = tradeCount > 0 ? Math.round((wins / tradeCount) * 100) : 0;
                            const isTodayDate = isToday(day);
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            
                            // Calculate percentage based on account balance
                            const accountBalance = activeAccount?.starting_balance || 0;
                            const pnlPercent = accountBalance > 0 ? (dayPnl / accountBalance * 100).toFixed(2) : '0.00';
                            
                            return (
                              <button
                                key={dateStr}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                  'h-24 rounded-xl flex flex-col items-center justify-center p-2.5 transition-all relative border-2 hover:scale-[1.02] hover:shadow-lg group',
                                  isCurrentMonth ? 'opacity-100' : 'opacity-35',
                                  isTodayDate && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                                  tradeCount === 0 && (preferences.liquidGlassEnabled
                                    ? 'bg-card/40 backdrop-blur-xl border-white/5 hover:bg-card/60'
                                    : 'bg-background border-border/20 hover:bg-muted/30')
                                )}
                                style={tradeCount > 0 ? {
                                  backgroundColor: `hsl(var(${dayPnl > 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.08)`,
                                  borderColor: `hsl(var(${dayPnl > 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.25)`,
                                } : undefined}
                              >
                                {/* Date number - top left */}
                                <div className={cn(
                                  'absolute top-1.5 left-2 text-sm font-display font-bold tabular-nums',
                                  isTodayDate ? 'text-primary' : 'text-foreground/50'
                                )}>
                                  {format(day, 'd')}
                                </div>

                                {/* Trade info - centered */}
                                {tradeCount > 0 && (
                                  <div className="flex flex-col items-center gap-1 mt-4">
                                    <div className="text-base font-bold font-display tabular-nums w-full text-center px-0.5 truncate"
                                      style={{ color: `hsl(var(${dayPnl >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}>
                                      {formatPnlWithK(dayPnl)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-display font-semibold tabular-nums bg-muted/40 px-2 py-0.5 rounded-full">
                                      {tradeCount} {tradeCount !== 1 ? 'trades' : 'trade'}
                                    </div>
                                  </div>
                                )}
                                {tradeCount === 0 && noTradeTakenCount > 0 && (
                                  <div className="text-xs text-muted-foreground/50 font-display font-bold tabular-nums">
                                    —
                                  </div>
                                )}
                              </button>
                            );
                          })}
                          
                          {/* Weekly Summary */}
                          <div className={cn(
                            "h-24 flex flex-col items-center justify-center rounded-xl p-3 border-2 font-bold transition-all",
                            preferences.liquidGlassEnabled
                              ? "border-white/10 bg-card/60 backdrop-blur-2xl"
                              : "bg-card/80 border-border/30"
                          )}>
                            <div className="text-[9px] text-muted-foreground/70 mb-1.5 whitespace-nowrap font-display font-bold uppercase tracking-widest">
                              Week {weekIndex + 1}
                            </div>
                            <div className="text-base font-display tabular-nums mb-1 w-full text-center truncate leading-tight"
                              style={{ color: `hsl(var(${(weekData?.pnl || 0) >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}>
                              {formatPnlWithK(weekData?.pnl || 0)}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-display font-semibold tabular-nums bg-muted/30 px-2 py-0.5 rounded-full">
                              {weekData?.tradeCount || 0} {(weekData?.tradeCount || 0) === 1 ? 'trade' : 'trades'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Mobile - Weekdays only (Mon-Fri) */}
                        <div key={`${weekIndex}-mobile`} className={cn(
                          "grid md:hidden grid-cols-6 gap-1 p-2.5 rounded-2xl border",
                          !weekData?.tradeCount && (preferences.liquidGlassEnabled
                            ? "border-white/10 bg-card/30 backdrop-blur-xl"
                            : "border-border/40 bg-muted/20")
                        )} style={{
                          backgroundColor: (weekData?.tradeCount && weekData?.pnl) ? `hsl(var(${weekData.pnl >= 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.05)` : undefined,
                          borderColor: (weekData?.tradeCount && weekData?.pnl) ? `hsl(var(${weekData.pnl >= 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.2)` : undefined
                        }}>
                          {weekdaysOnly.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayPnl = getFilteredDailyPnl(dateStr);
                            const dayTrades = filteredTrades.filter(t => t.date === dateStr && !t.isPaperTrade && !t.noTradeTaken);
                            const noTradeTakenCount = filteredTrades.filter(t => t.date === dateStr && t.noTradeTaken).length;
                            const tradeCount = dayTrades.length;
                            const isTodayDate = isToday(day);
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const accountBalance = activeAccount?.starting_balance || 0;
                            const pnlPercent = accountBalance > 0 ? (dayPnl / accountBalance * 100).toFixed(2) : '0.00';
                            
                            return (
                              <button
                                key={dateStr}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                  'h-16 rounded-lg flex flex-col items-center justify-center p-1.5 transition-all relative border hover:shadow-md',
                                  isCurrentMonth ? 'opacity-100' : 'opacity-40',
                                  isTodayDate && 'ring-2 ring-primary shadow-lg',
                                  tradeCount === 0 && (preferences.liquidGlassEnabled
                                    ? 'bg-card/80 backdrop-blur-2xl border-white/10 hover:bg-card/90'
                                    : 'bg-background border-border/40 hover:bg-muted/5')
                                )}
                                style={tradeCount > 0 ? {
                                  backgroundColor: `hsl(var(${dayPnl > 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.12)`,
                                  borderColor: `hsl(var(${dayPnl > 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.3)`,
                                  boxShadow: isTodayDate ? 'none' : undefined
                                } : undefined}
                              >
                                <div className={cn(
                                  'absolute top-0.5 left-1 text-xs font-display font-bold tabular-nums',
                                  isTodayDate ? 'text-primary' : 'text-foreground/60'
                                )}>
                                  {format(day, 'd')}
                                </div>
                                {tradeCount > 0 && (
                                  <div className="flex flex-col items-center gap-0.5 mt-2">
                                    <div className="text-[10px] font-bold font-display tabular-nums w-full text-center px-0.5 truncate"
                                      style={{ color: `hsl(var(${dayPnl >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}>
                                      {formatPnlWithK(dayPnl)}
                                    </div>
                                    <div className="text-[8px] text-muted-foreground font-display font-semibold tabular-nums">
                                      {tradeCount}t
                                    </div>
                                  </div>
                                )}
                                {tradeCount === 0 && noTradeTakenCount > 0 && (
                                  <div className="text-[8px] text-muted-foreground font-display font-bold tabular-nums">
                                    —
                                  </div>
                                )}
                              </button>
                            );
                          })}
                          
                          {/* Weekly Summary - Mobile */}
                          <div className={cn(
                            "h-16 flex flex-col items-center justify-center rounded-lg p-1.5 border font-bold",
                            preferences.liquidGlassEnabled
                              ? "border-white/10 bg-card/80 backdrop-blur-2xl"
                              : "bg-card border-border/40"
                          )}>
                            <div className="text-[9px] text-muted-foreground/70 mb-0.5 whitespace-nowrap font-display font-semibold tracking-wider">
                              Week {weekIndex + 1}
                            </div>
                            <div className="text-[10px] font-display tabular-nums mb-0.5 w-full text-center truncate"
                              style={{ color: `hsl(var(${(weekData?.pnl || 0) >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}>
                              {formatPnlWithK(weekData?.pnl || 0)}
                            </div>
                            <div className="text-[8px] text-muted-foreground font-display font-semibold tabular-nums">
                              {weekData?.tradeCount || 0} {(weekData?.tradeCount || 0) === 1 ? 'trade' : 'trades'}
                            </div>
                          </div>
                        </div>
                        </>
                      );
                    });
                  })()}
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center justify-center gap-6 py-6">
                  <div className="flex items-center gap-2.5">
                    <div className="h-4 w-4 rounded-md bg-pnl-positive/15 border-2 border-pnl-positive/50" />
                    <span className="text-xs text-muted-foreground font-display font-semibold">Profitable</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-4 w-4 rounded-md bg-pnl-negative/15 border-2 border-pnl-negative/50" />
                    <span className="text-xs text-muted-foreground font-display font-semibold">Loss</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-4 w-4 rounded-md bg-muted/20 ring-2 ring-primary ring-offset-1 ring-offset-background" />
                    <span className="text-xs text-muted-foreground font-display font-semibold">Today</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stats Section - Bottom on desktop, stacked on mobile */}
          {viewMode === 'year' ? (
            /* Year View - Only Performance by Day */
            <div className="w-full">
              <div className={cn(
                "rounded-2xl border p-4 relative overflow-hidden",
                preferences.liquidGlassEnabled
                  ? "border-border/50 bg-card/95 dark:bg-card/80 backdrop-blur-xl"
                  : "border-border/50 bg-card"
              )}>
                {/* Dot pattern - only show when glass is enabled */}
                {preferences.liquidGlassEnabled && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="year-performance-dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="0.75" className="fill-foreground/[0.08] dark:fill-foreground/[0.05]" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#year-performance-dots)" />
                  </svg>
                )}
                <div className="relative">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Performance by Day ({format(currentMonth, 'yyyy')})</h3>
                  <div className="space-y-1.5">
                  {(() => {
                    const stats = yearlyDayOfWeekStats;
                    const yearBestDay = stats.reduce((best, day) => day.pnl > best.pnl ? day : best, stats[0]);
                    const yearWorstDay = stats.reduce((worst, day) => day.pnl < worst.pnl ? day : worst, stats[0]);
                    const maxPnl = Math.max(...stats.map(d => Math.abs(d.pnl)), 1);
                    
                    return stats.map(day => {
                      const isBestDay = day.day === yearBestDay.day && yearBestDay.pnl > 0;
                      const isWorstDay = day.day === yearWorstDay.day && yearWorstDay.pnl < 0;
                      const barWidth = day.pnl !== 0 ? Math.abs(day.pnl) / maxPnl * 100 : 0;
                      
                      return (
                        <div key={day.day} className={cn('flex items-center gap-2 p-2 rounded-xl transition-colors', isBestDay && 'bg-pnl-positive/10 border border-pnl-positive/20', isWorstDay && 'bg-pnl-negative/10 border border-pnl-negative/20', !isBestDay && !isWorstDay && 'bg-muted/30 border border-transparent')}>
                          <div className="w-10 flex-shrink-0">
                            <span className={cn('text-xs font-semibold', day.pnl > 0 ? 'text-pnl-positive' : day.pnl < 0 ? 'text-pnl-negative' : 'text-muted-foreground')}>
                              {day.shortDay}
                            </span>
                          </div>
                          <div className="flex-1 h-5 bg-muted/50 dark:bg-white/5 rounded-lg overflow-hidden relative">
                            {day.pnl !== 0 && <div className={cn('h-full rounded-lg transition-all', day.pnl >= 0 ? 'bg-pnl-positive/70' : 'bg-pnl-negative/70')} style={{
                              width: `${barWidth}%`
                            }} />}
                          </div>
                          <div className="w-16 text-right flex-shrink-0">
                            <span className={cn('text-xs font-semibold font-display', day.pnl > 0 ? 'text-pnl-positive' : day.pnl < 0 ? 'text-pnl-negative' : 'text-muted-foreground')}>
                              {formatPnlWithK(day.pnl)}
                            </span>
                          </div>
                          {isBestDay && <span className="text-[8px] text-pnl-positive font-bold bg-pnl-positive/20 px-1.5 py-0.5 rounded-md uppercase tracking-wide">Best</span>}
                          {isWorstDay && <span className="text-[8px] text-pnl-negative font-bold bg-pnl-negative/20 px-1.5 py-0.5 rounded-md uppercase tracking-wide">Worst</span>}
                        </div>
                      );
                    });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Day View Dialog */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen} modal={true}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto" style={{ zIndex: 9999 }}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              {selectedDate && format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedDayTrades.length} {selectedDayTrades.length === 1 ? 'trade' : 'trades'} on this day
            </p>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {selectedDayTrades.length > 0 ? (
              <>
                {selectedDayTrades.map(trade => (
                  <div 
                    key={trade.id} 
                    className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedTrade(trade);
                      setDayDialogOpen(false);
                      setTradeViewOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <SymbolIcon symbol={trade.symbol} size="md" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-lg">{trade.symbol}</span>
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase',
                              trade.direction === 'long' 
                                ? 'bg-pnl-positive/10 text-pnl-positive' 
                                : 'bg-pnl-negative/10 text-pnl-negative'
                            )}>
                              {trade.direction === 'long' ? 'Long' : 'Short'}
                            </span>
                            {trade.forecastId && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                Linked
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {trade.category || 'Stocks'} • {trade.lotSize} units
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {trade.isPaperTrade || trade.noTradeTaken ? (
                          <span className="px-3 py-1 rounded-lg text-xs font-medium border border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground whitespace-nowrap">
                            {trade.isPaperTrade ? 'Paper' : 'No Trade'}
                          </span>
                        ) : (
                          <div className="text-right">
                            <p className={cn(
                              'text-lg font-bold font-display',
                              trade.pnlAmount >= 0 ? 'text-pnl-positive' : 'text-pnl-negative'
                            )}>
                              {trade.pnlAmount >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(trade.pnlAmount).toLocaleString()}
                            </p>
                            <p className={cn(
                              'text-xs font-display',
                              trade.pnlAmount >= 0 ? 'text-pnl-positive' : 'text-pnl-negative'
                            )}>
                              {trade.pnlAmount >= 0 ? '+' : ''}{calculatePnlPercentage(trade.pnlAmount).toFixed(2)}%
                            </p>
                          </div>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[10000]">
                            <DropdownMenuItem onClick={e => {
                              e.stopPropagation();
                              setSelectedTrade(trade);
                              setDayDialogOpen(false);
                              setTradeViewOpen(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={e => {
                              e.stopPropagation();
                              setDayDialogOpen(false);
                              navigate(`/edit/${trade.id}`);
                            }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive" 
                              onClick={e => {
                                e.stopPropagation();
                                setDeleteConfirmId(trade.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : null}

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                setDayDialogOpen(false);
                navigate(`/add?date=${selectedDate}`);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Trade for This Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trade View Dialog */}
      <Dialog open={tradeViewOpen} onOpenChange={setTradeViewOpen}>
        <DialogContent fullScreenOnMobile hideCloseButton className="max-w-4xl sm:max-h-[90vh] p-0 gap-0 sm:overflow-hidden">
          {selectedTrade && <TradeViewDialogContent trade={selectedTrade} forecasts={{}} currencySymbol={currencySymbol} formatPnl={amount => `${amount >= 0 ? '+' : ''}${currencySymbol}${Math.abs(amount).toLocaleString()}`} onClose={() => setTradeViewOpen(false)} onEdit={tab => {
          setTradeViewOpen(false);
          navigate(`/edit/${selectedTrade.id}${tab ? `?tab=${tab}` : ''}`);
        }} onViewForecast={() => {}} onImageClick={(images, index) => {
          setZoomImages(images);
          setZoomIndex(index);
          setZoomOpen(true);
        }} />}
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction 
              onClick={async () => {
                if (deleteConfirmId) {
                  const success = await deleteTrade(deleteConfirmId);
                  if (success) {
                    toast.success('Trade deleted successfully');
                  } else {
                    toast.error('Failed to delete trade');
                  }
                  setDeleteConfirmId(null);
                }
              }} 
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}
