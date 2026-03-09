import { useState, useMemo, useEffect } from 'react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTrades } from '@/hooks/useTrades';
import { useSettings } from '@/hooks/useSettings';
import { useAccount } from '@/hooks/useAccount';
import { usePreferences } from '@/hooks/usePreferences';
import { getCurrencySymbol } from '@/types/trade';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  ArrowUpDown,
  Eye,
  SlidersHorizontal,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  CalendarIcon,
  Clock,
  Check,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { TradeViewDialogContent } from '@/components/trade/TradeViewDialog';
import { Trade, Currency } from '@/types/trade';
import { cn } from '@/lib/utils';
import { ImageZoomDialog } from '@/components/ui/ImageZoomDialog';
import { SymbolIcon } from '@/components/ui/SymbolIcon';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function History() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { trades, isLoading, deleteTrade, duplicateTrade } = useTrades();
  const { settings } = useSettings();
  const { activeAccount } = useAccount();
  const { preferences } = usePreferences();
  const isGlassEnabled = preferences.liquidGlassEnabled ?? false;
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(isMobile ? 10 : 25);
  
  // Update itemsPerPage when screen size changes
  useEffect(() => {
    setItemsPerPage(isMobile ? 10 : 25);
    setCurrentPage(1);
  }, [isMobile]);
  
  const [sortField, setSortField] = useState<'date' | 'symbol' | 'pnl'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'long' | 'short'>('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [deleteTradeId, setDeleteTradeId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    const tradeId = searchParams.get('tradeId');
    if (!tradeId || isLoading) return;
    const trade = trades.find(t => t.id === tradeId);
    if (trade) {
      setSelectedTrade(trade);
      setViewDialogOpen(true);
    }
  }, [searchParams, trades, isLoading]);

  const currency = (activeAccount?.currency || settings.currency) as Currency;
  const currencySymbol = getCurrencySymbol(currency);

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let result = [...trades];

    // Date range filter
    if (dateRange.from) {
      result = result.filter(trade => {
        const tradeDate = new Date(trade.date);
        tradeDate.setHours(0, 0, 0, 0);
        const fromDate = new Date(dateRange.from!);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = dateRange.to ? new Date(dateRange.to) : fromDate;
        toDate.setHours(23, 59, 59, 999);
        return tradeDate >= fromDate && tradeDate <= toDate;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(trade => 
        trade.symbol.toLowerCase().includes(query) ||
        trade.direction.toLowerCase().includes(query) ||
        trade.strategy?.toLowerCase().includes(query)
      );
    }

    // Direction filter
    if (directionFilter !== 'all') {
      result = result.filter(trade => 
        directionFilter === 'long' ? trade.direction === 'long' : trade.direction === 'short'
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'symbol') {
        comparison = a.symbol.localeCompare(b.symbol);
      } else if (sortField === 'pnl') {
        comparison = a.pnlAmount - b.pnlAmount;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [trades, searchQuery, sortField, sortDirection, dateRange, directionFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrades = filteredTrades.slice(startIndex, startIndex + itemsPerPage);

  // Calculate buy and sell counts
  const buyCounts = filteredTrades.filter(t => t.direction === 'long').length;
  const sellCounts = filteredTrades.filter(t => t.direction === 'short').length;

  const dateRangeLabel = useMemo(() => {
    if (!dateRange.from) return 'Date';

    if (!dateRange.to) {
      return format(dateRange.from, 'MMM d, yyyy');
    }

    if (format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) {
      return format(dateRange.from, 'MMM d, yyyy');
    }

    if (format(dateRange.from, 'yyyy') === format(dateRange.to, 'yyyy')) {
      return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }

    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
  }, [dateRange]);

  const handleSort = (field: 'date' | 'symbol' | 'pnl') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleViewTrade = (trade: Trade) => {
    setSelectedTrade(trade);
    setViewDialogOpen(true);
  };

  const formatPnl = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return amount >= 0 ? `+${currencySymbol}${formatted}` : `-${currencySymbol}${formatted}`;
  };

  // Calculate exit time from entry time + holding time
  const calculateExitTime = (entryTime: string, holdingTime: string): string => {
    if (!entryTime || !holdingTime) return '—';
    
    // Parse entry time (e.g., "09:30", "14:15")
    const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
    if (isNaN(entryHours) || isNaN(entryMinutes)) return '—';
    
    // Parse holding time (e.g., "1h 30m", "45m", "2h")
    let holdingMinutes = 0;
    const hoursMatch = holdingTime.match(/(\d+)\s*h/i);
    const minutesMatch = holdingTime.match(/(\d+)\s*m/i);
    
    if (hoursMatch) holdingMinutes += parseInt(hoursMatch[1]) * 60;
    if (minutesMatch) holdingMinutes += parseInt(minutesMatch[1]);
    
    if (holdingMinutes === 0) return '—';
    
    // Calculate exit time
    const totalMinutes = entryHours * 60 + entryMinutes + holdingMinutes;
    const exitHours = Math.floor(totalMinutes / 60) % 24;
    const exitMins = totalMinutes % 60;
    
    return `${exitHours.toString().padStart(2, '0')}:${exitMins.toString().padStart(2, '0')}`;
  };

  const handleImageClick = (images: string[], index: number) => {
    setZoomImages(images);
    setZoomIndex(index);
    setZoomOpen(true);
  };

  const handleDeleteTrade = async () => {
    if (deleteTradeId) {
      await deleteTrade(deleteTradeId);
      setDeleteTradeId(null);
      toast({ title: 'Trade deleted' });
    }
  };

  const handleDuplicateTrade = async (tradeId: string) => {
    await duplicateTrade(tradeId);
    toast({ title: 'Trade duplicated' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 pb-32 md:pb-6 space-y-6">
      {/* Mobile Header - Two Rows */}
      <div className="md:hidden rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3">
        {/* Top row: Title and Search */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <h3 className="text-[11px] font-bold font-display uppercase tracking-widest text-muted-foreground">Trade History</h3>
            <p className="text-xs text-muted-foreground mt-1 font-display font-medium tabular-nums">{filteredTrades.length} total trades</p>
          </div>
          
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 rounded-lg bg-muted/50 border-border/50 text-xs font-display"
            />
          </div>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-8 w-8 p-0 rounded-lg bg-muted/50 border-border/50 hover:bg-muted flex-shrink-0",
                  dateRange.from ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
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
                      const yearStart = new Date(today.getFullYear(), 0, 1);
                      setDateRange({ from: yearStart, to: today });
                      setCurrentMonth(today);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "justify-start hover:bg-muted",
                      dateRange.from && dateRange.to &&
                      format(dateRange.from, 'yyyy-MM-dd') === format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd') &&
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
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "justify-start hover:bg-muted",
                      !dateRange.from && !dateRange.to && "bg-muted font-medium"
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
                      setCurrentPage(1);
                    }}
                    numberOfMonths={2}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Bottom row: Filters - scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {/* Sort Filter */}
          <Select 
            value={`${sortField}-${sortDirection}`}
            onValueChange={(value) => {
              const [field, direction] = value.split('-') as ['date' | 'pnl', 'asc' | 'desc'];
              setSortField(field);
              setSortDirection(direction);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-auto h-8 px-3 py-2 rounded-xl bg-muted/50 border-border/50 hover:bg-muted text-xs flex-shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest</SelectItem>
              <SelectItem value="date-asc">Oldest</SelectItem>
              <SelectItem value="pnl-desc">Best</SelectItem>
              <SelectItem value="pnl-asc">Worst</SelectItem>
            </SelectContent>
          </Select>

          {/* Direction Filter Buttons */}
          <div className="flex gap-1 bg-muted/30 rounded-xl p-1 flex-shrink-0">
            {[
              { value: 'all' as const, label: 'All' },
              { value: 'long' as const, label: 'Buy' },
              { value: 'short' as const, label: 'Sell' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDirectionFilter(option.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-display font-semibold tracking-wide transition-all duration-300 ease-out whitespace-nowrap',
                  directionFilter === option.value
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop/Tablet Header - Single Row */}
      <div className="hidden md:flex items-center gap-3 rounded-3xl border border-border/40 bg-card/95 backdrop-blur-xl p-3 relative overflow-hidden shadow-sm">
        {/* Title and Stats */}
        <div className="relative flex items-center gap-4 flex-shrink-0 px-1">
          <div>
            <h3 className="text-[11px] font-bold font-display uppercase tracking-widest text-muted-foreground">Trade History</h3>
            <p className="text-xs text-muted-foreground mt-1 font-display font-medium tabular-nums">{filteredTrades.length} total trades</p>
          </div>
          <div className="w-px h-10 bg-border/40" />
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xs font-display font-semibold tracking-wide text-muted-foreground">Buys</div>
              <div className="text-sm font-display font-bold tabular-nums text-foreground">{buyCounts}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-display font-semibold tracking-wide text-muted-foreground">Sells</div>
              <div className="text-sm font-display font-bold tabular-nums text-foreground">{sellCounts}</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm rounded-full border border-border/40 bg-card/95 backdrop-blur-xl shadow-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-11 pr-4 h-10 rounded-full bg-transparent border-0 text-sm font-display shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="rounded-full border border-border/40 bg-card/95 backdrop-blur-xl shadow-sm hover:shadow-md transition-all">
              <Button
                variant="ghost"
                className={cn(
                  "h-10 gap-2 rounded-full px-4 flex-shrink-0 hover:bg-muted/30",
                  dateRange.from ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="text-sm font-display font-medium tabular-nums">{dateRangeLabel}</span>
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range || { from: undefined, to: undefined } as any);
                setCurrentPage(1);
              }}
              numberOfMonths={2}
              initialFocus
              className="p-3 pointer-events-auto"
            />
            {dateRange.from && (
              <div className="p-3 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setDateRange({ from: undefined, to: undefined });
                    setCurrentPage(1);
                  }}
                >
                  Clear date filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Sort Dropdown */}
        <Select 
          value={`${sortField}-${sortDirection}`}
          onValueChange={(value) => {
            const [field, direction] = value.split('-') as ['date' | 'pnl', 'asc' | 'desc'];
            setSortField(field);
            setSortDirection(direction);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-auto h-10 gap-2 rounded-full border-border/40 bg-card/95 backdrop-blur-xl shadow-sm hover:shadow-md transition-all flex-shrink-0 px-4 font-display font-semibold tracking-wide">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest</SelectItem>
            <SelectItem value="date-asc">Oldest</SelectItem>
            <SelectItem value="pnl-desc">Best</SelectItem>
            <SelectItem value="pnl-asc">Worst</SelectItem>
          </SelectContent>
        </Select>

        {/* Direction Filter Buttons */}
        <div className="flex gap-1 rounded-full border border-border/40 bg-card/95 backdrop-blur-xl p-1 shadow-sm flex-shrink-0">
          {[
            { value: 'all' as const, label: 'All' },
            { value: 'long' as const, label: 'Buy' },
            { value: 'short' as const, label: 'Sell' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setDirectionFilter(option.value)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-display font-semibold tracking-wide transition-all duration-200 whitespace-nowrap',
                directionFilter === option.value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Table View */}
      <div className="md:hidden">
        {paginatedTrades.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card text-center py-12 text-muted-foreground">
            {searchQuery ? 'No trades match your search' : 'No trades recorded yet'}
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-display" style={{ minWidth: '800px' }}>
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/50">
                      <th className="text-left py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Status</th>
                      <th className="text-left py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Symbol</th>
                      <th className="text-left py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Side</th>
                      <th className="text-center py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Date</th>
                      <th className="text-center py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">News</th>
                      <th className="text-left py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Entry • Exit</th>
                      <th className="text-center py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Duration</th>
                      <th className="text-center py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Strategy</th>
                      <th className="text-center py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Rules</th>
                      <th className="text-center py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">Grade</th>
                      <th className="text-right py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] whitespace-nowrap">P&L</th>
                      <th className="text-center py-2.5 px-3 font-bold font-display text-muted-foreground uppercase tracking-widest text-[10px] sticky right-0 bg-muted/50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTrades.map((trade, index) => (
                      <tr
                        key={trade.id}
                        onClick={() => handleViewTrade(trade)}
                        className={cn(
                          "border-b border-border/30 cursor-pointer active:bg-muted/50 transition-colors",
                          index % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                        )}
                      >
                        {/* Status */}
                        <td className="py-3 px-3">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md whitespace-nowrap",
                            trade.status === 'open' 
                              ? "bg-pnl-positive/10 border border-pnl-positive/30"
                              : "bg-muted/50 border border-muted/50"
                          )}>
                            <div className={cn(
                              "w-1 h-1 rounded-full",
                              trade.status === 'open' 
                                ? "bg-pnl-positive animate-pulse"
                                : "bg-muted-foreground/40"
                            )} />
                            <span className={cn(
                              "text-[9px] font-semibold",
                              trade.status === 'open' 
                                ? "text-pnl-positive"
                                : "text-muted-foreground"
                            )}>
                              {trade.status === 'open' ? 'OPEN' : 'CLOSED'}
                            </span>
                          </div>
                        </td>
                        {/* Symbol */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <SymbolIcon symbol={trade.symbol} size="sm" />
                            <span className="font-display font-semibold text-foreground whitespace-nowrap tracking-wide">{trade.symbol}</span>
                          </div>
                        </td>
                        {/* Side */}
                        <td className="py-3 px-3">
                          {trade.noTradeTaken ? (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          ) : (
                            <Badge 
                              className={cn(
                                "inline-flex px-2 py-0.5 rounded text-[9px] font-semibold uppercase border-0 whitespace-nowrap",
                                trade.direction === 'long' 
                                  ? "bg-pnl-positive/10 text-pnl-positive" 
                                  : "bg-pnl-negative/10 text-pnl-negative"
                              )}
                            >
                              {trade.direction === 'long' ? 'LONG' : 'SHORT'}
                            </Badge>
                          )}
                        </td>
                        {/* Date */}
                        <td className="py-3 px-3 text-center">
                          <div className="text-foreground whitespace-nowrap text-[11px] font-display font-medium tabular-nums">
                            {format(new Date(trade.date), 'MMM dd')}
                          </div>
                        </td>
                        {/* News */}
                        <td className="py-3 px-3 text-center">
                          {trade.hasNews || (trade.newsEvents && trade.newsEvents.length > 0) || trade.newsType || trade.newsImpact || trade.newsTime ? (
                            <CheckCircle2 className="h-4 w-4 text-pnl-positive inline" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground/40 inline" />
                          )}
                        </td>
                        {/* Entry • Exit */}
                        <td className="py-3 px-3">
                          <div className="text-foreground whitespace-nowrap text-[11px] font-display font-medium tabular-nums">
                            {trade.entryTime ? (
                              <span>{trade.entryTime} • {calculateExitTime(trade.entryTime, trade.holdingTime || '')}</span>
                            ) : '—'}
                          </div>
                        </td>
                        {/* Duration */}
                        <td className="py-3 px-3 text-center">
                          <span className="text-foreground whitespace-nowrap text-[11px] font-display font-medium tabular-nums">{trade.holdingTime || '—'}</span>
                        </td>
                        {/* Strategy */}
                        <td className="py-3 px-3 text-center">
                          {trade.strategy ? (
                            <Badge variant="outline" className="text-[9px] px-2 py-0.5 whitespace-nowrap">
                              {trade.strategy}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* Rules */}
                        <td className="py-3 px-3 text-center">
                          {trade.followedRules ? (
                            <Check className="h-4 w-4 text-pnl-positive inline" />
                          ) : (
                            <XCircle className="h-4 w-4 text-pnl-negative inline" />
                          )}
                        </td>
                        {/* Grade */}
                        <td className="py-3 px-3 text-center">
                          {trade.performanceGrade ? (
                            <span className={cn(
                              "font-semibold px-2 py-0.5 rounded-md text-[9px]",
                              trade.performanceGrade >= 3 ? "bg-pnl-positive/15 text-pnl-positive" :
                              trade.performanceGrade >= 2 ? "bg-amber-500/15 text-amber-500" : "bg-pnl-negative/15 text-pnl-negative"
                            )}>
                              {trade.performanceGrade}/3
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* P&L */}
                        <td className="py-3 px-3 text-right">
                          {(trade.isPaperTrade || trade.noTradeTaken) ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={cn(
                              "font-display font-bold tabular-nums whitespace-nowrap",
                              trade.pnlAmount >= 0 ? "text-pnl-positive" : "text-pnl-negative"
                            )}>
                              {formatPnl(trade.pnlAmount)}
                            </span>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="py-3 px-3 text-center sticky right-0 bg-card">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 hover:bg-muted/50 active:bg-muted/50 rounded-md"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleViewTrade(trade);
                              }}>
                                <Eye className="h-3.5 w-3.5 mr-2" />
                                <span className="text-xs">View</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/edit/${trade.id}`);
                              }}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                <span className="text-xs">Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateTrade(trade.id);
                              }}>
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                <span className="text-xs">Duplicate</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTradeId(trade.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                <span className="text-xs">Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Pagination */}
            <div className="flex items-center justify-between px-1 py-3">
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages || 1} · {filteredTrades.length} trades
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages || totalPages <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop Table View - Professional Binance-style */}
      <div className={cn(
        "hidden md:block rounded-2xl border overflow-hidden relative shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        isGlassEnabled
          ? "border-white/10 bg-card/85 backdrop-blur-2xl"
          : "border-border/60 bg-card"
      )}>
        {/* Dot pattern - only show when glass is enabled */}
        {isGlassEnabled && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="history-table-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" className="fill-white/[0.08] dark:fill-white/[0.04]" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#history-table-dots)" />
          </svg>
        )}
        <div className="overflow-x-auto relative">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedTrades.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">{searchQuery ? 'No trades match your search' : 'No trades recorded yet'}</p>
              </div>
            ) : (
              paginatedTrades.map((trade, idx) => (
                <div
                  key={trade.id}
                  onClick={() => handleViewTrade(trade)}
                  className={cn(
                    "rounded-xl border p-4 cursor-pointer relative overflow-hidden",
                    "border-border/50 shadow-sm bg-card",
                    "transition-colors duration-200"
                  )}
                >
                  {/* Header Row: Symbol, Direction, Date */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <SymbolIcon symbol={trade.symbol} size="md" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base font-bold text-foreground">{trade.symbol}</span>
                          {!trade.noTradeTaken && (
                            <Badge 
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wide uppercase whitespace-nowrap border-0",
                                trade.direction === 'long' 
                                  ? "bg-pnl-positive/10 text-pnl-positive" 
                                  : "bg-pnl-negative/10 text-pnl-negative"
                              )}
                            >
                              {trade.direction === 'long' ? 'LONG' : 'SHORT'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(trade.date), 'MMM dd, yyyy')}</span>
                          {trade.entryTime && !trade.noTradeTaken && (
                            <>
                              <span>•</span>
                              <span>{trade.entryTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {trade.isPaperTrade ? (
                        <Badge variant="outline" className="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide bg-muted/40 text-muted-foreground/80 border border-border/40 whitespace-nowrap">
                          Paper
                        </Badge>
                      ) : trade.noTradeTaken ? (
                        <Badge variant="outline" className="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide bg-muted/40 text-muted-foreground/80 border border-border/40 whitespace-nowrap">
                          No Trade
                        </Badge>
                      ) : (
                        <span className={cn(
                          "font-display font-bold tabular-nums text-sm whitespace-nowrap",
                          trade.pnlAmount >= 0 ? "text-pnl-positive" : "text-pnl-negative"
                        )}>
                          {formatPnl(trade.pnlAmount)}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-muted/50 active:bg-muted/50 rounded-md shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewTrade(trade);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit/${trade.id}`);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTrade(trade.id);
                          }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTradeId(trade.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md",
                        trade.status === 'open' 
                          ? "bg-pnl-positive/10 border border-pnl-positive/30"
                          : "bg-muted/50 border border-muted/50"
                      )}>
                        <div className={cn(
                          "w-1 h-1 rounded-full",
                          trade.status === 'open' 
                            ? "bg-pnl-positive animate-pulse"
                            : "bg-muted-foreground/40"
                        )} />
                        <span className={cn(
                          "text-[10px] font-semibold",
                          trade.status === 'open' 
                            ? "text-pnl-positive"
                            : "text-muted-foreground"
                        )}>
                          {trade.status === 'open' ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium text-foreground">
                        {trade.holdingTime || '—'}
                      </span>
                    </div>

                    {/* News */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">News</span>
                      {trade.hasNews || (trade.newsEvents && trade.newsEvents.length > 0) || trade.newsType || trade.newsImpact || trade.newsTime ? (
                        <span className="font-semibold text-pnl-positive">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </div>

                    {/* Grade */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Grade</span>
                      {trade.performanceGrade ? (
                        <span className={cn(
                          "font-semibold px-2 py-0.5 rounded-md",
                          trade.performanceGrade >= 3 ? "bg-pnl-positive/15 text-pnl-positive" :
                          trade.performanceGrade >= 2 ? "bg-amber-500/15 text-amber-500" : "bg-pnl-negative/15 text-pnl-negative"
                        )}>
                          {trade.performanceGrade}/3
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Strategy */}
                    {!trade.noTradeTaken && trade.strategy && (
                      <div className="col-span-2 flex items-center justify-between pt-1">
                        <span className="text-muted-foreground">Strategy</span>
                        <span className="bg-muted/50 text-muted-foreground px-2 py-0.5 rounded max-w-[150px] truncate">
                          {trade.strategy}
                        </span>
                      </div>
                    )}

                    {/* Rules Status */}
                    {(trade.brokenRules && trade.brokenRules.length > 0) || (trade.followedRulesList && trade.followedRulesList.length > 0) ? (
                      <div className="col-span-2 flex items-center justify-between pt-1">
                        <span className="text-muted-foreground">Rules</span>
                        {trade.brokenRules && trade.brokenRules.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-pnl-negative/60"></div>
                            <span className="font-medium text-pnl-negative">{trade.brokenRules.length} broken</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-pnl-positive" />
                            <span className="font-medium text-pnl-positive">Followed</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <Table className="hidden md:table font-display">
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 w-[70px]">Status</TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-foreground/80 transition-colors"
                    onClick={() => handleSort('symbol')}
                  >
                    Pair
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3">Side</TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 text-center">
                  <div 
                    className="flex items-center justify-center gap-2 cursor-pointer hover:text-foreground/80 transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    Date
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 text-center">News</TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3">Entry • Exit</TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 text-center">Duration</TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 text-center">Strategy</TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 text-center">Rules</TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 text-center">Grade</TableHead>
                <TableHead 
                  className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 text-right cursor-pointer hover:text-foreground/80 transition-colors"
                  onClick={() => handleSort('pnl')}
                >
                  <div className="flex items-center justify-end gap-2">
                    P&L
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </TableHead>
                <TableHead className="h-12 font-bold font-display text-muted-foreground text-[11px] uppercase tracking-widest px-4 py-3 w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-16 text-muted-foreground">
                    <div className="space-y-2">
                      <p className="text-sm">{searchQuery ? 'No trades match your search' : 'No trades recorded yet'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTrades.map((trade, idx) => (
                  <TableRow 
                    key={trade.id}
                    className={cn(
                      "border-b border-border/30 hover:bg-muted/40 transition-colors cursor-pointer h-14",
                      idx % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                    )}
                    onClick={() => handleViewTrade(trade)}
                  >
                    {/* Status */}
                    <TableCell className="px-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-2.5 py-1 rounded-md transition-colors duration-0",
                        trade.status === 'open' 
                          ? "bg-pnl-positive/10 border border-pnl-positive/30"
                          : "bg-muted/50 border border-muted/50"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors duration-0",
                          trade.status === 'open' 
                            ? "bg-pnl-positive animate-pulse"
                            : "bg-muted-foreground/40"
                        )} />
                        <span className={cn(
                          "text-xs font-semibold transition-colors duration-0",
                          trade.status === 'open' 
                            ? "text-pnl-positive"
                            : "text-muted-foreground"
                        )}>
                          {trade.status === 'open' ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Pair - Symbol with icon */}
                    <TableCell className="font-semibold text-foreground px-4">
                      <div className="flex items-center gap-2">
                        <SymbolIcon symbol={trade.symbol} size="sm" />
                        <span className="text-sm font-display font-semibold tracking-wide">{trade.symbol}</span>
                      </div>
                    </TableCell>
                    
                    {/* Side */}
                    <TableCell className="px-4">
                      {trade.noTradeTaken ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Badge 
                          className={cn(
                            "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold tracking-wide whitespace-nowrap border-0",
                            trade.direction === 'long' 
                              ? "bg-pnl-positive/10 text-pnl-positive" 
                              : "bg-pnl-negative/10 text-pnl-negative"
                          )}
                        >
                          {trade.direction === 'long' ? 'LONG' : 'SHORT'}
                        </Badge>
                      )}
                    </TableCell>
                    
                    {/* Date */}
                    <TableCell className="px-4 text-center text-sm text-muted-foreground font-display font-medium tabular-nums">
                      {format(new Date(trade.date), 'MMM dd')}
                    </TableCell>

                    {/* News */}
                    <TableCell className="px-4 text-center">
                      {trade.hasNews || (trade.newsEvents && trade.newsEvents.length > 0) || trade.newsType || trade.newsImpact || trade.newsTime ? (
                        <span className="text-xs font-semibold text-pnl-positive">Yes</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    
                    {/* Entry • Exit Time */}
                    <TableCell className="px-4 text-sm font-display">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground text-xs tabular-nums">{trade.noTradeTaken ? '—' : (trade.entryTime || '—')}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {trade.noTradeTaken ? '—' : calculateExitTime(trade.entryTime, trade.holdingTime)}
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Duration */}
                    <TableCell className="px-4 text-center">
                      <span className="text-sm text-muted-foreground font-display font-medium tabular-nums">
                        {trade.holdingTime || '—'}
                      </span>
                    </TableCell>
                    
                    {/* Strategy */}
                    <TableCell className="px-4 text-center">
                      {!trade.noTradeTaken && trade.strategy ? (
                        <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded inline-block max-w-[120px] truncate">
                          {trade.strategy}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    
                    {/* Rules Status */}
                    <TableCell className="px-4 text-center">
                      {trade.brokenRules && trade.brokenRules.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-pnl-negative/60"></div>
                          <span className="text-xs font-medium text-pnl-negative">{trade.brokenRules.length}</span>
                        </div>
                      ) : trade.followedRulesList && trade.followedRulesList.length > 0 ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-pnl-positive/60"></div>
                          <span className="text-xs font-medium text-pnl-positive">✓</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    
                    {/* Performance Grade */}
                    <TableCell className="px-4 text-center">
                      {trade.performanceGrade ? (
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-md",
                          trade.performanceGrade >= 3 ? "bg-pnl-positive/15 text-pnl-positive" :
                          trade.performanceGrade >= 2 ? "bg-amber-500/15 text-amber-500" : "bg-pnl-negative/15 text-pnl-negative"
                        )}>
                          {trade.performanceGrade}/3
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    
                    {/* P&L */}
                    <TableCell className="px-4 text-right">
                      {trade.isPaperTrade ? (
                        <Badge variant="outline" className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-muted/40 text-muted-foreground/80 border border-border/40 whitespace-nowrap">
                          Paper
                        </Badge>
                      ) : trade.noTradeTaken ? (
                        <Badge variant="outline" className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-muted/40 text-muted-foreground/80 border border-border/40 whitespace-nowrap">
                          No Trade
                        </Badge>
                      ) : (
                        <span className={cn(
                          "font-display font-bold tabular-nums text-sm whitespace-nowrap",
                          trade.pnlAmount >= 0 ? "text-pnl-positive" : "text-pnl-negative"
                        )}>
                          {formatPnl(trade.pnlAmount)}
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-muted/50 active:bg-muted/50 rounded-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewTrade(trade);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit/${trade.id}`);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTrade(trade.id);
                          }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTradeId(trade.id);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Desktop Pagination */}
        {filteredTrades.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <Select 
                value={String(itemsPerPage)} 
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages || totalPages <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages || totalPages <= 1}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trade View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('tradeId');
            setSearchParams(nextParams, { replace: true });
          }
        }}
      >
        <DialogContent 
          className="max-w-4xl sm:max-h-[90vh] p-0 gap-0 sm:overflow-hidden"
          hideCloseButton
          fullScreenOnMobile
        >
          {selectedTrade && (
            <TradeViewDialogContent
              trade={selectedTrade}
              forecasts={{}}
              currencySymbol={currencySymbol}
              formatPnl={formatPnl}
              onClose={() => setViewDialogOpen(false)}
              onEdit={(tab) => {
                setViewDialogOpen(false);
                navigate(`/edit/${selectedTrade.id}${tab ? `?tab=${tab}` : ''}`);
              }}
              onViewForecast={() => {}}
              onImageClick={handleImageClick}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <ImageZoomDialog
        images={zoomImages}
        initialIndex={zoomIndex}
        open={zoomOpen}
        onOpenChange={setZoomOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTradeId} onOpenChange={(open) => !open && setDeleteTradeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrade} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
