import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trade, TradeDirection, TradeCategory, TradeStatus, TRADE_CATEGORIES, getCurrencySymbol, NewsImpact, NEWS_IMPACTS, NewsEvent } from '@/types/trade';
import { useTrades } from '@/hooks/useTrades';
import { useSettings } from '@/hooks/useSettings';
import { useAccount } from '@/hooks/useAccount';
import { usePreferences } from '@/hooks/usePreferences';
import { useTradingPreferences } from '@/hooks/useTradingPreferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Label } from '@/components/ui/label';
import { useToast, dismissAllToasts } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import { ImageUpload } from './ImageUpload';
import { NewsEventSelector } from './NewsEventSelector';
import { cn } from '@/lib/utils';
import { Loader2, X, Plus, Meh, Frown, Smile, Check, XIcon, ChevronDown, StickyNote } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { ALL_TIMEFRAMES, getFilteredTimeframes, getTimeframeLabel } from '@/lib/timeframes';
import { motion } from 'framer-motion';
type TabType = 'general' | 'chart-analysis' | 'pre-market-forecast' | 'post-market-forecast' | 'emotions';

// Validation schema for trade form
const tradeFormSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(20, 'Symbol must be less than 20 characters'),
  direction: z.enum(['long', 'short']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  entryTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  holdingTime: z.string().max(50, 'Exit date too long').optional().or(z.literal('')),
  lotSize: z.number().min(0, 'Lot size cannot be negative').max(10000000, 'Lot size is too large'),
  performanceGrade: z.number().int().min(1, 'Grade must be 1-3').max(3, 'Grade must be 1-3'),
  entryPrice: z.number().min(0, 'Entry price cannot be negative').max(10000000, 'Entry price is too large'),
  stopLoss: z.number().min(0, 'Stop loss cannot be negative').max(10000000, 'Stop loss is too large'),
  stopLossPips: z.number().min(0, 'SL pips cannot be negative').max(100000, 'SL pips is too large').optional(),
  takeProfit: z.number().min(0, 'Take profit cannot be negative').max(10000000, 'Take profit is too large'),
  riskRewardRatio: z.string().max(20, 'R:R ratio too long').optional().or(z.literal('')),
  pnlAmount: z.number().min(-100000000, 'P&L amount is too small').max(100000000, 'P&L amount is too large'),
  pnlPercentage: z.number().min(-10000, 'P&L percentage is too small').max(10000, 'P&L percentage is too large'),
  emotionalState: z.number().min(1, 'Emotional state must be 1-5').max(5, 'Emotional state must be 1-5'),
  preMarketPlan: z.string().max(5000, 'Pre-market plan is too long').optional().or(z.literal('')),
  postMarketReview: z.string().max(5000, 'Post-market review is too long').optional().or(z.literal('')),
  emotionalJournalBefore: z.string().max(2000, 'Journal entry is too long').optional().or(z.literal('')),
  emotionalJournalDuring: z.string().max(2000, 'Journal entry is too long').optional().or(z.literal('')),
  emotionalJournalAfter: z.string().max(2000, 'Journal entry is too long').optional().or(z.literal('')),
  strategy: z.string().max(100, 'Strategy name is too long').optional().or(z.literal('')),
  category: z.enum(['stocks', 'futures', 'forex', 'crypto', 'options']),
  images: z.array(z.string()).max(20, 'Too many images'),
  preMarketImages: z.array(z.string()).max(20, 'Too many images').optional(),
  postMarketImages: z.array(z.string()).max(20, 'Too many images').optional(),
  chartAnalysisNotes: z.string().max(10000, 'Notes too long').optional(),
  preMarketNotes: z.string().max(10000, 'Notes too long').optional(),
  postMarketNotes: z.string().max(10000, 'Notes too long').optional(),
  forecastId: z.string().uuid().nullable().optional(),
  followedRules: z.boolean().optional(),
  notes: z.string().max(5000, 'Notes too long').optional().or(z.literal('')),
  mistakeTagging: z.string().max(500, 'Mistake tagging too long').optional().or(z.literal('')),
  mistakeTags: z.array(z.string()).optional()
});
interface ChartAnalysis {
  id: string;
  timeframe: string;
  images: string[];
  notes: string;
}

type CardToastVariant = 'success' | 'error' | 'warning' | 'info';

interface CardToastState {
  title: string;
  description?: string;
  variant: CardToastVariant;
}

// Timeframes are now loaded from cloud-synced user settings via hook in component
const EMOTION_LABELS = [{
  value: 1,
  label: 'Disappointed',
  icon: Frown,
  color: 'text-red-500',
  bgColor: 'bg-red-500/20 text-red-500'
}, {
  value: 2,
  label: 'Indifferent',
  icon: Meh,
  color: 'text-yellow-500',
  bgColor: 'bg-yellow-500/20 text-yellow-500'
}, {
  value: 3,
  label: 'Proud',
  icon: Smile,
  color: 'text-emerald-500',
  bgColor: 'bg-emerald-500/20 text-emerald-500'
}];

const COMMON_MISTAKE_TAGS = [
  'Poor Entry',
  'Ignored Setup',
  'Over-traded',
  'Wrong Position Size',
  'No Stop Loss',
  'Revenge Trading',
  'FOMO Entry',
  'Early Exit',
  'Late Exit',
  'Wrong Direction'
];

interface TradeFormProps {
  editTrade?: Trade;
}
export function TradeForm({
  editTrade
}: TradeFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultDate = searchParams.get('date');
  const {
    addTrade,
    updateTrade
  } = useTrades();
  const {
    settings
  } = useSettings();
  const { activeAccount } = useAccount();
  const { preferences } = usePreferences();
  const isGlassEnabled = preferences.liquidGlassEnabled ?? false;
  const { selectedTimeframes } = useTradingPreferences();
  const timeframeOptions = getFilteredTimeframes(selectedTimeframes);
  const {
    toast
  } = useToast();
  const currencySymbol = getCurrencySymbol(settings.currency);
  const accountStartingBalance = activeAccount?.starting_balance || 0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardToast, setCardToast] = useState<CardToastState | null>(null);
  const cardToastTimeoutRef = useRef<number | null>(null);
  const cardToastRemoveTimeoutRef = useRef<number | null>(null);
  const [isCardToastClosing, setIsCardToastClosing] = useState(false);

  const dismissCardToast = useCallback(() => {
    setIsCardToastClosing(true);

    if (cardToastRemoveTimeoutRef.current) {
      window.clearTimeout(cardToastRemoveTimeoutRef.current);
    }

    cardToastRemoveTimeoutRef.current = window.setTimeout(() => {
      setCardToast(null);
      setIsCardToastClosing(false);
    }, 260);
  }, []);
  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'long' as TradeDirection,
    date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    entryTime: format(new Date(), 'HH:mm'),
    holdingTime: '',
    lotSize: '',
    performanceGrade: '2' as string,
    entryPrice: '',
    stopLoss: '',
    stopLossPips: '',
    takeProfit: '',
    riskRewardRatio: '',
    pnlAmount: '',
    pnlPercentage: '',
    preMarketPlan: '',
    postMarketReview: '',
    emotionalJournalBefore: '',
    emotionalJournalDuring: '',
    emotionalJournalAfter: '',
    overallEmotions: '',
    emotionalState: 2 as number,
    strategy: '',
    category: 'stocks' as TradeCategory,
    forecastId: null as string | null,
    followedRules: true,
    followedRulesList: [] as string[],
    brokenRules: [] as string[],
    notes: '',
    mistakeTagging: '',
    mistakeTags: [] as string[],
    mistakeTagInput: '',
    hasNews: false,
    newsEvents: [{ id: crypto.randomUUID(), type: '', impact: '' as NewsImpact | '', time: '', currency: '' }] as NewsEvent[],
    isPaperTrade: false,
    noTradeTaken: false,
    status: 'closed' as TradeStatus
  });

  // News events management
  const addNewsEvent = () => {
    setFormData(p => ({
      ...p,
      newsEvents: [...p.newsEvents, { id: crypto.randomUUID(), type: '', impact: '' as NewsImpact | '', time: '', currency: '' }]
    }));
  };

  const updateNewsEvent = (id: string, field: keyof NewsEvent, value: string) => {
    setFormData(p => ({
      ...p,
      newsEvents: p.newsEvents.map(event => 
        event.id === id ? { ...event, [field]: value } : event
      )
    }));
  };

  const removeNewsEvent = (id: string) => {
    if (formData.newsEvents.length > 1) {
      setFormData(p => ({
        ...p,
        newsEvents: p.newsEvents.filter(event => event.id !== id)
      }));
    }
  };

  // Get trading rules from cloud-synced preferences
  const { tradingRules } = useTradingPreferences();

  // Track if form has been initialized to prevent re-initialization on re-renders
  const isInitialized = useRef(false);

  // Dismiss all toasts when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      dismissAllToasts();
      if (cardToastTimeoutRef.current) {
        window.clearTimeout(cardToastTimeoutRef.current);
      }
      if (cardToastRemoveTimeoutRef.current) {
        window.clearTimeout(cardToastRemoveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleCardToast = (event: Event) => {
      const customEvent = event as CustomEvent<{ title: string; description?: string; variant?: CardToastVariant }>;
      const detail = customEvent.detail;
      if (!detail?.title) return;

      if (cardToastTimeoutRef.current) {
        window.clearTimeout(cardToastTimeoutRef.current);
      }
      if (cardToastRemoveTimeoutRef.current) {
        window.clearTimeout(cardToastRemoveTimeoutRef.current);
      }

      setIsCardToastClosing(false);

      setCardToast({
        title: detail.title,
        description: detail.description,
        variant: detail.variant || 'info',
      });

      cardToastTimeoutRef.current = window.setTimeout(() => {
        dismissCardToast();
      }, 2600);
    };

    window.addEventListener('trade-form-card-toast', handleCardToast as EventListener);

    const handleDismissCardToast = () => {
      if (cardToastTimeoutRef.current) {
        window.clearTimeout(cardToastTimeoutRef.current);
      }
      dismissCardToast();
    };

    window.addEventListener('trade-form-card-toast-dismiss', handleDismissCardToast);

    return () => {
      window.removeEventListener('trade-form-card-toast', handleCardToast as EventListener);
      window.removeEventListener('trade-form-card-toast-dismiss', handleDismissCardToast);
      if (cardToastTimeoutRef.current) {
        window.clearTimeout(cardToastTimeoutRef.current);
      }
      if (cardToastRemoveTimeoutRef.current) {
        window.clearTimeout(cardToastRemoveTimeoutRef.current);
      }
    };
  }, [dismissCardToast]);
  // Chart Before and Chart After arrays
  const [beforeCharts, setBeforeCharts] = useState<ChartAnalysis[]>([{
    id: crypto.randomUUID(),
    timeframe: '4h',
    images: [],
    notes: ''
  }]);
  const [afterCharts, setAfterCharts] = useState<ChartAnalysis[]>([{
    id: crypto.randomUUID(),
    timeframe: '4h',
    images: [],
    notes: ''
  }]);
  const [preMarketCharts, setPreMarketCharts] = useState<ChartAnalysis[]>([{
    id: crypto.randomUUID(),
    timeframe: '4h',
    images: [],
    notes: ''
  }]);
  const [postMarketCharts, setPostMarketCharts] = useState<ChartAnalysis[]>([{
    id: crypto.randomUUID(),
    timeframe: '4h',
    images: [],
    notes: ''
  }]);
  const [enteringBeforeChartIds, setEnteringBeforeChartIds] = useState<string[]>([]);
  const [enteringAfterChartIds, setEnteringAfterChartIds] = useState<string[]>([]);
  const [enteringPreMarketChartIds, setEnteringPreMarketChartIds] = useState<string[]>([]);
  const [enteringPostMarketChartIds, setEnteringPostMarketChartIds] = useState<string[]>([]);
  const [removingBeforeChartIds, setRemovingBeforeChartIds] = useState<string[]>([]);
  const [removingAfterChartIds, setRemovingAfterChartIds] = useState<string[]>([]);
  const [removingPreMarketChartIds, setRemovingPreMarketChartIds] = useState<string[]>([]);
  const [removingPostMarketChartIds, setRemovingPostMarketChartIds] = useState<string[]>([]);
  const createEmptyChart = (): ChartAnalysis => ({
    id: crypto.randomUUID(),
    timeframe: '4h',
    images: [],
    notes: ''
  });
  // Before charts management
  const addBeforeChart = () => {
    const newChart = createEmptyChart();
    setBeforeCharts(prev => [...prev, newChart]);
    setEnteringBeforeChartIds(prev => [...prev, newChart.id]);
    window.setTimeout(() => {
      setEnteringBeforeChartIds(prev => prev.filter(chartId => chartId !== newChart.id));
    }, 520);
  };
  const updateBeforeChart = (id: string, field: keyof ChartAnalysis, value: any) => {
    setBeforeCharts(beforeCharts.map(chart => chart.id === id ? {
      ...chart,
      [field]: value
    } : chart));
  };
  const removeBeforeChart = (id: string) => {
    if (beforeCharts.length > 1) {
      setRemovingBeforeChartIds(prev => prev.includes(id) ? prev : [...prev, id]);
      window.setTimeout(() => {
        setBeforeCharts(prev => prev.filter(chart => chart.id !== id));
        setRemovingBeforeChartIds(prev => prev.filter(chartId => chartId !== id));
      }, 320);
    }
  };

  // After charts management
  const addAfterChart = () => {
    const newChart = createEmptyChart();
    setAfterCharts(prev => [...prev, newChart]);
    setEnteringAfterChartIds(prev => [...prev, newChart.id]);
    window.setTimeout(() => {
      setEnteringAfterChartIds(prev => prev.filter(chartId => chartId !== newChart.id));
    }, 520);
  };
  const updateAfterChart = (id: string, field: keyof ChartAnalysis, value: any) => {
    setAfterCharts(afterCharts.map(chart => chart.id === id ? {
      ...chart,
      [field]: value
    } : chart));
  };
  const removeAfterChart = (id: string) => {
    if (afterCharts.length > 1) {
      setRemovingAfterChartIds(prev => prev.includes(id) ? prev : [...prev, id]);
      window.setTimeout(() => {
        setAfterCharts(prev => prev.filter(chart => chart.id !== id));
        setRemovingAfterChartIds(prev => prev.filter(chartId => chartId !== id));
      }, 320);
    }
  };

  // Pre-market forecast chart management
  const addPreMarketChart = () => {
    const newChart = createEmptyChart();
    setPreMarketCharts(prev => [...prev, newChart]);
    setEnteringPreMarketChartIds(prev => [...prev, newChart.id]);
    window.setTimeout(() => {
      setEnteringPreMarketChartIds(prev => prev.filter(chartId => chartId !== newChart.id));
    }, 520);
  };
  const updatePreMarketChart = (id: string, field: keyof ChartAnalysis, value: any) => {
    setPreMarketCharts(preMarketCharts.map(chart => chart.id === id ? {
      ...chart,
      [field]: value
    } : chart));
  };
  const removePreMarketChart = (id: string) => {
    if (preMarketCharts.length > 1) {
      setRemovingPreMarketChartIds(prev => prev.includes(id) ? prev : [...prev, id]);
      window.setTimeout(() => {
        setPreMarketCharts(prev => prev.filter(chart => chart.id !== id));
        setRemovingPreMarketChartIds(prev => prev.filter(chartId => chartId !== id));
      }, 320);
    }
  };

  // Post-market forecast chart management
  const addPostMarketChart = () => {
    const newChart = createEmptyChart();
    setPostMarketCharts(prev => [...prev, newChart]);
    setEnteringPostMarketChartIds(prev => [...prev, newChart.id]);
    window.setTimeout(() => {
      setEnteringPostMarketChartIds(prev => prev.filter(chartId => chartId !== newChart.id));
    }, 520);
  };
  const updatePostMarketChart = (id: string, field: keyof ChartAnalysis, value: any) => {
    setPostMarketCharts(postMarketCharts.map(chart => chart.id === id ? {
      ...chart,
      [field]: value
    } : chart));
  };
  const removePostMarketChart = (id: string) => {
    if (postMarketCharts.length > 1) {
      setRemovingPostMarketChartIds(prev => prev.includes(id) ? prev : [...prev, id]);
      window.setTimeout(() => {
        setPostMarketCharts(prev => prev.filter(chart => chart.id !== id));
        setRemovingPostMarketChartIds(prev => prev.filter(chartId => chartId !== id));
      }, 320);
    }
  };

  // Helper function to parse notes with timeframes into chart sections
  // Returns { before: ChartAnalysis[], after: ChartAnalysis[] } for chart analysis notes
  // or just ChartAnalysis[] for pre/post market notes
  const parseNotesToCharts = (notes: string | undefined, images: string[], splitBeforeAfter = false): ChartAnalysis[] => {
    if (!notes && images.length === 0) {
      return [createEmptyChart()];
    }
    const chartSections: ChartAnalysis[] = [];
    if (notes) {
      const sections = notes.split(/\n\n+/);
      sections.forEach(section => {
        const match = section.match(/^\[([^\]]+)\]\n?([\s\S]*)/);
        if (match) {
          const label = match[1];
          const noteText = match[2]?.trim() || '';
          // Extract timeframe from formats like "Before - 5 Minutes", "After - 1 Hour", or just "5 Minutes"
          let timeframeLabel = label;
          if (label.toLowerCase().startsWith('before')) {
            const tfMatch = label.match(/Before\s*-?\s*(.+)/i);
            timeframeLabel = tfMatch?.[1]?.trim() || label;
          } else if (label.toLowerCase().startsWith('after')) {
            const tfMatch = label.match(/After\s*-?\s*(.+)/i);
            timeframeLabel = tfMatch?.[1]?.trim() || label;
          }
          const timeframeValue = ALL_TIMEFRAMES.find(tf => tf.label === timeframeLabel)?.value || '4h';
          chartSections.push({
            id: crypto.randomUUID(),
            timeframe: timeframeValue,
            images: [],
            notes: noteText
          });
        } else if (section.trim()) {
          chartSections.push({
            id: crypto.randomUUID(),
            timeframe: '4h',
            images: [],
            notes: section.trim()
          });
        }
      });
    }
    images.forEach((img, idx) => {
      if (chartSections[idx]) {
        chartSections[idx].images = [img];
      } else {
        chartSections.push({
          id: crypto.randomUUID(),
          timeframe: '4h',
          images: [img],
          notes: ''
        });
      }
    });
    return chartSections.length > 0 ? chartSections : [createEmptyChart()];
  };

  // Parse chart analysis notes respecting Before/After markers
  const parseChartAnalysisNotes = (notes: string | undefined, images: string[]): { before: ChartAnalysis[], after: ChartAnalysis[] } => {
    if (!notes && images.length === 0) {
      return { before: [createEmptyChart()], after: [createEmptyChart()] };
    }
    const beforeCharts: ChartAnalysis[] = [];
    const afterCharts: ChartAnalysis[] = [];
    
    if (notes) {
      const sections = notes.split(/\n\n+/);
      sections.forEach(section => {
        const match = section.match(/^\[([^\]]+)\]\n?([\s\S]*)/);
        if (match) {
          const label = match[1];
          const noteText = match[2]?.trim() || '';
          const isBefore = label.toLowerCase().startsWith('before');
          const isAfter = label.toLowerCase().startsWith('after');
          
          // Extract timeframe from formats like "Before - 5 Minutes", "After - 1 Hour"
          let timeframeLabel = label;
          if (isBefore) {
            const tfMatch = label.match(/Before\s*-?\s*(.+)/i);
            timeframeLabel = tfMatch?.[1]?.trim() || label;
          } else if (isAfter) {
            const tfMatch = label.match(/After\s*-?\s*(.+)/i);
            timeframeLabel = tfMatch?.[1]?.trim() || label;
          }
          
          const timeframeValue = ALL_TIMEFRAMES.find(tf => tf.label === timeframeLabel)?.value || '4h';
          const chartEntry: ChartAnalysis = {
            id: crypto.randomUUID(),
            timeframe: timeframeValue,
            images: [],
            notes: noteText
          };
          
          if (isBefore) {
            beforeCharts.push(chartEntry);
          } else if (isAfter) {
            afterCharts.push(chartEntry);
          } else {
            // Legacy format - assume before
            beforeCharts.push(chartEntry);
          }
        } else if (section.trim()) {
          beforeCharts.push({
            id: crypto.randomUUID(),
            timeframe: '4h',
            images: [],
            notes: section.trim()
          });
        }
      });
    }
    
    // Distribute images between before and after based on parsed sections count
    const beforeCount = beforeCharts.length || 1;
    const beforeImages = images.slice(0, beforeCount);
    const afterImages = images.slice(beforeCount);
    
    beforeImages.forEach((img, idx) => {
      if (beforeCharts[idx]) {
        beforeCharts[idx].images = [img];
      } else {
        beforeCharts.push({
          id: crypto.randomUUID(),
          timeframe: '4h',
          images: [img],
          notes: ''
        });
      }
    });
    
    afterImages.forEach((img, idx) => {
      if (afterCharts[idx]) {
        afterCharts[idx].images = [img];
      } else {
        afterCharts.push({
          id: crypto.randomUUID(),
          timeframe: '4h',
          images: [img],
          notes: ''
        });
      }
    });
    
    return {
      before: beforeCharts.length > 0 ? beforeCharts : [createEmptyChart()],
      after: afterCharts.length > 0 ? afterCharts : [createEmptyChart()]
    };
  };
  useEffect(() => {
    if (editTrade && !isInitialized.current) {
      isInitialized.current = true;
      
      // Recalculate pnl percentage based on current account balance
      const accountBalance = activeAccount?.starting_balance || 0;
      const calculatedPnlPercentage = accountBalance > 0 
        ? (editTrade.pnlAmount / accountBalance * 100).toFixed(2)
        : editTrade.pnlPercentage.toString();
      
      setFormData({
        symbol: editTrade.symbol,
        direction: editTrade.direction,
        date: editTrade.date,
        entryTime: editTrade.entryTime,
        holdingTime: editTrade.holdingTime,
        lotSize: editTrade.lotSize.toString(),
        performanceGrade: editTrade.performanceGrade.toString(),
        entryPrice: editTrade.entryPrice.toString(),
        stopLoss: editTrade.stopLoss.toString(),
        stopLossPips: editTrade.stopLossPips?.toString() || '',
        takeProfit: editTrade.takeProfit.toString(),
        riskRewardRatio: editTrade.riskRewardRatio,
        pnlAmount: editTrade.pnlAmount.toString(),
        pnlPercentage: calculatedPnlPercentage,
        preMarketPlan: editTrade.preMarketPlan,
        postMarketReview: editTrade.postMarketReview,
        emotionalJournalBefore: editTrade.emotionalJournalBefore,
        emotionalJournalDuring: editTrade.emotionalJournalDuring,
        emotionalJournalAfter: editTrade.emotionalJournalAfter,
        overallEmotions: editTrade.overallEmotions || '',
        emotionalState: editTrade.emotionalState || 2,
        strategy: editTrade.strategy || '',
        category: editTrade.category || 'stocks',
        forecastId: editTrade.forecastId || null,
        followedRules: editTrade.followedRules ?? true,
        followedRulesList: editTrade.followedRulesList || [],
        brokenRules: editTrade.brokenRules || [],
        notes: editTrade.notes || '',
        mistakeTagging: editTrade.mistakeTagging || '',
        mistakeTags: editTrade.mistakeTags || [],
        mistakeTagInput: '',
        hasNews: editTrade.hasNews ?? false,
        newsEvents: editTrade.newsEvents && editTrade.newsEvents.length > 0 
          ? editTrade.newsEvents 
          : editTrade.newsType 
            ? [{ id: crypto.randomUUID(), type: editTrade.newsType, impact: editTrade.newsImpact || '', time: editTrade.newsTime || '' }]
            : [{ id: crypto.randomUUID(), type: '', impact: '' as NewsImpact | '', time: '' }],
        isPaperTrade: editTrade.isPaperTrade ?? false,
        noTradeTaken: editTrade.noTradeTaken ?? false,
        status: editTrade.status || 'closed'
      });
      const chartAnalysisImages = editTrade.images || [];
      const chartAnalysisNotes = editTrade.chartAnalysisNotes || '';
      // Parse before/after charts from notes using proper Before/After markers
      const { before: beforeParsed, after: afterParsed } = parseChartAnalysisNotes(chartAnalysisNotes, chartAnalysisImages);
      setBeforeCharts(beforeParsed);
      setAfterCharts(afterParsed);
      const preMarketImages = editTrade.preMarketImages || [];
      const preMarketNotes = editTrade.preMarketNotes || '';
      setPreMarketCharts(parseNotesToCharts(preMarketNotes, preMarketImages));
      const postMarketImages = editTrade.postMarketImages || [];
      const postMarketNotes = editTrade.postMarketNotes || '';
      setPostMarketCharts(parseNotesToCharts(postMarketNotes, postMarketImages));
    }
  }, [editTrade?.id]);
  const handlePnlAmountChange = (value: string) => {
    setFormData(prev => {
      const pnlAmount = parseFloat(value) || 0;
      let pnlPercentage = prev.pnlPercentage;
      
      // Calculate percentage based on account starting balance
      const accountBalance = activeAccount?.starting_balance || 0;
      
      if (accountBalance > 0 && value !== '') {
        pnlPercentage = (pnlAmount / accountBalance * 100).toFixed(2);
      }
      return {
        ...prev,
        pnlAmount: value,
        pnlPercentage
      };
    });
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {
      name,
      value
    } = e.target;
    if (name === 'pnlAmount') {
      handlePnlAmountChange(value);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const fillCurrentDateTime = () => {
    const now = new Date();
    setFormData(prev => ({
      ...prev,
      date: format(now, 'yyyy-MM-dd'),
      entryTime: format(now, 'HH:mm')
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol.trim()) {
      sonnerToast.error('Please enter a trading symbol.', {
        closeButton: true,
        style: {
          '--normal-bg':
            'light-dark(var(--destructive), color-mix(in oklab, var(--destructive) 60%, var(--background)))',
          '--normal-text': 'var(--color-white)',
          '--normal-border': 'transparent'
        } as React.CSSProperties
      });
      return;
    }
    setIsSubmitting(true);
    const chartAnalysisImages = [...beforeCharts.flatMap(c => c.images), ...afterCharts.flatMap(c => c.images)];
    const preMarketImages = preMarketCharts.flatMap(c => c.images);
    const postMarketImages = postMarketCharts.flatMap(c => c.images);
    // Always save timeframe markers for charts with images, even if no notes
    const beforeNotes = beforeCharts.filter(c => c.images.length > 0 || c.notes.trim()).map(c => `[Before - ${getTimeframeLabel(c.timeframe)}]\n${c.notes}`).join('\n\n');
    const afterNotes = afterCharts.filter(c => c.images.length > 0 || c.notes.trim()).map(c => `[After - ${getTimeframeLabel(c.timeframe)}]\n${c.notes}`).join('\n\n');
    const allChartNotes = [beforeNotes, afterNotes].filter(Boolean).join('\n\n');
    // Always save timeframe markers for charts with images, even if no notes (same pattern as beforeCharts/afterCharts)
    const allPreMarketNotes = preMarketCharts.filter(c => c.images.length > 0 || c.notes.trim()).map(c => `[${getTimeframeLabel(c.timeframe)}]\n${c.notes}`).join('\n\n');
    const allPostMarketNotes = postMarketCharts.filter(c => c.images.length > 0 || c.notes.trim()).map(c => `[${getTimeframeLabel(c.timeframe)}]\n${c.notes}`).join('\n\n');
    
    // Calculate pnlPercentage based on account starting balance
    const pnlAmount = parseFloat(formData.pnlAmount) || 0;
    const accountBalance = activeAccount?.starting_balance || 0;
    let calculatedPnlPercentage = parseFloat(formData.pnlPercentage) || 0;
    
    if (accountBalance > 0 && (formData.pnlPercentage === '' || formData.pnlPercentage === '0')) {
      calculatedPnlPercentage = (pnlAmount / accountBalance * 100);
    } else if (accountBalance > 0) {
      // Always recalculate to ensure it's based on account balance
      calculatedPnlPercentage = (pnlAmount / accountBalance * 100);
    }
    
    const tradeData = {
      symbol: formData.symbol.toUpperCase().trim(),
      direction: formData.direction,
      date: formData.date,
      entryTime: formData.entryTime,
      holdingTime: formData.holdingTime,
      lotSize: parseFloat(formData.lotSize) || 0,
      performanceGrade: parseInt(formData.performanceGrade) || 3,
      entryPrice: parseFloat(formData.entryPrice) || 0,
      stopLoss: parseFloat(formData.stopLoss) || 0,
      stopLossPips: formData.stopLossPips ? parseFloat(formData.stopLossPips) : undefined,
      takeProfit: parseFloat(formData.takeProfit) || 0,
      riskRewardRatio: formData.riskRewardRatio,
      pnlAmount: pnlAmount,
      pnlPercentage: calculatedPnlPercentage,
      preMarketPlan: formData.preMarketPlan,
      postMarketReview: formData.postMarketReview,
      emotionalJournalBefore: formData.emotionalJournalBefore,
      emotionalJournalDuring: formData.emotionalJournalDuring,
      emotionalJournalAfter: formData.emotionalJournalAfter,
      overallEmotions: formData.overallEmotions,
      emotionalState: formData.emotionalState,
      strategy: formData.strategy || undefined,
      category: formData.category,
      images: chartAnalysisImages,
      preMarketImages: preMarketImages,
      postMarketImages: postMarketImages,
      chartAnalysisNotes: allChartNotes,
      preMarketNotes: allPreMarketNotes,
      postMarketNotes: allPostMarketNotes,
      forecastId: formData.forecastId,
      followedRules: formData.followedRules,
      notes: formData.notes,
      mistakeTagging: formData.mistakeTagging,
      mistakeTags: formData.mistakeTags,
      hasNews: formData.hasNews,
      newsEvents: formData.newsEvents.filter(e => e.type || e.impact || e.time),
      isPaperTrade: formData.isPaperTrade,
      noTradeTaken: formData.noTradeTaken,
      status: formData.status
    };
    const validationResult = tradeFormSchema.safeParse(tradeData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: 'Validation Error',
        description: firstError?.message || 'Please check your input values.',
        variant: 'destructive'
      });
      setIsSubmitting(false);
      return;
    }
    const validatedData = {
      symbol: validationResult.data.symbol,
      direction: validationResult.data.direction,
      date: validationResult.data.date,
      entryTime: validationResult.data.entryTime,
      holdingTime: validationResult.data.holdingTime || '',
      lotSize: validationResult.data.lotSize,
      performanceGrade: validationResult.data.performanceGrade as 1 | 2 | 3,
      entryPrice: validationResult.data.entryPrice,
      stopLoss: validationResult.data.stopLoss,
      stopLossPips: validationResult.data.stopLossPips,
      takeProfit: validationResult.data.takeProfit,
      riskRewardRatio: validationResult.data.riskRewardRatio || '',
      pnlAmount: validationResult.data.pnlAmount,
      pnlPercentage: validationResult.data.pnlPercentage,
      preMarketPlan: validationResult.data.preMarketPlan || '',
      postMarketReview: validationResult.data.postMarketReview || '',
      emotionalJournalBefore: validationResult.data.emotionalJournalBefore || '',
      emotionalJournalDuring: validationResult.data.emotionalJournalDuring || '',
      emotionalJournalAfter: validationResult.data.emotionalJournalAfter || '',
      overallEmotions: formData.overallEmotions || '',
      emotionalState: validationResult.data.emotionalState,
      strategy: validationResult.data.strategy || undefined,
      category: validationResult.data.category,
      images: chartAnalysisImages,
      preMarketImages: preMarketImages,
      postMarketImages: postMarketImages,
      chartAnalysisNotes: allChartNotes,
      preMarketNotes: allPreMarketNotes,
      postMarketNotes: allPostMarketNotes,
      forecastId: validationResult.data.forecastId || null,
      followedRules: validationResult.data.followedRules ?? true,
      followedRulesList: formData.followedRulesList,
      brokenRules: formData.brokenRules,
      notes: validationResult.data.notes || '',
      mistakeTagging: validationResult.data.mistakeTagging || '',
      mistakeTags: formData.mistakeTags,
      hasNews: formData.hasNews,
      newsEvents: formData.newsEvents.filter(e => e.type || e.impact || e.time),
      isPaperTrade: formData.isPaperTrade,
      noTradeTaken: formData.noTradeTaken,
      status: formData.status
    };
    try {
      if (editTrade) {
        const updated = await updateTrade(editTrade.id, validatedData);
        if (!updated) {
          throw new Error('Failed to update trade');
        }
        sonnerToast.success('Trade updated successfully', {
          position: 'top-center',
          className: '!border-sky-400/40 !bg-sky-400/12 !text-sky-100 !text-center',
          style: {
            left: '50%',
            transform: 'translateX(-50%)',
          },
        });
      } else {
        const createdTrade = await addTrade(validatedData);
        if (!createdTrade) {
          throw new Error('Failed to save trade');
        }
        sonnerToast.success('Trade logged successfully', {
          position: 'top-center',
          className: '!border-sky-400/40 !bg-sky-400/12 !text-sky-100',
        });
      }
      navigate(-1);
    } catch (error) {
      console.error('Error saving trade:', error);
      toast({
        title: 'Error saving trade',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const getInitialTab = (): TabType => {
    const urlTab = searchParams.get('tab');
    const tabMap: Record<string, TabType> = {
      'general': 'general',
      'charts': 'chart-analysis',
      'pre-market': 'pre-market-forecast',
      'post-market': 'post-market-forecast',
      'emotions': 'emotions'
    };
    return tabMap[urlTab || ''] || 'general';
  };
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [showAdvancedOverview, setShowAdvancedOverview] = useState(false);
  const pnlPreview = formData.pnlAmount !== '' && accountStartingBalance > 0
    ? `${((parseFloat(formData.pnlAmount) || 0) / accountStartingBalance * 100).toFixed(2)}%`
    : 'Auto';
  const submitButtonClassName = "group relative h-10 overflow-hidden rounded-xl border border-violet-400/25 bg-[linear-gradient(135deg,rgba(139,92,246,0.95),rgba(168,85,247,0.92)_55%,rgba(124,58,237,0.96))] px-4 text-white transition-all duration-300 hover:border-violet-300/40 disabled:opacity-60";
  return <form onSubmit={handleSubmit} className="w-full h-full flex flex-col md:p-6 md:pt-8" onClick={(e) => e.stopPropagation()}>
      <div className={cn(
        "flex flex-col flex-1 min-h-0 relative overflow-hidden rounded-none md:rounded-3xl border-x-0 md:border-2 border-y-0 md:border-y-2 shadow-2xl",
        isGlassEnabled
          ? "border-border/50 bg-gradient-to-b from-card/98 to-card/95 dark:from-card/85 dark:to-card/80 md:backdrop-blur-2xl"
          : "border-border/60 bg-card md:backdrop-blur-xl"
      )} onClick={(e) => e.stopPropagation()}>
        {cardToast && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-30 w-full max-w-md -translate-x-1/2 px-3 md:top-4">
            <div
              className={cn(
                'pointer-events-auto relative rounded-2xl border px-4 py-3 text-center shadow-[0_14px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-inset ring-white/5 transition-all duration-300 ease-out',
                isCardToastClosing
                  ? 'animate-out fade-out-0 slide-out-to-top-2 opacity-0'
                  : 'animate-in fade-in-0 slide-in-from-top-2 opacity-100',
                cardToast.variant === 'success' && 'border-sky-400/35 bg-sky-400/10 text-sky-100',
                cardToast.variant === 'error' && (
                  cardToast.title === 'No image found' || cardToast.title === 'Failed to load trades'
                    ? 'border-red-500/45 bg-red-500/15 text-foreground'
                    : 'border-pnl-negative/35 bg-pnl-negative/10 text-foreground'
                ),
                cardToast.variant === 'warning' && 'border-yellow-500/35 bg-yellow-500/10 text-foreground',
                cardToast.variant === 'info' && 'border-violet-400/35 bg-violet-400/10 text-violet-100',
              )}
            >
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => window.dispatchEvent(new Event('trade-form-card-toast-dismiss'))}
                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/80 transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm font-display font-semibold tracking-wide">{cardToast.title}</p>
              {cardToast.description && (
                <p className="mt-1 text-xs font-display font-medium text-muted-foreground">{cardToast.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Dot pattern - only show when glass is enabled */}
        {isGlassEnabled && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tradeform-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" className="fill-foreground/[0.08] dark:fill-foreground/[0.04]" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tradeform-dots)" />
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
            backgroundColor: 'rgb(var(--color-muted) / 0.5)',
            zIndex: 5
          }}
        />
        
        {/* Header - sticky on mobile and desktop */}
        <div 
          className="sticky top-0 z-10 px-4 md:px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4 border-b border-border/30 bg-gradient-to-b from-muted/60 to-muted/40 backdrop-blur-sm relative"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-display text-foreground tracking-tight">
              {editTrade ? 'Edit Trade' : 'Add Trade'}
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => {
              dismissAllToasts();
              navigate(-1);
            }} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex justify-center">
            <div className="w-full max-w-3xl rounded-2xl border border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-1.5 backdrop-blur-sm overflow-x-auto scrollbar-hide">
              <div className="grid min-w-max grid-cols-5 gap-1">
                {[
                  { key: 'general' as TabType, label: 'Overview' },
                  { key: 'chart-analysis' as TabType, label: 'Chart' },
                  { key: 'pre-market-forecast' as TabType, label: 'Plan' },
                  { key: 'post-market-forecast' as TabType, label: 'Review' },
                  { key: 'emotions' as TabType, label: 'Mindset' },
                ].map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'group relative h-10 px-4 rounded-xl text-sm font-bold font-display whitespace-nowrap transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]',
                        isActive
                          ? 'text-background'
                          : 'text-muted-foreground hover:-translate-y-[1px] hover:scale-[1.01] hover:text-foreground hover:bg-background/45'
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="trade-form-tab-indicator"
                          className="absolute inset-0 rounded-xl bg-foreground"
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 32,
                            mass: 0.72,
                          }}
                        />
                      )}
                      <span className={cn('relative z-10', !isActive && 'transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[1px]')}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto px-4 md:px-6 py-6 pb-8 md:py-8 md:pb-8 overscroll-y-contain touch-pan-y min-h-0 relative z-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-full max-w-7xl mx-auto">

          {/* Submit button — shown on all tabs except general (which has it in the banner) */}
          {activeTab !== 'general' && (
            <div className="flex justify-end mb-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className={submitButtonClassName}
              >
                <span className="relative z-10 flex items-center gap-2 font-bold font-display tracking-tight text-sm">
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editTrade ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>{isSubmitting ? (editTrade ? 'Updating...' : 'Saving...') : (editTrade ? 'Update Trade' : 'Add Trade')}</span>
                </span>
              </Button>
            </div>
          )}
          {activeTab === 'general' && <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-border/45 bg-[radial-gradient(circle_at_8%_50%,rgba(139,92,246,0.20),transparent_34%),radial-gradient(circle_at_82%_50%,rgba(59,130,246,0.14),transparent_38%),linear-gradient(90deg,rgba(22,22,30,0.96),rgba(11,19,38,0.96))] px-4 py-3">
              <div className="relative flex items-center gap-3">
                <div className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/90">
                  Fast capture
                </div>
                <p className="font-display text-sm font-semibold text-white/80 flex-1">
                  Add the essentials now, expand details later.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={submitButtonClassName}
                >
                  <span className="relative z-10 flex items-center gap-2 font-bold font-display tracking-tight text-sm">
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editTrade ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>{isSubmitting ? (editTrade ? 'Updating...' : 'Saving...') : (editTrade ? 'Update Trade' : 'Add Trade')}</span>
                  </span>
                </Button>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]">
              <div className="rounded-[28px] border border-border/50 bg-card/75 p-5 backdrop-blur-xl sm:p-6">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                      <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">
                        Essential quick log
                      </div>
                      <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Core trade details</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label htmlFor="symbol" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/75">Symbol *</Label>
                      <Input id="symbol" name="symbol" value={formData.symbol} onChange={e => setFormData(p => ({ ...p, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" className="h-12 rounded-2xl border border-border/50 bg-background/80 px-4 text-base font-semibold uppercase text-foreground transition-all placeholder:text-muted-foreground/45 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/15" />
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="pnlAmount" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/75">Gross P&amp;L ({currencySymbol})</Label>
                      <Input id="pnlAmount" name="pnlAmount" type="number" step="0.01" value={formData.pnlAmount} onChange={handleChange} placeholder="+500" className="h-12 rounded-2xl border border-border/50 bg-background/80 px-4 text-base font-semibold text-foreground transition-all placeholder:text-muted-foreground/45 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                    </div>

                    <div className="space-y-2.5 md:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/75">Date &amp; time</Label>
                        <button
                          type="button"
                          onClick={fillCurrentDateTime}
                          className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300 transition-colors hover:border-violet-400/35 hover:bg-violet-500/15"
                        >
                          Auto-fill now
                        </button>
                      </div>
                      <div className="relative flex min-h-12 flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/80 sm:flex-row">
                        <div className="pointer-events-none absolute left-1/2 top-2 bottom-2 hidden w-px -translate-x-1/2 bg-border/40 sm:block" />

                        <div className="flex flex-1 items-center px-4 py-3 sm:py-0">
                          <input
                            id="date"
                            name="date"
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                            className="h-6 w-full rounded-lg bg-transparent text-sm font-semibold text-foreground focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert"
                          />
                        </div>

                        <div className="flex flex-1 items-center border-t border-border/40 px-4 py-3 sm:border-t-0 sm:py-0">
                          <input
                            id="entryTime"
                            name="entryTime"
                            type="time"
                            value={formData.entryTime}
                            onChange={e => setFormData(p => ({ ...p, entryTime: e.target.value }))}
                            className="h-6 w-full rounded-lg bg-transparent text-sm font-semibold text-foreground focus:outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-border/50 bg-card/75 p-5 backdrop-blur-xl sm:p-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                      Trade state
                    </div>
                    <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Execution snapshot</h3>

                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[22px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-3.5">
                      <div className="mb-2.5 flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold font-display uppercase tracking-[0.18em] text-foreground/72">Trade taken</span>
                          <p className="mt-1 text-xs text-muted-foreground">Was a live trade executed?</p>
                        </div>
                        <span className={cn(
                          'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                          formData.noTradeTaken
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                            : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                        )}>
                          {formData.noTradeTaken ? 'Skipped' : 'Taken'}
                        </span>
                      </div>
                      <div className="relative grid grid-cols-2 gap-1 rounded-[20px] border border-border/50 bg-black/20 p-1">
                        <div
                          className={cn(
                            'absolute top-1 bottom-1 rounded-[15px] border pointer-events-none transition-all duration-300',
                            formData.noTradeTaken
                              ? 'left-[calc(50%+0.125rem)] right-1 border-amber-500/35 bg-[linear-gradient(180deg,rgba(245,158,11,0.18),rgba(245,158,11,0.08))]'
                              : 'left-1 right-[calc(50%+0.125rem)] border-sky-500/35 bg-[linear-gradient(180deg,rgba(14,165,233,0.2),rgba(14,165,233,0.08))]'
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, isPaperTrade: false, noTradeTaken: false }))}
                          className={cn(
                            'relative z-10 flex h-10 items-center justify-center rounded-[15px] px-3 text-sm font-semibold transition-all duration-300',
                            !formData.noTradeTaken ? 'text-sky-300' : 'text-muted-foreground hover:text-foreground/80'
                          )}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, isPaperTrade: false, noTradeTaken: true }))}
                          className={cn(
                            'relative z-10 flex h-10 items-center justify-center rounded-[15px] px-3 text-sm font-semibold transition-all duration-300',
                            formData.noTradeTaken ? 'text-amber-300' : 'text-muted-foreground hover:text-foreground/80'
                          )}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-3.5">
                      <div className="mb-2.5 flex items-start justify-between gap-3">
                        <div>
                          <Label className="text-[11px] font-bold font-display uppercase tracking-[0.18em] text-foreground/72">Status</Label>
                          <p className="mt-1 text-xs text-muted-foreground">Open or completed.</p>
                        </div>
                        <span className={cn(
                          'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                          formData.status === 'open'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300'
                        )}>
                          {formData.status}
                        </span>
                      </div>
                      <div className="relative grid grid-cols-2 gap-1 rounded-[20px] border border-border/50 bg-black/20 p-1">
                        <div
                          className={cn(
                            'absolute top-1 bottom-1 rounded-[15px] border pointer-events-none transition-all duration-300',
                            formData.status === 'open'
                              ? 'left-1 right-[calc(50%+0.125rem)] border-emerald-500/35 bg-[linear-gradient(180deg,rgba(16,185,129,0.2),rgba(16,185,129,0.08))]'
                              : 'left-[calc(50%+0.125rem)] right-1 border-zinc-400/30 bg-[linear-gradient(180deg,rgba(161,161,170,0.16),rgba(161,161,170,0.08))]'
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, status: 'open' }))}
                          className={cn(
                            'relative z-10 flex h-10 items-center justify-center rounded-[15px] px-3 text-sm font-semibold transition-all duration-300',
                            formData.status === 'open' ? 'text-emerald-300' : 'text-muted-foreground hover:text-foreground/80'
                          )}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, status: 'closed' }))}
                          className={cn(
                            'relative z-10 flex h-10 items-center justify-center rounded-[15px] px-3 text-sm font-semibold transition-all duration-300',
                            formData.status === 'closed' ? 'text-zinc-200' : 'text-muted-foreground hover:text-foreground/80'
                          )}
                        >
                          Closed
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-3.5">
                      <div className="mb-2.5 flex items-start justify-between gap-3">
                        <div>
                          <Label className="text-[11px] font-bold font-display uppercase tracking-[0.18em] text-foreground/72">Direction</Label>
                          <p className="mt-1 text-xs text-muted-foreground">Long or short.</p>
                        </div>
                        <span className={cn(
                          'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                          formData.direction === 'long'
                            ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-400'
                            : 'border-red-500/35 bg-red-500/12 text-red-400'
                        )}>
                          {formData.direction === 'long' ? 'Long' : 'Short'}
                        </span>
                      </div>
                      <div className="relative grid grid-cols-2 gap-1 rounded-[20px] border border-border/50 bg-black/20 p-1">
                        <div
                          className={cn(
                            'absolute top-1 bottom-1 rounded-[15px] border pointer-events-none transition-all duration-300',
                            formData.direction === 'long'
                              ? 'left-1 right-[calc(50%+0.125rem)] border-emerald-500/40 bg-[linear-gradient(180deg,rgba(34,197,94,0.18),rgba(34,197,94,0.08))]'
                              : 'left-[calc(50%+0.125rem)] right-1 border-red-500/40 bg-[linear-gradient(180deg,rgba(239,68,68,0.18),rgba(239,68,68,0.08))]'
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, direction: 'long' }))}
                          className={cn(
                            'relative z-10 flex h-10 items-center justify-center rounded-[15px] px-3 text-sm font-semibold transition-all duration-300',
                            formData.direction === 'long' ? 'text-emerald-400' : 'text-muted-foreground hover:text-foreground/80'
                          )}
                        >
                          Buy
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, direction: 'short' }))}
                          className={cn(
                            'relative z-10 flex h-10 items-center justify-center rounded-[15px] px-3 text-sm font-semibold transition-all duration-300',
                            formData.direction === 'short' ? 'text-red-400' : 'text-muted-foreground hover:text-foreground/80'
                          )}
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Details Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedOverview(prev => !prev)}
              className="group relative w-full overflow-hidden rounded-2xl border border-border/50 bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(24,24,27,0.86))] px-4 py-3 text-foreground transition-all duration-300 hover:border-violet-500/25 sm:px-5"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0 text-left">
                  <p className="text-base font-bold font-display tracking-tight">Advanced workspace · Optional details</p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="hidden md:flex flex-wrap gap-1.5">
                    {['Setup', 'Risk', 'Rules', 'Mistakes', 'Notes'].map(item => (
                      <span
                        key={item}
                        className="rounded-full border border-border/50 bg-background/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    <span className="text-[11px] font-semibold uppercase tracking-wide">{showAdvancedOverview ? 'Collapse' : 'Expand'}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/45 bg-background/50 transition-all group-hover:border-violet-400/30">
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-300 ease-out',
                          showAdvancedOverview ? 'rotate-180' : 'rotate-0'
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </button>

            <div
              className={cn(
                'grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                showAdvancedOverview ? 'grid-rows-[1fr] opacity-100 mt-5' : 'grid-rows-[0fr] opacity-0 mt-0'
              )}
              aria-hidden={!showAdvancedOverview}
            >
              <div
                className={cn(
                  'overflow-hidden space-y-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  showAdvancedOverview ? 'translate-y-0' : '-translate-y-2 pointer-events-none'
                )}
              >

            {/* Trade Setup + Risk Metrics - Merged */}
            <div className="rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                        Setup
                      </div>
                      <div className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                        Risk
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Trade setup &amp; risk</h3>
                      <p className="text-sm text-muted-foreground">Capture prices, distance, duration, and reward framing.</p>
                    </div>
                  </div>

                </div>

                {/* Divider label */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">Prices</span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>

                {/* Price inputs — 4 cols */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5">
                    <Label htmlFor="entryPrice" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/70">Entry</Label>
                    <Input id="entryPrice" name="entryPrice" type="number" step="0.01" value={formData.entryPrice} onChange={handleChange} placeholder="0.00" className="mt-2 h-11 rounded-xl border border-border/45 bg-background/90 text-foreground placeholder:text-muted-foreground/50 tabular-nums text-sm font-semibold focus:border-violet-400/35 focus:ring-2 focus:ring-violet-400/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5">
                    <Label htmlFor="takeProfit" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/70">Take profit</Label>
                    <Input id="takeProfit" name="takeProfit" type="number" step="0.01" value={formData.takeProfit} onChange={handleChange} placeholder="0.00" className="mt-2 h-11 rounded-xl border border-border/45 bg-background/90 text-foreground placeholder:text-muted-foreground/50 tabular-nums text-sm font-semibold focus:border-violet-400/35 focus:ring-2 focus:ring-violet-400/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5">
                    <Label htmlFor="stopLoss" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/70">Stop loss</Label>
                    <Input id="stopLoss" name="stopLoss" type="number" step="0.01" value={formData.stopLoss} onChange={handleChange} placeholder="0.00" className="mt-2 h-11 rounded-xl border border-border/45 bg-background/90 text-foreground placeholder:text-muted-foreground/50 tabular-nums text-sm font-semibold focus:border-violet-400/35 focus:ring-2 focus:ring-violet-400/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5">
                    <Label htmlFor="lotSize" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/70">Lot size</Label>
                    <Input id="lotSize" name="lotSize" type="number" step="0.01" value={formData.lotSize} onChange={handleChange} placeholder="0" className="mt-2 h-11 rounded-xl border border-border/45 bg-background/90 text-foreground placeholder:text-muted-foreground/50 tabular-nums text-sm font-semibold focus:border-violet-400/35 focus:ring-2 focus:ring-violet-400/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                </div>

                {/* Divider label */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">Risk</span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>

                {/* Risk inputs — 3 cols */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5">
                    <Label htmlFor="stopLossPips" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/70">SL pips</Label>
                    <Input id="stopLossPips" name="stopLossPips" type="number" step="0.1" value={formData.stopLossPips} onChange={handleChange} placeholder="15" className="mt-2 h-11 rounded-xl border border-border/45 bg-background/90 text-foreground placeholder:text-muted-foreground/50 tabular-nums text-sm font-semibold focus:border-cyan-400/35 focus:ring-2 focus:ring-cyan-400/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5">
                    <Label htmlFor="holdingTime" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/70">Hold time</Label>
                    <Input id="holdingTime" name="holdingTime" value={formData.holdingTime} onChange={handleChange} placeholder="2h 30m" className="mt-2 h-11 rounded-xl border border-border/45 bg-background/90 text-foreground placeholder:text-muted-foreground/50 text-sm font-semibold focus:border-cyan-400/35 focus:ring-2 focus:ring-cyan-400/15" />
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5">
                    <Label htmlFor="riskRewardRatio" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/70">Risk : reward</Label>
                    <Input id="riskRewardRatio" name="riskRewardRatio" value={formData.riskRewardRatio} onChange={handleChange} placeholder="1:2" className="mt-2 h-11 rounded-xl border border-border/45 bg-background/90 text-foreground placeholder:text-muted-foreground/50 text-sm font-semibold focus:border-cyan-400/35 focus:ring-2 focus:ring-cyan-400/15" />
                  </div>
                </div>
              </div>
            </div>

            {/* Rules, Mistakes, Performance & News */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="md:order-3 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">Rules</div>
                      <div>
                        <Label className="text-lg font-bold font-display tracking-tight text-foreground">Trading rules</Label>
                        <p className="text-sm text-muted-foreground">Track discipline and select the rules that shaped the trade.</p>
                      </div>
                    </div>
                    <span className="rounded-xl border border-border/50 bg-background/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums whitespace-nowrap">
                      {formData.followedRules ? `${formData.followedRulesList.length} selected` : `${formData.brokenRules.length} broken`}
                    </span>
                  </div>

                  <div className="relative flex gap-0 rounded-[22px] overflow-hidden border border-border/50 bg-black/20 p-1.5 h-13">
                    <div
                      className={cn(
                        'absolute top-1.5 bottom-1.5 rounded-[16px] pointer-events-none transition-all duration-300',
                        formData.followedRules
                          ? 'border border-sky-500/35 bg-[linear-gradient(180deg,rgba(14,165,233,0.18),rgba(14,165,233,0.08))]'
                          : 'border border-zinc-400/30 bg-[linear-gradient(180deg,rgba(161,161,170,0.14),rgba(161,161,170,0.08))]'
                      )}
                      style={{
                        width: 'calc(50% - 0.75rem)',
                        left: formData.followedRules ? '0.375rem' : 'calc(50% + 0.375rem)',
                      }}
                    />
                    <div className="relative z-10 flex w-full gap-0">
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({
                          ...p,
                          followedRules: true
                        }))}
                        className={cn(
                          'flex-1 flex items-center justify-center h-10 px-2 text-sm font-semibold rounded-[16px] transition-colors duration-300',
                          formData.followedRules ? 'text-sky-300' : 'text-muted-foreground hover:text-foreground/80'
                        )}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({
                          ...p,
                          followedRules: false
                        }))}
                        className={cn(
                          'flex-1 flex items-center justify-center h-10 px-2 text-sm font-semibold rounded-[16px] transition-colors duration-300',
                          !formData.followedRules ? 'text-zinc-200' : 'text-muted-foreground hover:text-foreground/80'
                        )}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {formData.followedRules && (
                    <div className="space-y-2.5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">Which rules did you follow?</Label>
                      {tradingRules.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {tradingRules.map((rule, index) => {
                            const isSelected = formData.followedRulesList.includes(rule);
                            return (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  setFormData(p => ({
                                    ...p,
                                    followedRulesList: isSelected
                                      ? p.followedRulesList.filter(r => r !== rule)
                                      : [...p.followedRulesList, rule]
                                  }));
                                }}
                                className={cn(
                                  'min-h-11 px-3.5 rounded-xl text-xs transition-all duration-200 border flex items-center gap-2.5 text-left font-medium',
                                  isSelected
                                    ? 'bg-pnl-positive/12 text-pnl-positive border-pnl-positive/45'
                                    : 'bg-background/60 text-foreground border-border/60 hover:bg-background hover:border-border'
                                )}
                              >
                                <div className={cn(
                                  'h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0',
                                  isSelected ? 'bg-pnl-positive border-pnl-positive' : 'border-muted-foreground'
                                )}>
                                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                                <span className="truncate">{rule}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/70 italic px-2">
                          No rules configured. Add rules in Settings → Trading Rules.
                        </p>
                      )}
                    </div>
                  )}

                  {!formData.followedRules && (
                    <div className="space-y-2.5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">Which rules did you break?</Label>
                      {(() => {
                        const availableRules = tradingRules.filter(rule => !formData.followedRulesList.includes(rule));

                        if (tradingRules.length === 0) {
                          return (
                            <p className="text-xs text-muted-foreground/70 italic px-2">
                              No rules configured. Add rules in Settings → Trading Rules.
                            </p>
                          );
                        }

                        if (availableRules.length === 0) {
                          return (
                            <p className="text-xs text-muted-foreground/70 italic px-2">
                              All rules were followed. Switch to "Yes" to modify followed rules.
                            </p>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {availableRules.map((rule, index) => {
                              const isSelected = formData.brokenRules.includes(rule);
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    setFormData(p => ({
                                      ...p,
                                      brokenRules: isSelected
                                        ? p.brokenRules.filter(r => r !== rule)
                                        : [...p.brokenRules, rule]
                                    }));
                                  }}
                                  className={cn(
                                    'min-h-11 px-3.5 rounded-xl text-xs transition-all duration-200 border flex items-center gap-2.5 text-left font-medium',
                                    isSelected
                                      ? 'bg-pnl-negative/12 text-pnl-negative border-pnl-negative/45'
                                      : 'bg-background/60 text-foreground border-border/60 hover:bg-background hover:border-border'
                                  )}
                                >
                                  <div className={cn(
                                    'h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0',
                                    isSelected ? 'bg-pnl-negative border-pnl-negative' : 'border-muted-foreground'
                                  )}>
                                    {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                  </div>
                                  <span className="truncate">{rule}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:order-2 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Performance</div>
                    <div>
                      <Label className="text-lg font-bold font-display tracking-tight text-foreground">Performance grade</Label>
                      <p className="text-sm text-muted-foreground">Rate how well the execution matched your plan.</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="grid grid-cols-3 gap-2 rounded-[22px] border border-border/50 bg-black/20 p-1.5">
                      {[1, 2, 3].map(grade => {
                        const isSelected = parseInt(formData.performanceGrade) === grade;
                        const gradeColors: Record<number, { selected: string; selectedBorder: string; text: string; }> = {
                          1: { selected: 'bg-gradient-to-br from-red-500/20 to-red-500/10', selectedBorder: 'border-red-500/50', text: 'text-red-500' },
                          2: { selected: 'bg-gradient-to-br from-amber-500/20 to-amber-500/10', selectedBorder: 'border-amber-500/50', text: 'text-amber-500' },
                          3: { selected: 'bg-gradient-to-br from-pnl-positive/20 to-pnl-positive/10', selectedBorder: 'border-pnl-positive/50', text: 'text-pnl-positive' }
                        };
                        const colors = gradeColors[grade];
                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, performanceGrade: grade.toString() }))}
                            className={cn(
                              'h-12 rounded-[16px] text-sm font-bold transition-all duration-200 border',
                              isSelected ? `${colors.selected} ${colors.selectedBorder} ${colors.text}` : 'bg-background/60 text-muted-foreground border-border/60 hover:bg-background hover:text-foreground'
                            )}
                          >
                            {grade}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5 space-y-2">
                    <Label className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/75">Category</Label>
                    <Select value={formData.category} onValueChange={(value: TradeCategory) => setFormData(p => ({ ...p, category: value }))}>
                      <SelectTrigger className="h-11 bg-background/85 border border-border/55 rounded-xl text-foreground text-sm font-semibold transition-all [&>svg]:hidden">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADE_CATEGORIES.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5 space-y-2">
                    <Label htmlFor="strategy" className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/75">Strategy</Label>
                    <Input id="strategy" name="strategy" value={formData.strategy} onChange={handleChange} placeholder="e.g., Breakout" className="h-11 bg-background/85 border border-border/55 rounded-xl text-foreground placeholder:text-muted-foreground/50 text-sm font-semibold focus:border-amber-400/35 focus:ring-2 focus:ring-amber-400/15 transition-all" />
                  </div>
                </div>
              </div>

              <div className="md:order-1 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">
                        Mistakes
                      </div>
                      <div>
                        <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Identify mistakes</h3>
                        <p className="text-sm text-muted-foreground">Tag what went wrong to build self-awareness.</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-border/50 bg-background/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                      {formData.mistakeTags?.length || 0} tagged
                    </span>
                  </div>

                  {/* Mistake chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COMMON_MISTAKE_TAGS.map((mistake) => {
                      const isSelected = formData.mistakeTags?.includes(mistake) || false;
                      return (
                        <button
                          key={mistake}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({
                              ...p,
                              mistakeTags: isSelected
                                ? (p.mistakeTags || []).filter(m => m !== mistake)
                                : [...(p.mistakeTags || []), mistake]
                            }));
                          }}
                          className={cn(
                            'min-h-11 px-3.5 rounded-xl text-xs transition-all duration-200 border flex items-center gap-2.5 font-semibold',
                            isSelected
                              ? 'bg-rose-500/12 text-rose-300 border-rose-500/35'
                              : 'bg-background/50 text-foreground/80 border-border/50 hover:bg-background/80 hover:border-border/70'
                          )}
                        >
                          <div className={cn(
                            'h-4 w-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors',
                            isSelected ? 'bg-rose-500 border-rose-500' : 'border-border/70 bg-background/60'
                          )}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <span className="truncate">{mistake}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom tag input */}
                  <div className="rounded-2xl border border-border/45 bg-background/50 p-3.5">
                    <Label className="text-[11px] font-bold font-display uppercase tracking-[0.16em] text-foreground/70">Custom tag</Label>
                    <Input
                      type="text"
                      placeholder="Type a mistake and press Enter…"
                      value={formData.mistakeTagInput || ''}
                      onChange={(e) => setFormData(p => ({ ...p, mistakeTagInput: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && formData.mistakeTagInput?.trim()) {
                          e.preventDefault();
                          const customTag = formData.mistakeTagInput.trim();
                          setFormData(p => ({
                            ...p,
                            mistakeTags: [...(p.mistakeTags || []), customTag],
                            mistakeTagInput: ''
                          }));
                        }
                      }}
                      className="mt-2 h-11 rounded-xl border border-border/45 bg-background/90 text-foreground placeholder:text-muted-foreground/50 text-sm font-semibold focus:border-rose-400/35 focus:ring-2 focus:ring-rose-400/15 transition-all"
                    />
                  </div>

                  {/* Custom tags pills */}
                  {formData.mistakeTags && formData.mistakeTags.some(tag => !COMMON_MISTAKE_TAGS.includes(tag)) && (
                    <div className="flex flex-wrap gap-2">
                      {formData.mistakeTags.filter(tag => !COMMON_MISTAKE_TAGS.includes(tag)).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({
                              ...p,
                              mistakeTags: (p.mistakeTags || []).filter(m => m !== tag)
                            }));
                          }}
                          className="group inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-xl border border-rose-500/35 bg-rose-500/10 text-rose-300 text-xs font-semibold transition-all hover:bg-rose-500/20"
                        >
                          <span className="max-w-[180px] truncate">{tag}</span>
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-lg transition-colors group-hover:bg-rose-500/25">
                            <X className="h-2.5 w-2.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:order-4 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
                <NewsEventSelector
                  date={formData.date || null}
                  hasNews={formData.hasNews}
                  selectedEvents={formData.newsEvents.filter(e => e.type).map(e => ({
                    title: e.type,
                    impact: e.impact,
                    currency: e.currency,
                    time: e.time,
                  }))}
                  onHasNewsChange={(hasNews) => setFormData(p => ({
                    ...p,
                    hasNews,
                    newsEvents: hasNews ? p.newsEvents : [{ id: crypto.randomUUID(), type: '', impact: '' as NewsImpact | '', time: '', currency: '' }]
                  }))}
                  onNewsSelect={() => {}}
                  onMultiNewsSelect={(events) => setFormData(p => ({
                    ...p,
                    newsEvents: events.map((e, idx) => ({
                      id: p.newsEvents[idx]?.id || crypto.randomUUID(),
                      type: e.title,
                      impact: e.impact as NewsImpact | '',
                      time: e.time || '',
                      currency: e.currency || '',
                    }))
                  }))}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center rounded-full border border-zinc-500/20 bg-zinc-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Notes
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Trade notes</h3>
                    <p className="text-sm text-muted-foreground">Add any additional observations about this trade.</p>
                  </div>
                </div>
                <RichTextEditor value={formData.notes} onChange={(text) => handleChange({ target: { name: 'notes', value: text } } as any)} placeholder="Add any additional notes about this trade..." />
              </div>
            </div>
              </div>
            </div>
            </div>}

          {/* CHART ANALYSIS TAB */}
          {activeTab === 'chart-analysis' && <div className="space-y-5">
              {/* Chart Before Section */}
              <div className="space-y-4">
                <div className="rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                        Before
                      </div>
                      <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Chart before trade</h3>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="rounded-xl border border-border/50 bg-background/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                        {beforeCharts.length} {beforeCharts.length === 1 ? 'chart' : 'charts'}
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={addBeforeChart} className="h-9 px-3.5 rounded-xl text-xs gap-1.5 border border-border/50 bg-background/45 text-foreground hover:bg-background/80 transition-all font-semibold">
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
                
                {beforeCharts.map((chart, index) => (
                  <div
                    key={chart.id}
                    className={cn(
                      "space-y-4 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl",
                      removingBeforeChartIds.includes(chart.id)
                        ? "animate-out fade-out-0 slide-out-to-top-2 duration-300"
                        : enteringBeforeChartIds.includes(chart.id)
                          ? "animate-in fade-in-0 slide-in-from-top-2 duration-500 ease-out"
                          : ""
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Select value={chart.timeframe} onValueChange={v => updateBeforeChart(chart.id, 'timeframe', v)}>
                        <SelectTrigger className="w-32 h-9 rounded-xl bg-background/60 border-border/50 text-sm font-semibold">
                          <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeframeOptions.map(tf => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {beforeCharts.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-all" onClick={() => removeBeforeChart(chart.id)} disabled={removingBeforeChartIds.includes(chart.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <ImageUpload images={chart.images} onChange={images => updateBeforeChart(chart.id, 'images', images)} maxImages={5} timeframeLabel={getTimeframeLabel(chart.timeframe)} />
                    <RichTextEditor 
                      placeholder="Your analysis notes for chart before trade..." 
                      value={chart.notes} 
                      onChange={(text) => updateBeforeChart(chart.id, 'notes', text)}
                    />
                  </div>
                ))}
              </div>

              {/* Chart After Section */}
              <div className="space-y-4">
                <div className="rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                        After
                      </div>
                      <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Chart after trade</h3>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="rounded-xl border border-border/50 bg-background/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                        {afterCharts.length} {afterCharts.length === 1 ? 'chart' : 'charts'}
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={addAfterChart} className="h-9 px-3.5 rounded-xl text-xs gap-1.5 border border-border/50 bg-background/45 text-foreground hover:bg-background/80 transition-all font-semibold">
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
                
                {afterCharts.map((chart, index) => (
                  <div
                    key={chart.id}
                    className={cn(
                      "space-y-4 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl",
                      removingAfterChartIds.includes(chart.id)
                        ? "animate-out fade-out-0 slide-out-to-top-2 duration-300"
                        : enteringAfterChartIds.includes(chart.id)
                          ? "animate-in fade-in-0 slide-in-from-top-2 duration-500 ease-out"
                          : ""
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Select value={chart.timeframe} onValueChange={v => updateAfterChart(chart.id, 'timeframe', v)}>
                        <SelectTrigger className="w-32 h-9 rounded-xl bg-background/60 border-border/50 text-sm font-semibold">
                          <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeframeOptions.map(tf => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {afterCharts.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-all" onClick={() => removeAfterChart(chart.id)} disabled={removingAfterChartIds.includes(chart.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <ImageUpload images={chart.images} onChange={images => updateAfterChart(chart.id, 'images', images)} maxImages={5} timeframeLabel={getTimeframeLabel(chart.timeframe)} />
                    <RichTextEditor 
                      placeholder="Your analysis notes for chart after trade..." 
                      value={chart.notes} 
                      onChange={(text) => updateAfterChart(chart.id, 'notes', text)}
                    />
                  </div>
                ))}
              </div>
            </div>}

          {/* PRE MARKET FORECAST TAB */}
          {activeTab === 'pre-market-forecast' && <div className="space-y-6">
              <div className="rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 py-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                      Forecast
                    </div>
                    <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Pre market forecast</h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-xl border border-border/50 bg-background/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                      {preMarketCharts.length} {preMarketCharts.length === 1 ? 'chart' : 'charts'}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={addPreMarketChart} className="h-9 px-3.5 rounded-xl text-xs gap-1.5 border border-border/50 bg-background/45 text-foreground hover:bg-background/80 transition-all font-semibold">
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {preMarketCharts.map(chart => (
                <div
                  key={chart.id}
                  className={cn(
                    "space-y-4 p-5 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] backdrop-blur-xl",
                    removingPreMarketChartIds.includes(chart.id)
                      ? "animate-out fade-out-0 slide-out-to-top-2 duration-300"
                      : enteringPreMarketChartIds.includes(chart.id)
                        ? "animate-in fade-in-0 slide-in-from-top-2 duration-500 ease-out"
                        : ""
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Select value={chart.timeframe} onValueChange={v => updatePreMarketChart(chart.id, 'timeframe', v)}>
                      <SelectTrigger className="w-32 h-9 rounded-xl bg-background/60 border-border/50 text-sm font-semibold">
                        <SelectValue placeholder="Timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeframeOptions.map(tf => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {preMarketCharts.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-all" onClick={() => removePreMarketChart(chart.id)} disabled={removingPreMarketChartIds.includes(chart.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <ImageUpload images={chart.images} onChange={images => updatePreMarketChart(chart.id, 'images', images)} maxImages={5} timeframeLabel={getTimeframeLabel(chart.timeframe)} />
                  <RichTextEditor 
                    placeholder="Your pre-market analysis and forecast notes..." 
                    value={chart.notes} 
                    onChange={(text) => updatePreMarketChart(chart.id, 'notes', text)}
                  />
                </div>
              ))}

              {/* Pre-trade Analysis */}
              
            </div>}

          {/* POST MARKET FORECAST TAB */}
          {activeTab === 'post-market-forecast' && <div className="space-y-6">
              <div className="rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 py-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                      Review
                    </div>
                    <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Post market review</h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-xl border border-border/50 bg-background/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                      {postMarketCharts.length} {postMarketCharts.length === 1 ? 'chart' : 'charts'}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={addPostMarketChart} className="h-9 px-3.5 rounded-xl text-xs gap-1.5 border border-border/50 bg-background/45 text-foreground hover:bg-background/80 transition-all font-semibold">
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {postMarketCharts.map(chart => (
                <div
                  key={chart.id}
                  className={cn(
                    "space-y-4 p-5 rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] backdrop-blur-xl",
                    removingPostMarketChartIds.includes(chart.id)
                      ? "animate-out fade-out-0 slide-out-to-top-2 duration-300"
                      : enteringPostMarketChartIds.includes(chart.id)
                        ? "animate-in fade-in-0 slide-in-from-top-2 duration-500 ease-out"
                        : ""
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Select value={chart.timeframe} onValueChange={v => updatePostMarketChart(chart.id, 'timeframe', v)}>
                      <SelectTrigger className="w-32 h-9 rounded-xl bg-background/60 border-border/50 text-sm font-semibold">
                        <SelectValue placeholder="Timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeframeOptions.map(tf => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {postMarketCharts.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-all" onClick={() => removePostMarketChart(chart.id)} disabled={removingPostMarketChartIds.includes(chart.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <ImageUpload images={chart.images} onChange={images => updatePostMarketChart(chart.id, 'images', images)} maxImages={5} timeframeLabel={getTimeframeLabel(chart.timeframe)} />
                  <RichTextEditor 
                    placeholder="Your post-market review and what actually happened..." 
                    value={chart.notes} 
                    onChange={(text) => updatePostMarketChart(chart.id, 'notes', text)}
                  />
                </div>
              ))}

              {/* Post-trade Analysis */}
              
            </div>}

          {/* EMOTIONS TAB */}
          {activeTab === 'emotions' && <div className="space-y-6">
              {/* Emotional State */}
              <div className="rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
                {(() => {
                  const activeIndex = Math.min(2, Math.max(0, Math.round(formData.emotionalState) - 1));
                  const activeValue = EMOTION_LABELS[activeIndex]?.value;
                  const activeHighlight = activeValue === 1
                    ? 'border-red-500/35 bg-[linear-gradient(180deg,rgba(239,68,68,0.16),rgba(239,68,68,0.08))]'
                    : activeValue === 2
                      ? 'border-amber-500/35 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(245,158,11,0.08))]'
                      : 'border-emerald-500/35 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(16,185,129,0.08))]';

                  return (
                    <div className="space-y-4.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                            Mindset
                          </div>
                          <div>
                            <h3 className="text-lg font-bold font-display tracking-tight text-foreground">How are you feeling?</h3>
                            <p className="text-sm text-muted-foreground">Pick the emotion that best reflects your current state.</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-xl border border-border/50 bg-background/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {EMOTION_LABELS[activeIndex]?.label}
                        </span>
                      </div>

                      <div className="relative rounded-[22px] border border-border/50 bg-black/20 p-1.5">
                        <span
                          className={cn('absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-1.125rem)/3)] rounded-[16px] border transition-transform duration-300 ease-out', activeHighlight)}
                          style={{ transform: `translateX(${activeIndex * 100}%)` }}
                        />

                        <div className="relative z-10 grid grid-cols-3 gap-0.5">
                          {EMOTION_LABELS.map((emotion) => {
                            const Icon = emotion.icon;
                            const isSelected = Math.round(formData.emotionalState) === emotion.value;

                            return (
                              <button
                                key={emotion.value}
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, emotionalState: emotion.value }))}
                                className="h-16 px-2.5 rounded-[16px] flex items-center justify-center gap-2.5 transition-colors"
                              >
                                <Icon className={cn('h-5 w-5 transition-colors', isSelected ? emotion.color : 'text-muted-foreground')} />
                                <span className={cn('text-sm font-semibold transition-colors', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
                                  {emotion.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Overall Emotions */}
              <div className="rounded-[28px] border border-border/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 backdrop-blur-xl">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                      Reflection
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display tracking-tight text-foreground">Overall emotions</h3>
                      <p className="text-sm text-muted-foreground">Capture your thoughts, confidence, and mental clarity around this trade.</p>
                    </div>
                  </div>

                  <RichTextEditor value={formData.overallEmotions} onChange={(text) => handleChange({ target: { name: 'overallEmotions', value: text } } as any)} placeholder="Describe your emotions and thoughts about this trade..." />
                </div>
              </div>
            </div>}
          </div>
        </div>

      </div>
    </form>;
}