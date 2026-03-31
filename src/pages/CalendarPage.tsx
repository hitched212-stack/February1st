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
    const scopedTrades = trades.filter(trade => trade.accountId === activeAccount.id);
    return scopedTrades.length > 0 ? scopedTrades : trades;
  }, [trades, activeAccount?.id]);

  const firstTradeDate = useMemo(() => {
    const sortedTradeDates = accountTrades
      .filter(trade => !trade.isPaperTrade && !trade.noTradeTaken)
      .map(trade => startOfDay(new Date(trade.date)))
      .sort((a, b) => a.getTime() - b.getTime());

    return sortedTradeDates[0];
  }, [accountTrades]);

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

    const fromKey = format(fromDate, 'yyyy-MM-dd');
    const toKey = format(toDate, 'yyyy-MM-dd');

    const tradingDays = Array.from(dailyPnlMap.keys())
      .filter(dayKey => dayKey >= fromKey && dayKey <= toKey)
      .sort((a, b) => a.localeCompare(b));

    let cumulativePnl = 0;
    const data = tradingDays.map(dayKey => {
      cumulativePnl += dailyPnlMap.get(dayKey) || 0;
      return {
        date: format(new Date(`${dayKey}T00:00:00`), 'MMM d'),
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
      sessions: tradingDays.length
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
  const goalProgress = currentGoal > 0 && currentPnl > 0
    ? Math.min((currentPnl / currentGoal) * 100, 100)
    : 0;
  const visibleGoalProgress = goalProgress > 0 ? Math.max(goalProgress, 2) : 0;
  
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
                                setAllTimeMode(false);
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
                                setAllTimeMode(false);
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
                                setAllTimeMode(false);
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
                                setAllTimeMode(false);
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
                                setAllTimeMode(false);
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
                                const today = new Date();
                                setDateRange({ from: firstTradeDate ?? today, to: today });
                                setCurrentMonth(today);
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
                        <UiTooltip>
                          <UiTooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                            </button>
                          </UiTooltipTrigger>
                          <UiTooltipContent>
                            <p className="font-display font-medium">Current account balance based on starting balance and cumulative P&L.</p>
                          </UiTooltipContent>
                        </UiTooltip>
                      </div>
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
                    <div className="flex items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Net P&L</p>
                        <UiTooltip>
                          <UiTooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                            </button>
                          </UiTooltipTrigger>
                          <UiTooltipContent>
                            <p className="font-display font-medium">Total net profit or loss for the selected period.</p>
                          </UiTooltipContent>
                        </UiTooltip>
                      </div>
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
                    <div className="flex items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Trade Win %</p>
                        <UiTooltip>
                          <UiTooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                            </button>
                          </UiTooltipTrigger>
                          <UiTooltipContent>
                            <p className="font-display font-medium">Percentage of winning trades. Chips show wins, breakeven, and losses.</p>
                          </UiTooltipContent>
                        </UiTooltip>
                      </div>
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
                    <div className="flex items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Avg Win/Loss</p>
                        <UiTooltip>
                          <UiTooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                            </button>
                          </UiTooltipTrigger>
                          <UiTooltipContent>
                            <p className="font-display font-medium">Average P&amp;L per trade over the selected period.</p>
                          </UiTooltipContent>
                        </UiTooltip>
                      </div>
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
                    <div className="flex items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-widest">Expected Value</p>
                        <UiTooltip>
                          <UiTooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                            </button>
                          </UiTooltipTrigger>
                          <UiTooltipContent>
                            <p className="font-display font-medium">Expected return per trade based on historical outcomes.</p>
                          </UiTooltipContent>
                        </UiTooltip>
                      </div>
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
                <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.2fr_0.8fr] xl:items-stretch gap-4 mt-4">
                  {/* Daily Net Cumulative P&L Chart */}
                  <div className={cn(
                    "group rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 min-h-[320px] xl:h-[460px] shadow-sm",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/45 hover:border-white/15"
                      : "border-border/60 bg-card hover:border-border hover:shadow-md"
                  )}>
                    <div className="relative flex flex-col h-full">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Daily Cumulative P&L</h3>
                          <UiTooltip>
                            <UiTooltipTrigger asChild>
                              <button type="button" className="inline-flex">
                                <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                              </button>
                            </UiTooltipTrigger>
                            <UiTooltipContent>
                              <p className="font-display font-medium">Cumulative P&amp;L growth throughout the month by day.</p>
                            </UiTooltipContent>
                          </UiTooltip>
                        </div>
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

                          <div className="h-56 min-h-[14rem]">
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
                    "group rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 min-h-[320px] xl:h-[460px] shadow-sm hover:shadow-md",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl hover:bg-black/50"
                      : "border-border/60 bg-card hover:border-border"
                  )}>
                    <div className="relative flex flex-col h-full">
                      <div className="flex items-center mb-5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Performance by Day</h3>
                          <UiTooltip>
                            <UiTooltipTrigger asChild>
                              <button type="button" className="inline-flex">
                                <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                              </button>
                            </UiTooltipTrigger>
                            <UiTooltipContent>
                              <p className="font-display font-medium">Your performance for each day of the week.</p>
                            </UiTooltipContent>
                          </UiTooltip>
                        </div>
                      </div>

                      {(() => {
                        const maxAbsPnl = Math.max(...dayOfWeekStats.map((d) => Math.abs(d.pnl)), 1);
                        const maxTrades = Math.max(...dayOfWeekStats.map((d) => d.trades), 1);
                        const activeDays = dayOfWeekStats.filter((d) => d.trades > 0).length;
                        const averageWinRate = activeDays > 0
                          ? dayOfWeekStats.filter((d) => d.trades > 0).reduce((sum, day) => sum + day.winRate, 0) / activeDays
                          : 0;

                        return (
                          <div className="flex-1 flex flex-col gap-4">
                            <div className="grid grid-cols-3 gap-2.5">
                              <div className="rounded-2xl border border-pnl-positive/20 bg-pnl-positive/[0.08] px-3 py-3">
                                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-pnl-positive/70">Best day</p>
                                <p className="mt-2 text-sm font-bold font-display text-foreground">{bestDay.shortDay}</p>
                                <p className="mt-1 text-[12px] font-bold font-display tabular-nums text-pnl-positive">
                                  {bestDay.pnl > 0 ? formatCurrency(bestDay.pnl) : '—'}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-pnl-negative/20 bg-pnl-negative/[0.08] px-3 py-3">
                                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-pnl-negative/70">Worst day</p>
                                <p className="mt-2 text-sm font-bold font-display text-foreground">{worstDay.shortDay}</p>
                                <p className="mt-1 text-[12px] font-bold font-display tabular-nums text-pnl-negative">
                                  {worstDay.pnl < 0 ? formatCurrency(worstDay.pnl) : '—'}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.08] px-3 py-3">
                                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sky-300/80">Avg win rate</p>
                                <p className="mt-2 text-sm font-bold font-display text-foreground">{activeDays}/5 days</p>
                                <p className="mt-1 text-[12px] font-bold font-display tabular-nums text-sky-300">
                                  {activeDays > 0 ? `${Math.round(averageWinRate)}%` : '—'}
                                </p>
                              </div>
                            </div>

                            <div className="flex-1 rounded-[26px] border border-border/25 bg-gradient-to-b from-background/80 via-background/55 to-background/30 p-3.5 sm:p-4">
                              <div className="grid grid-cols-[32px_repeat(5,minmax(0,1fr))] gap-1.5 items-center">
                                <div />
                                {dayOfWeekStats.map((day) => {
                                  const isBestDay = day.day === bestDay.day && bestDay.pnl > 0;
                                  const isWorstDay = day.day === worstDay.day && worstDay.pnl < 0;

                                  return (
                                    <div
                                      key={`header-${day.day}`}
                                      className={cn(
                                        'rounded-2xl border px-1 py-3 text-center',
                                        isBestDay && 'border-pnl-positive/30 bg-pnl-positive/[0.08] shadow-[0_0_0_1px_hsl(var(--pnl-positive)/0.08)]',
                                        isWorstDay && 'border-pnl-negative/30 bg-pnl-negative/[0.08] shadow-[0_0_0_1px_hsl(var(--pnl-negative)/0.08)]',
                                        !isBestDay && !isWorstDay && 'border-border/30 bg-muted/10'
                                      )}
                                    >
                                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-foreground/70">{day.shortDay}</p>
                                    </div>
                                  );
                                })}

                                <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/75">P&amp;L</span>
                                {dayOfWeekStats.map((day) => {
                                  const intensity = Math.max(0.08, Math.abs(day.pnl) / maxAbsPnl);
                                  const isPositive = day.pnl > 0;
                                  const isNegative = day.pnl < 0;

                                  return (
                                    <div
                                      key={`pnl-${day.day}`}
                                      className={cn(
                                        'relative overflow-hidden rounded-2xl border px-1 py-3.5 flex items-center justify-center',
                                        isPositive && 'border-pnl-positive/25 bg-pnl-positive/[0.08]',
                                        isNegative && 'border-pnl-negative/25 bg-pnl-negative/[0.08]',
                                        !isPositive && !isNegative && 'border-border/25 bg-muted/10'
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          'absolute inset-x-0 bottom-0',
                                          isPositive ? 'bg-pnl-positive/15' : isNegative ? 'bg-pnl-negative/15' : 'bg-muted/15'
                                        )}
                                        style={{ height: `${Math.round(intensity * 100)}%` }}
                                      />
                                      <p className={cn(
                                        'relative z-10 text-[11px] font-bold font-display tabular-nums leading-none whitespace-nowrap text-center',
                                        isPositive ? 'text-pnl-positive' : isNegative ? 'text-pnl-negative' : 'text-muted-foreground/45'
                                      )}>
                                        {day.pnl === 0 ? '—' : formatPnlWithK(day.pnl)}
                                      </p>
                                    </div>
                                  );
                                })}

                                <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/75">Win</span>
                                {dayOfWeekStats.map((day) => (
                                  <div
                                    key={`win-${day.day}`}
                                    className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.08] px-1.5 py-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={cn(
                                        'text-[12px] font-bold font-display tabular-nums leading-none',
                                        day.trades > 0 ? 'text-sky-300' : 'text-muted-foreground/45'
                                      )}>
                                        {day.trades > 0 ? `${Math.round(day.winRate)}%` : '—'}
                                      </span>
                                    </div>
                                    <div className="mt-2 h-1.5 rounded-full bg-sky-400/10 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-sky-300/70"
                                        style={{ width: `${day.trades > 0 ? Math.max(8, Math.round(day.winRate)) : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}

                                <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/75">Qty</span>
                                {dayOfWeekStats.map((day) => (
                                  <div
                                    key={`trades-${day.day}`}
                                    className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] px-1.5 py-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={cn(
                                        'text-[12px] font-bold font-display tabular-nums leading-none',
                                        day.trades > 0 ? 'text-violet-300' : 'text-muted-foreground/45'
                                      )}>
                                        {day.trades > 0 ? day.trades : '—'}
                                      </span>
                                    </div>
                                    <div className="mt-2 h-1.5 rounded-full bg-violet-400/10 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-violet-300/70"
                                        style={{ width: `${day.trades > 0 ? Math.max(8, Math.round((day.trades / maxTrades) * 100)) : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Recent Trades */}
                  <div className={cn(
                    "group rounded-2xl border relative overflow-hidden transition-all duration-300 min-h-[320px] xl:h-[460px] shadow-sm flex flex-col",
                    preferences.liquidGlassEnabled
                      ? "border-white/10 bg-black/40 backdrop-blur-2xl"
                      : "border-border/60 bg-card"
                  )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 bg-[#9b8cff] rounded-full flex-shrink-0" />
                        <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Recent Trades</h3>
                        <UiTooltip>
                          <UiTooltipTrigger asChild>
                            <button type="button" className="inline-flex">
                              <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 group-hover:text-[#9b8cff] transition-colors" />
                            </button>
                          </UiTooltipTrigger>
                          <UiTooltipContent>
                            <p className="font-display font-medium">Your 5 most recent trades</p>
                          </UiTooltipContent>
                        </UiTooltip>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View all
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Trade rows */}
                    <div className="flex-1 min-h-0 flex flex-col gap-2 p-3 overflow-y-auto">
                      {monthlyTrades.length > 0 ? (
                        [...monthlyTrades]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 5)
                          .map(trade => (
                          <div
                            key={trade.id}
                            onClick={() => { setSelectedTrade(trade); setTradeViewOpen(true); }}
                            className="relative cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-background/30 px-3 py-3 transition-all duration-200 hover:border-border/70 hover:bg-muted/20 hover:shadow-sm group/trade"
                          >
                            {/* Always-visible left accent */}
                            <div className={cn(
                              "absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full transition-opacity duration-200",
                              trade.pnlAmount >= 0 ? "bg-pnl-positive opacity-60 group-hover/trade:opacity-100" : "bg-pnl-negative opacity-60 group-hover/trade:opacity-100"
                            )} />

                            <div className="flex items-start gap-3 pl-1">
                              {/* Symbol icon */}
                              <div className="flex-shrink-0 pt-0.5">
                                <SymbolIcon symbol={trade.symbol} size="sm" />
                              </div>

                              {/* Content */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="truncate text-base font-bold font-display text-foreground leading-none">{trade.symbol}</span>
                                      {!trade.noTradeTaken && (
                                        <span className={cn(
                                          "inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-2 text-[10px] font-bold uppercase tracking-wide",
                                          trade.direction === 'long'
                                            ? "bg-pnl-positive/10 text-pnl-positive"
                                            : "bg-pnl-negative/10 text-pnl-negative"
                                        )}>
                                          {trade.direction === 'long' ? 'L' : 'S'}
                                        </span>
                                      )}
                                      {trade.isPaperTrade && (
                                        <span className="inline-flex items-center rounded-lg bg-muted/60 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                          Paper
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-2 flex items-center gap-2 text-[12px] font-display font-semibold text-muted-foreground/85">
                                      <span className="tabular-nums tracking-[0.04em]">{format(new Date(trade.date), 'dd MMM yyyy')}</span>
                                    </div>
                                  </div>

                                  {!trade.isPaperTrade && !trade.noTradeTaken ? (
                                    <div className="flex-shrink-0 text-right">
                                      <span className={cn(
                                        "text-[15px] font-bold font-display tabular-nums block leading-none",
                                        trade.pnlAmount >= 0 ? "text-pnl-positive" : "text-pnl-negative"
                                      )}>
                                        {formatCurrency(trade.pnlAmount)}
                                      </span>
                                      <span className={cn(
                                        "mt-2 inline-flex rounded-lg px-2 py-1 text-[10px] font-semibold tabular-nums",
                                        trade.pnlAmount >= 0 ? "bg-pnl-positive/10 text-pnl-positive/80" : "bg-pnl-negative/10 text-pnl-negative/80"
                                      )}>
                                        {trade.pnlPercentage >= 0 ? '+' : ''}{trade.pnlPercentage.toFixed(2)}%
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground font-medium">—</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/20 py-16 text-muted-foreground">
                          <p className="text-[11px] font-semibold uppercase tracking-wider">No recent trades</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
          </section>

          {/* Main Calendar Section - Full width on desktop */}
          <div className="w-full space-y-3">
            {/* Goal Progress Card - Clean Professional Metric */}
            <div className={cn(
              "rounded-2xl border relative overflow-hidden transition-all duration-300 shadow-sm",
              preferences.liquidGlassEnabled
                ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                : "border-border/60 bg-card"
            )}>
              <div className="relative px-3.5 sm:px-5 py-3.5 sm:py-4">
                {/* Header row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
                    <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Goal Progress</h3>
                    <UiTooltip>
                      <UiTooltipTrigger asChild>
                        <button type="button" className="inline-flex">
                          <Info className="h-3.5 w-3.5 text-[#9b8cff]/70 hover:text-[#9b8cff] transition-colors" />
                        </button>
                      </UiTooltipTrigger>
                      <UiTooltipContent>
                        <p className="font-display font-medium">Track your progress toward your {goalPeriod === 'D' ? 'daily' : goalPeriod === 'W' ? 'weekly' : goalPeriod === 'M' ? 'monthly' : 'yearly'} P&L goal.</p>
                      </UiTooltipContent>
                    </UiTooltip>
                  </div>
                  <div className="inline-flex w-full sm:w-fit justify-between sm:justify-start gap-0.5 p-1 rounded-lg border border-border/50 bg-background/50">
                    {(['D', 'W', 'M', 'Y'] as GoalPeriod[]).map((period) => (
                      <button
                        key={period}
                        onClick={() => setGoalPeriod(period)}
                        className={cn(
                          'flex-1 sm:flex-none px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-200 uppercase tracking-wider',
                          goalPeriod === period ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metric body */}
                <div className="flex flex-col gap-3 sm:gap-6 sm:flex-row sm:items-center">
                  {/* Current P&L + period label */}
                  <div className="flex-shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1">
                      {goalPeriod === 'D' ? 'Today' : goalPeriod === 'W' ? 'This Week' : goalPeriod === 'M' ? format(currentMonth, 'MMM yyyy') : format(currentMonth, 'yyyy')}
                    </p>
                    <p className={cn(
                      'text-[2rem] sm:text-4xl font-bold font-display tabular-nums leading-none tracking-tight',
                      currentPnl >= 0 ? 'text-[#9b8cff]' : 'text-pnl-negative'
                    )}>
                      {formatPnlWithK(currentPnl)}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block h-10 w-px bg-border/50 flex-shrink-0" />

                  {/* Stats: goal, remaining, progress % */}
                  <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-6 flex-shrink-0 w-full sm:w-auto">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1">Goal</p>
                      <p className="text-sm sm:text-base font-bold font-display tabular-nums text-foreground leading-none">{formatPnlWithK(currentGoal, false)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1">Remaining</p>
                      <p className={cn(
                        'text-sm sm:text-base font-bold font-display tabular-nums leading-none',
                        currentGoal > 0 && currentPnl >= currentGoal ? 'text-pnl-positive' : 'text-foreground'
                      )}>
                        {currentGoal > 0
                          ? currentPnl >= currentGoal
                            ? 'Achieved'
                            : formatPnlWithK(currentGoal - currentPnl, false)
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-1">Progress</p>
                      <p className={cn(
                        'text-sm sm:text-base font-bold font-display tabular-nums leading-none',
                        goalProgress >= 100 ? 'text-pnl-positive' : currentPnl >= 0 ? 'text-[#9b8cff]' : 'text-pnl-negative'
                      )}>
                        {currentGoal > 0 ? `${Math.min(Math.round(goalProgress), 100)}%` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar — takes remaining space */}
                  <div className="w-full sm:flex-1 sm:min-w-0">
                    <div className="relative h-2.5 rounded-full bg-muted/30 overflow-hidden border border-border/20">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700 ease-out',
                          goalProgress >= 100 ? 'bg-pnl-positive' : currentPnl >= 0 ? 'bg-[#9b8cff]' : 'bg-pnl-negative'
                        )}
                        style={{ width: `${visibleGoalProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                      <span>0%</span>
                      <span>100%</span>
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
                <span className="text-base font-semibold text-foreground text-center whitespace-nowrap min-w-[84px] sm:min-w-[140px] font-display">
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

              {/* Mobile inline stats removed from nav row to avoid truncation */}
              
              {/* Center - Stats */}
              {viewMode === 'month' && (
                <div className="hidden sm:flex items-center gap-4 absolute left-1/2 -translate-x-1/2 text-center justify-center">
                  <span className="text-sm text-white whitespace-nowrap font-display font-semibold tabular-nums">Trades: <span className="text-sm text-[#9b8cff] font-display font-semibold tabular-nums">{filteredTrades.filter(t => {
                    const tradeDate = new Date(t.date);
                    return !t.isPaperTrade && !t.noTradeTaken && tradeDate.getMonth() === currentMonth.getMonth() && tradeDate.getFullYear() === currentMonth.getFullYear();
                  }).length}</span></span>
                  <span className="text-sm text-white whitespace-nowrap font-display font-semibold tabular-nums">Monthly P&L: <span className="text-sm text-[#9b8cff] font-display font-semibold tabular-nums">{formatPnlWithK(displayedMonthlyPnl)}</span></span>
                </div>
              )}
              
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {/* Mobile View Mode Toggle */}
                <div className="sm:hidden flex items-center rounded-xl border border-border/60 bg-background/70 p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('month')}
                    className={cn(
                      'min-w-[58px] px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-[background-color,color,box-shadow,transform] duration-300 ease-out',
                      viewMode === 'month'
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-label="Switch to month view"
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode('year')}
                    className={cn(
                      'min-w-[58px] px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-[background-color,color,box-shadow,transform] duration-300 ease-out',
                      viewMode === 'year'
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-label="Switch to year view"
                  >
                    Year
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

            {/* Mobile month stats row */}
            {viewMode === 'month' && (
              <div className="sm:hidden mt-1 mb-2 px-1">
                <div className="w-full text-center text-sm text-white font-display font-semibold tabular-nums whitespace-nowrap">
                  <span>
                    Trades: <span className="text-[#9b8cff]">{filteredTrades.filter(t => {
                      const tradeDate = new Date(t.date);
                      return !t.isPaperTrade && !t.noTradeTaken && tradeDate.getMonth() === currentMonth.getMonth() && tradeDate.getFullYear() === currentMonth.getFullYear();
                    }).length}</span>
                  </span>
                  <span className="mx-3" />
                  <span>
                    P&amp;L: <span className="text-[#9b8cff]">{formatPnlWithK(displayedMonthlyPnl)}</span>
                  </span>
                </div>
              </div>
            )}

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
                    <div key={i} className="h-7 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-[0.18em]">
                      {day}
                    </div>
                  ))}
                  <div className="h-7 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-[0.2em]">
                    WEEK
                  </div>
                </div>
                {/* Mobile headers - Mon to Fri only */}
                <div className="grid md:hidden grid-cols-6 gap-1 text-center mb-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                    <div key={i} className="h-6 flex items-center justify-center text-[9px] font-bold text-white uppercase tracking-[0.16em]">
                      {day}
                    </div>
                  ))}
                  <div className="h-6 flex items-center justify-center text-[9px] font-bold text-white uppercase tracking-[0.18em]">
                    WEEK
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
                        <div key={weekIndex} className="space-y-1.5 md:space-y-0">
                        {/* Desktop/Tablet - Full week */}
                        <div className={cn(
                          "hidden md:grid grid-cols-8 gap-2 rounded-3xl border p-2.5 transition-all duration-300",
                          !weekData?.tradeCount && (preferences.liquidGlassEnabled
                            ? "border-white/10 bg-card/30 backdrop-blur-xl"
                            : "border-border/40 bg-muted/10")
                        )} style={{
                          backgroundColor: (weekData?.tradeCount && weekData?.pnl) ? `hsl(var(${weekData.pnl >= 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.04)` : undefined,
                          borderColor: (weekData?.tradeCount && weekData?.pnl) ? `hsl(var(${weekData.pnl >= 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.18)` : undefined
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
                                  'group relative flex h-24 flex-col items-center justify-center rounded-2xl border p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                                  isCurrentMonth ? 'opacity-100' : 'opacity-35',
                                  isTodayDate && 'shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]',
                                  tradeCount === 0 && (preferences.liquidGlassEnabled
                                    ? 'border-white/10 bg-card/35 backdrop-blur-xl hover:bg-card/55'
                                    : 'border-border/25 bg-background/70 hover:bg-muted/20')
                                )}
                                style={tradeCount > 0 ? {
                                  backgroundColor: `hsl(var(${dayPnl > 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.11)`,
                                  borderColor: `hsl(var(${dayPnl > 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.35)`,
                                } : undefined}
                              >
                                {/* Date number - top left */}
                                <div className={cn(
                                  'absolute left-2 top-1.5 text-sm font-display font-bold tabular-nums text-white',
                                  isTodayDate && 'rounded-md border border-primary/70 bg-primary/30 px-1.5 py-0.5 leading-none shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]'
                                )}>
                                  {format(day, 'd')}
                                </div>

                                {/* Trade info - centered */}
                                {tradeCount > 0 && (
                                  <div className="mt-3.5 flex flex-col items-center gap-1.5">
                                    <div className="w-full truncate px-0.5 text-center text-[1rem] leading-[1.1] font-bold font-display tabular-nums tracking-tight"
                                      style={{ color: `hsl(var(${dayPnl >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}>
                                      {formatPnlWithK(dayPnl)}
                                    </div>
                                    <div
                                      className="text-[9px] leading-none font-display font-medium tabular-nums tracking-[0.03em]"
                                      style={{ color: `hsl(var(${Number(pnlPercent) >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}
                                    >
                                      {Number(pnlPercent) >= 0 ? '+' : ''}{pnlPercent}%
                                    </div>
                                    <div className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-background/35 px-2 py-0.5 text-[10px] font-display font-semibold text-muted-foreground tabular-nums backdrop-blur-sm">
                                      <ArrowLeftRight className="h-2.5 w-2.5" />
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
                            "h-24 rounded-2xl border p-2.5 font-bold transition-all flex flex-col items-center justify-center",
                            preferences.liquidGlassEnabled
                              ? "border-white/15 bg-card/60 backdrop-blur-2xl"
                              : "border-border/35 bg-card/80"
                          )}>
                            <div className="mb-1.5 whitespace-nowrap text-[9px] font-display font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                              Week {weekIndex + 1}
                            </div>
                            <div className="mb-1 w-full truncate text-center text-[15px] leading-[1.12] font-display font-bold tabular-nums tracking-tight"
                              style={{ color: `hsl(var(${(weekData?.pnl || 0) >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}>
                              {formatPnlWithK(weekData?.pnl || 0)}
                            </div>
                            <div
                              className="mb-1.5 text-[9px] leading-none font-display font-medium tabular-nums tracking-[0.03em]"
                              style={{ color: `hsl(var(${Number(weekPnlPercent) >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}
                            >
                              {Number(weekPnlPercent) >= 0 ? '+' : ''}{weekPnlPercent}%
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-background/35 px-2 py-0.5 text-[10px] font-display font-semibold text-muted-foreground tabular-nums">
                              <ArrowLeftRight className="h-2.5 w-2.5" />
                              {weekData?.tradeCount || 0} {(weekData?.tradeCount || 0) === 1 ? 'trade' : 'trades'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Mobile - Weekdays only (Mon-Fri) */}
                        <div className={cn(
                          "grid md:hidden grid-cols-6 gap-1 rounded-2xl border p-2",
                          !weekData?.tradeCount && (preferences.liquidGlassEnabled
                            ? "border-white/10 bg-card/30 backdrop-blur-xl"
                            : "border-border/35 bg-muted/10")
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
                            
                            return (
                              <button
                                key={dateStr}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                  'relative flex h-16 flex-col items-center justify-center rounded-xl border p-1.5 transition-all duration-200 hover:-translate-y-0.5',
                                  isCurrentMonth ? 'opacity-100' : 'opacity-40',
                                  isTodayDate && 'shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]',
                                  tradeCount === 0 && (preferences.liquidGlassEnabled
                                    ? 'border-white/10 bg-card/80 backdrop-blur-2xl hover:bg-card/90'
                                    : 'border-border/30 bg-background/70 hover:bg-muted/10')
                                )}
                                style={tradeCount > 0 ? {
                                  backgroundColor: `hsl(var(${dayPnl > 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.12)`,
                                  borderColor: `hsl(var(${dayPnl > 0 ? '--pnl-positive' : '--pnl-negative'}) / 0.35)`,
                                  boxShadow: isTodayDate ? 'none' : undefined
                                } : undefined}
                              >
                                <div className={cn(
                                  'absolute top-0.5 left-1 text-[10px] font-display font-bold tabular-nums text-white',
                                  isTodayDate && 'rounded-md border border-primary/70 bg-primary/30 px-0.5 py-0.5 leading-none shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]'
                                )}>
                                  {format(day, 'd')}
                                </div>
                                {tradeCount > 0 && (
                                  <div className="flex flex-col items-center gap-0.5 mt-1.5">
                                    <div className="w-full truncate px-0.5 text-center text-[9px] font-bold font-display tabular-nums"
                                      style={{ color: `hsl(var(${dayPnl >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}>
                                      {formatPnlWithK(dayPnl)}
                                    </div>
                                    <div className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-background/35 px-1 py-0.5 text-[7px] font-display font-semibold text-muted-foreground tabular-nums">
                                      <ArrowLeftRight className="h-2 w-2" />
                                      {tradeCount} {tradeCount === 1 ? 'trade' : 'trades'}
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
                            "h-16 flex flex-col items-center justify-center rounded-xl border p-1.5 font-bold",
                            preferences.liquidGlassEnabled
                              ? "border-white/10 bg-card/80 backdrop-blur-2xl"
                              : "border-border/35 bg-card"
                          )}>
                            <div className="mb-0.5 whitespace-nowrap text-[8px] font-display font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
                              Week {weekIndex + 1}
                            </div>
                            <div className="text-[9px] font-display tabular-nums mb-0 w-full text-center truncate leading-tight"
                              style={{ color: `hsl(var(${(weekData?.pnl || 0) >= 0 ? '--pnl-positive' : '--pnl-negative'}))` }}>
                              {formatPnlWithK(weekData?.pnl || 0)}
                            </div>
                            <div className="inline-flex items-center gap-1 whitespace-nowrap text-[7px] text-muted-foreground font-display font-semibold tabular-nums">
                              <ArrowLeftRight className="h-2 w-2" />
                              {weekData?.tradeCount || 0} {(weekData?.tradeCount || 0) === 1 ? 'trade' : 'trades'}
                            </div>
                          </div>
                        </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-4 pb-6">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-pnl-positive/40 bg-pnl-positive/8 hover:bg-pnl-positive/12 transition-colors">
                    <div className="h-1.5 w-1.5 rounded-full bg-pnl-positive flex-shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide font-display text-foreground">Profitable</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-muted-foreground/30 bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 flex-shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide font-display text-muted-foreground">Loss</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-primary/35 bg-primary/[0.08] hover:bg-primary/[0.12] transition-colors">
                    <span className="inline-flex items-center justify-center rounded-md border border-primary/70 bg-primary/30 px-1.5 py-0.5 text-[10px] leading-none font-display font-bold tabular-nums text-white shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]">
                      30
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide font-display text-primary/90">Today</span>
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
                  <div>
                    {(() => {
                      const stats = yearlyDayOfWeekStats;
                      const yearBestDay = stats.reduce((best, day) => day.pnl > best.pnl ? day : best, stats[0]);
                      const yearWorstDay = stats.reduce((worst, day) => day.pnl < worst.pnl ? day : worst, stats[0]);
                      const maxAbsPnl = Math.max(...stats.map((d) => Math.abs(d.pnl)), 1);

                      return (
                        <div className="w-full rounded-2xl border border-border/25 bg-gradient-to-b from-background/70 to-background/30 p-3.5 sm:p-4">
                          <div>
                            <div className="grid grid-cols-[42px_repeat(5,minmax(0,1fr))] gap-1.5 sm:gap-2 mb-3 items-stretch">
                                <div />
                                {stats.map((day) => {
                                  const isBestDay = day.day === yearBestDay.day && yearBestDay.pnl > 0;
                                  const isWorstDay = day.day === yearWorstDay.day && yearWorstDay.pnl < 0;

                                  return (
                                    <div
                                      key={`year-header-${day.day}`}
                                      className={cn(
                                        'relative rounded-xl border px-1.5 py-1.5 min-h-[76px] flex flex-col items-center justify-center gap-1 text-center transition-all duration-200',
                                        isBestDay && 'border-pnl-positive/35 bg-pnl-positive/10 shadow-[0_0_0_1px_hsl(var(--pnl-positive)/0.15)]',
                                        isWorstDay && 'border-pnl-negative/35 bg-pnl-negative/10 shadow-[0_0_0_1px_hsl(var(--pnl-negative)/0.15)]',
                                        !isBestDay && !isWorstDay && 'border-border/35 bg-muted/15'
                                      )}
                                    >
                                      <span className="block text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/70">{day.shortDay}</span>
                                      {isBestDay && <span className="inline-flex items-center justify-center rounded-md bg-pnl-positive/20 px-1.5 py-0.5 text-[7px] leading-none font-bold uppercase tracking-[0.08em] text-pnl-positive whitespace-nowrap">Best</span>}
                                      {isWorstDay && <span className="inline-flex items-center justify-center rounded-md bg-pnl-negative/20 px-1.5 py-0.5 text-[7px] leading-none font-bold uppercase tracking-[0.08em] text-pnl-negative whitespace-nowrap">Worst</span>}
                                    </div>
                                  );
                                })}
                            </div>

                            <div className="space-y-2">
                                <div className="grid grid-cols-[42px_repeat(5,minmax(0,1fr))] gap-1.5 sm:gap-2 items-center">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">P&amp;L</span>
                              {stats.map((day) => {
                                const intensity = Math.max(0.08, Math.abs(day.pnl) / maxAbsPnl);
                                const isPositive = day.pnl > 0;
                                const isNegative = day.pnl < 0;

                                return (
                                  <div
                                    key={`year-pnl-${day.day}`}
                                    className={cn(
                                      'relative h-16 overflow-hidden rounded-xl border flex items-center justify-center',
                                      isPositive && 'border-pnl-positive/35 bg-pnl-positive/10',
                                      isNegative && 'border-pnl-negative/35 bg-pnl-negative/10',
                                      !isPositive && !isNegative && 'border-border/25 bg-muted/10'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'absolute inset-x-0 bottom-0 rounded-b-xl',
                                        isPositive ? 'bg-pnl-positive/20' : isNegative ? 'bg-pnl-negative/20' : 'bg-muted/15'
                                      )}
                                      style={{ height: `${Math.round(intensity * 100)}%` }}
                                    />
                                    <span className={cn(
                                      'relative z-10 text-[11px] font-display font-bold tabular-nums leading-none',
                                      isPositive ? 'text-pnl-positive' : isNegative ? 'text-pnl-negative' : 'text-muted-foreground/40'
                                    )}>
                                      {day.pnl === 0 ? '—' : formatPnlWithK(day.pnl)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                                <div className="grid grid-cols-[42px_repeat(5,minmax(0,1fr))] gap-1.5 sm:gap-2 items-center">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Win</span>
                              {stats.map((day) => (
                                <div
                                  key={`year-win-${day.day}`}
                                  className="h-12 rounded-xl border border-sky-400/25 bg-sky-400/10 flex items-center justify-center"
                                >
                                  <span className={cn(
                                    'text-[12px] font-display font-bold tabular-nums leading-none',
                                    day.trades > 0 ? 'text-sky-300' : 'text-muted-foreground/40'
                                  )}>
                                    {day.trades > 0 ? `${Math.round(day.winRate)}%` : '—'}
                                  </span>
                                </div>
                              ))}
                            </div>

                                <div className="grid grid-cols-[42px_repeat(5,minmax(0,1fr))] gap-1.5 sm:gap-2 items-center">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Qty</span>
                              {stats.map((day) => (
                                <div
                                  key={`year-qty-${day.day}`}
                                  className="h-12 rounded-xl border border-violet-400/25 bg-violet-400/10 flex items-center justify-center"
                                >
                                  <span className={cn(
                                    'text-[12px] font-display font-bold tabular-nums leading-none',
                                    day.trades > 0 ? 'text-violet-300' : 'text-muted-foreground/40'
                                  )}>
                                    {day.trades > 0 ? day.trades : '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                            </div>
                          </div>
                        </div>
                      );
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
        <DialogContent className="sm:max-w-[470px] max-h-[82vh] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl" style={{ zIndex: 9999 }}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-display font-bold tracking-tight text-foreground">
              {selectedDate && format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <p className="mt-1 text-sm font-display font-medium text-muted-foreground">
              {selectedDayTrades.length} {selectedDayTrades.length === 1 ? 'trade' : 'trades'} on this day
            </p>
          </DialogHeader>
          
          <div className="mt-4 space-y-3">
            {selectedDayTrades.length > 0 ? (
              <>
                {selectedDayTrades.map(trade => (
                  <div 
                    key={trade.id} 
                    className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/80 px-3 py-3 cursor-pointer transition-all duration-200 hover:border-border hover:bg-muted/20 hover:shadow-md animate-in fade-in-0 slide-in-from-bottom-6 duration-500 ease-out"
                    onClick={() => {
                      setSelectedTrade(trade);
                      setDayDialogOpen(false);
                      setTradeViewOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        <div className="pt-0.5">
                          <SymbolIcon symbol={trade.symbol} size="md" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-display font-bold text-[1.45rem] sm:text-[1.55rem] leading-none tracking-tight text-foreground">{trade.symbol}</span>
                            <span className={cn(
                              'inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-display font-bold tracking-[0.08em] uppercase',
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
                          <p className="text-sm font-display font-medium text-muted-foreground">
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
                              'text-[1.45rem] sm:text-[1.55rem] leading-none font-display font-bold',
                              trade.pnlAmount >= 0 ? 'text-pnl-positive' : 'text-pnl-negative'
                            )}>
                              {trade.pnlAmount >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(trade.pnlAmount).toLocaleString()}
                            </p>
                            <p className={cn(
                              'mt-1 text-sm sm:text-base leading-none font-display font-semibold',
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
              className="w-full h-11 rounded-xl border-border/50 bg-background/40 font-display text-sm font-semibold tracking-tight hover:bg-muted/30" 
              onClick={() => {
                setDayDialogOpen(false);
                navigate(`/add?date=${selectedDate}`);
              }}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Trade for This Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trade View Dialog */}
      <Dialog open={tradeViewOpen} onOpenChange={setTradeViewOpen}>
        <DialogContent fullScreenOnMobile hideCloseButton className="max-w-6xl xl:max-w-[76rem] sm:max-h-[90vh] p-0 gap-0 sm:overflow-hidden">
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
