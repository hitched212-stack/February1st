import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trade, TradeDirection, TradeCategory, TradeStatus, NewsImpact, NewsEvent } from '@/types/trade';
import { useAuth } from './useAuth';
import { useAccount } from './useAccount';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

interface DbTrade {
  id: string;
  user_id: string;
  account_id: string | null;
  symbol: string;
  direction: string;
  date: string;
  entry_time: string;
  holding_time: string;
  lot_size: number;
  performance_grade: number;
  entry_price: number;
  stop_loss: number;
  stop_loss_pips: number | null;
  take_profit: number;
  risk_reward_ratio: string;
  pnl_amount: number;
  pnl_percentage: number;
  pre_market_plan: string;
  post_market_review: string;
  emotional_journal_before: string;
  emotional_journal_during: string;
  emotional_journal_after: string;
  overall_emotions: string | null;
  emotional_state: number | null;
  images: string[];
  pre_market_images: string[] | null;
  post_market_images: string[] | null;
  chart_analysis_notes: string | null;
  pre_market_notes: string | null;
  post_market_notes: string | null;
  strategy: string | null;
  category: string | null;
  forecast_id: string | null;
  followed_rules: boolean | null;
  followed_rules_list: string[] | null;
  broken_rules: string[] | null;
  notes: string | null;
  mistake_tagging: string | null;
  mistake_tags: string[] | null;
  has_news: boolean | null;
  news_events: unknown;
  is_paper_trade: boolean | null;
  no_trade_taken: boolean | null;
  status: string | null;
  news_type: string | null;
  news_impact: string | null;
  news_time: string | null;
  created_at: string;
  updated_at: string;
}

const mapDbTradeToTrade = (dbTrade: DbTrade): Trade => ({
  id: dbTrade.id,
  accountId: dbTrade.account_id || undefined,
  symbol: dbTrade.symbol,
  direction: dbTrade.direction as TradeDirection,
  date: dbTrade.date,
  entryTime: dbTrade.entry_time,
  holdingTime: dbTrade.holding_time,
  lotSize: dbTrade.lot_size,
  performanceGrade: Math.min(3, dbTrade.performance_grade) as 1 | 2 | 3,
  entryPrice: dbTrade.entry_price,
  stopLoss: dbTrade.stop_loss,
  stopLossPips: dbTrade.stop_loss_pips || undefined,
  takeProfit: dbTrade.take_profit,
  riskRewardRatio: dbTrade.risk_reward_ratio,
  pnlAmount: dbTrade.pnl_amount,
  pnlPercentage: dbTrade.pnl_percentage,
  preMarketPlan: dbTrade.pre_market_plan || '',
  postMarketReview: dbTrade.post_market_review || '',
  emotionalJournalBefore: dbTrade.emotional_journal_before || '',
  emotionalJournalDuring: dbTrade.emotional_journal_during || '',
  emotionalJournalAfter: dbTrade.emotional_journal_after || '',
  overallEmotions: dbTrade.overall_emotions || '',
  emotionalState: (dbTrade.emotional_state as 1 | 2 | 3 | 4 | 5) || 3,
  images: dbTrade.images || [],
  preMarketImages: dbTrade.pre_market_images || [],
  postMarketImages: dbTrade.post_market_images || [],
  chartAnalysisNotes: dbTrade.chart_analysis_notes || '',
  preMarketNotes: dbTrade.pre_market_notes || '',
  postMarketNotes: dbTrade.post_market_notes || '',
  strategy: dbTrade.strategy || undefined,
  category: (dbTrade.category as TradeCategory) || 'stocks',
  forecastId: dbTrade.forecast_id || undefined,
  followedRules: dbTrade.followed_rules ?? true,
  followedRulesList: dbTrade.followed_rules_list || [],
  brokenRules: dbTrade.broken_rules || [],
  notes: dbTrade.notes || '',
  mistakeTagging: dbTrade.mistake_tagging || '',
  mistakeTags: Array.isArray(dbTrade.mistake_tags) ? (dbTrade.mistake_tags as string[]) : [],
  hasNews: dbTrade.has_news ?? false,
  newsEvents: Array.isArray(dbTrade.news_events) ? (dbTrade.news_events as NewsEvent[]) : [],
  isPaperTrade: dbTrade.is_paper_trade ?? false,
  noTradeTaken: dbTrade.no_trade_taken ?? false,
  status: (dbTrade.status as TradeStatus) || 'closed',
  newsType: dbTrade.news_type || undefined,
  newsImpact: (dbTrade.news_impact as NewsImpact) || undefined,
  newsTime: dbTrade.news_time || undefined,
  createdAt: dbTrade.created_at,
  updatedAt: dbTrade.updated_at,
});

export function useTrades() {
  const { user } = useAuth();
  const { activeAccount, isSwitching } = useAccount();
  const { trades, tradesLoaded, currentAccountId, previousTrades, isTransitioning, setTrades, setCurrentAccountId, setTradesLoaded } = useDataStore();
  const hasFetchedRef = useRef(false);
  const recentlyUpdatedRef = useRef<Set<string>>(new Set());

  // Fetch trades from database for the active account - with fast retry logic
  const fetchTrades = useCallback(async (retryCount = 0, silent = false): Promise<void> => {
    if (!user) {
      setTrades([]);
      return;
    }

    const accountId = activeAccount?.id ?? null;

    try {
      // Optimized query - only select needed fields and use index hints via ordering
      let query = supabase
        .from('trades')
        .select('id,user_id,account_id,symbol,direction,date,entry_time,holding_time,lot_size,performance_grade,entry_price,stop_loss,stop_loss_pips,take_profit,risk_reward_ratio,pnl_amount,pnl_percentage,pre_market_plan,post_market_review,emotional_journal_before,emotional_journal_during,emotional_journal_after,overall_emotions,emotional_state,images,pre_market_images,post_market_images,chart_analysis_notes,pre_market_notes,post_market_notes,strategy,category,forecast_id,followed_rules,followed_rules_list,broken_rules,notes,mistake_tagging,mistake_tags,has_news,news_events,is_paper_trade,no_trade_taken,status,news_type,news_impact,news_time,created_at,updated_at')
        .eq('user_id', user.id);

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .limit(500); // Limit to prevent timeout on very large datasets

      if (error) {
        // If the session is fully expired the SDK will return a 401-style error.
        // Redirect to login rather than retrying indefinitely.
        if ((error as any).status === 401 || error.message?.toLowerCase().includes('jwt')) {
          console.debug('Auth error fetching trades, redirecting to login');
          await supabase.auth.signOut({ scope: 'local' });
          window.location.replace('/auth');
          return;
        }

        // Fast retry with minimal delays (100ms, 200ms, 400ms)
        if (retryCount < 3) {
          const delay = 100 * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchTrades(retryCount + 1, silent);
        }
        throw error;
      }

      const mappedTrades = (data || []).map(d => mapDbTradeToTrade(d as unknown as DbTrade));
      setTrades(mappedTrades);
      setCurrentAccountId(accountId ?? 'all');
    } catch (error) {
      console.error('Error fetching trades:', error);
      // Set empty trades so UI shows "No trades yet" instead of infinite loading
      setTrades([]);
      // Only show error toast on user-initiated refresh, not on initial load
      if (!silent) {
        toast.error('Failed to load trades. Please try again.');
      }
    }
  }, [user, activeAccount, setTrades, setCurrentAccountId]);

  // Return previous trades during transition for smooth crossfade
  // This prevents the "flash" when switching accounts
  const displayTrades = (isSwitching || isTransitioning) && previousTrades.length > 0 
    ? previousTrades 
    : trades;

  // Subscribe to realtime updates - only recreate channel when user changes
  useEffect(() => {
    if (!user) return;

    let refetchTimeout: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel(`trades-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Skip refetch if this trade was just updated optimistically
          const tradeId = payload.new?.id || payload.old?.id;
          if (tradeId && recentlyUpdatedRef.current.has(tradeId)) {
            // Remove from recently updated set after a longer delay to ensure data is fully synced
            setTimeout(() => recentlyUpdatedRef.current.delete(tradeId), 5000);
            return;
          }

          // Debounce refetch to allow optimistic updates to settle and database to process
          if (refetchTimeout) clearTimeout(refetchTimeout);
          refetchTimeout = setTimeout(() => {
            // Only refetch if we have an active account and not switching
            if (activeAccount && !isSwitching) {
              // Fetch with silent mode to not interrupt user
              fetchTrades(0, true);
            }
          }, 3000); // 3s debounce to reduce DB load and allow proper processing
        }
      )
      .subscribe();

    return () => {
      if (refetchTimeout) clearTimeout(refetchTimeout);
      supabase.removeChannel(channel);
    };
  }, [user?.id]); // Only depend on user.id to prevent channel recreation

  // Fetch trades immediately when account is available or changes
  useEffect(() => {
    if (!user) return;
    
    const accountId = activeAccount?.id ?? 'all';
    const accountChanged = currentAccountId !== accountId;

    // Fetch immediately without conditions - ensures data loads on first app open
    // Use silent mode on initial load to avoid flashing error messages
    if (!hasFetchedRef.current || !tradesLoaded || accountChanged) {
      hasFetchedRef.current = true;
      fetchTrades(0, true); // Silent initial fetch - retries happen automatically
    }
  }, [user?.id, activeAccount?.id, tradesLoaded, currentAccountId, fetchTrades, setTrades, setCurrentAccountId, setTradesLoaded]);

  // Add trade - automatically assigns to active account
  const addTrade = useCallback(async (tradeData: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast.error('Please log in to add trades');
      return null;
    }

    if (!activeAccount) {
      toast.error('Please select an account first');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          account_id: activeAccount.id,
          symbol: tradeData.symbol,
          direction: tradeData.direction,
          date: tradeData.date,
          entry_time: tradeData.entryTime,
          holding_time: tradeData.holdingTime,
          lot_size: tradeData.lotSize,
          performance_grade: tradeData.performanceGrade,
          entry_price: tradeData.entryPrice,
          stop_loss: tradeData.stopLoss,
          stop_loss_pips: tradeData.stopLossPips || null,
          take_profit: tradeData.takeProfit,
          risk_reward_ratio: tradeData.riskRewardRatio,
          pnl_amount: tradeData.pnlAmount,
          pnl_percentage: tradeData.pnlPercentage,
          pre_market_plan: tradeData.preMarketPlan,
          post_market_review: tradeData.postMarketReview,
          emotional_journal_before: tradeData.emotionalJournalBefore,
          emotional_journal_during: tradeData.emotionalJournalDuring,
          emotional_journal_after: tradeData.emotionalJournalAfter,
          overall_emotions: tradeData.overallEmotions || '',
          emotional_state: tradeData.emotionalState,
          images: tradeData.images,
          pre_market_images: tradeData.preMarketImages || [],
          post_market_images: tradeData.postMarketImages || [],
          chart_analysis_notes: tradeData.chartAnalysisNotes || '',
          pre_market_notes: tradeData.preMarketNotes || '',
          post_market_notes: tradeData.postMarketNotes || '',
          strategy: tradeData.strategy,
          category: tradeData.category || 'stocks',
          forecast_id: tradeData.forecastId || null,
          followed_rules: tradeData.followedRules ?? true,
          followed_rules_list: tradeData.followedRulesList || [],
          broken_rules: tradeData.brokenRules || [],
          notes: tradeData.notes || '',
          mistake_tagging: tradeData.mistakeTagging || '',
          mistake_tags: tradeData.mistakeTags || [],
          has_news: tradeData.hasNews ?? false,
          news_events: tradeData.newsEvents || [],
          is_paper_trade: tradeData.isPaperTrade ?? false,
          no_trade_taken: tradeData.noTradeTaken ?? false,
          status: tradeData.status || 'closed',
          news_type: tradeData.newsType || null,
          news_impact: tradeData.newsImpact || null,
          news_time: tradeData.newsTime || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Immediately update local state for instant UI update
      const newTrade = mapDbTradeToTrade(data as unknown as DbTrade);
      setTrades([newTrade, ...trades]);
      
      // Mark as recently updated to prevent real-time listener from overwriting it
      recentlyUpdatedRef.current.add(newTrade.id);
      setTimeout(() => recentlyUpdatedRef.current.delete(newTrade.id), 7000);

      return newTrade;
    } catch (error) {
      console.error('Error adding trade:', error);
      toast.error('Failed to add trade');
      return null;
    }
  }, [user, activeAccount, trades, setTrades]);

  // Update trade - with retry logic to handle timeouts
  const updateTrade = useCallback(async (id: string, updates: Partial<Trade>, retryCount = 0): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to update trades');
      return false;
    }

    // Optimistically update local state first for instant UI feedback
    const optimisticTrades = trades.map(trade => 
      trade.id === id 
        ? { ...trade, ...updates, updatedAt: new Date().toISOString() } 
        : trade
    );
    setTrades(optimisticTrades);
    
    // Mark this trade as recently updated to skip premature real-time refetch
    // Use a longer timeout to ensure the data is fully persisted
    recentlyUpdatedRef.current.add(id);
    // Clear the flag after a longer delay - 7 seconds to ensure data persistence
    setTimeout(() => recentlyUpdatedRef.current.delete(id), 7000);

    try {
      const updateData: Record<string, unknown> = {};
      
      if (updates.symbol !== undefined) updateData.symbol = updates.symbol;
      if (updates.direction !== undefined) updateData.direction = updates.direction;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.entryTime !== undefined) updateData.entry_time = updates.entryTime;
      if (updates.holdingTime !== undefined) updateData.holding_time = updates.holdingTime;
      if (updates.lotSize !== undefined) updateData.lot_size = updates.lotSize;
      if (updates.performanceGrade !== undefined) updateData.performance_grade = updates.performanceGrade;
      if (updates.entryPrice !== undefined) updateData.entry_price = updates.entryPrice;
      if (updates.stopLoss !== undefined) updateData.stop_loss = updates.stopLoss;
      if (updates.stopLossPips !== undefined) updateData.stop_loss_pips = updates.stopLossPips || null;
      if (updates.takeProfit !== undefined) updateData.take_profit = updates.takeProfit;
      if (updates.riskRewardRatio !== undefined) updateData.risk_reward_ratio = updates.riskRewardRatio;
      if (updates.pnlAmount !== undefined) updateData.pnl_amount = updates.pnlAmount;
      if (updates.pnlPercentage !== undefined) updateData.pnl_percentage = updates.pnlPercentage;
      if (updates.preMarketPlan !== undefined) updateData.pre_market_plan = updates.preMarketPlan;
      if (updates.postMarketReview !== undefined) updateData.post_market_review = updates.postMarketReview;
      if (updates.emotionalJournalBefore !== undefined) updateData.emotional_journal_before = updates.emotionalJournalBefore;
      if (updates.emotionalJournalDuring !== undefined) updateData.emotional_journal_during = updates.emotionalJournalDuring;
      if (updates.emotionalJournalAfter !== undefined) updateData.emotional_journal_after = updates.emotionalJournalAfter;
      if (updates.overallEmotions !== undefined) updateData.overall_emotions = updates.overallEmotions;
      if (updates.emotionalState !== undefined) updateData.emotional_state = updates.emotionalState;
      if (updates.images !== undefined) updateData.images = updates.images;
      if (updates.preMarketImages !== undefined) updateData.pre_market_images = updates.preMarketImages;
      if (updates.postMarketImages !== undefined) updateData.post_market_images = updates.postMarketImages;
      if (updates.chartAnalysisNotes !== undefined) updateData.chart_analysis_notes = updates.chartAnalysisNotes;
      if (updates.preMarketNotes !== undefined) updateData.pre_market_notes = updates.preMarketNotes;
      if (updates.postMarketNotes !== undefined) updateData.post_market_notes = updates.postMarketNotes;
      if (updates.strategy !== undefined) updateData.strategy = updates.strategy;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.forecastId !== undefined) updateData.forecast_id = updates.forecastId || null;
      if (updates.followedRules !== undefined) updateData.followed_rules = updates.followedRules;
      if (updates.followedRulesList !== undefined) updateData.followed_rules_list = updates.followedRulesList;
      if (updates.brokenRules !== undefined) updateData.broken_rules = updates.brokenRules;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.mistakeTagging !== undefined) updateData.mistake_tagging = updates.mistakeTagging;
      if (updates.mistakeTags !== undefined) updateData.mistake_tags = updates.mistakeTags;
      if (updates.hasNews !== undefined) updateData.has_news = updates.hasNews;
      if (updates.newsEvents !== undefined) updateData.news_events = updates.newsEvents;
      if (updates.isPaperTrade !== undefined) updateData.is_paper_trade = updates.isPaperTrade;
      if (updates.noTradeTaken !== undefined) updateData.no_trade_taken = updates.noTradeTaken;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.newsType !== undefined) updateData.news_type = updates.newsType || null;
      if (updates.newsImpact !== undefined) updateData.news_impact = updates.newsImpact || null;
      if (updates.newsTime !== undefined) updateData.news_time = updates.newsTime || null;
      
      const { error } = await supabase
        .from('trades')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        // Retry on timeout with exponential backoff (100ms, 200ms, 400ms)
        if (retryCount < 3) {
          const delay = 100 * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return updateTrade(id, updates, retryCount + 1);
        }
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating trade:', error);
      // Revert optimistic update on failure
      fetchTrades(0, true);
      toast.error('Failed to update trade');
      return false;
    }
  }, [user, trades, setTrades, fetchTrades]);

  // Delete trade
  const deleteTrade = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Please log in to delete trades');
      return false;
    }

    try {
      // Get trade data to check for images (for future storage cleanup)
      const tradeToDelete = trades.find(t => t.id === id);
      
      // Delete the trade from database
      // Note: Images are currently stored as base64 in the database columns
      // (images, preMarketImages, postMarketImages) and will be automatically
      // deleted with the trade row. If migrating to Supabase Storage buckets
      // in the future, add storage cleanup here before deleting the trade.
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Immediately update local state for instant UI update
      setTrades(trades.filter(trade => trade.id !== id));

      toast.success('Trade deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting trade:', error);
      toast.error('Failed to delete trade');
      return false;
    }
  }, [user, trades, setTrades]);

  // Duplicate trade
  const duplicateTrade = useCallback(async (id: string) => {
    const trade = trades.find(t => t.id === id);
    if (!trade) return null;

    const { id: _, createdAt, updatedAt, accountId, ...tradeData } = trade;
    return addTrade(tradeData);
  }, [trades, addTrade]);

  // Get trade by ID
  const getTrade = useCallback((id: string) => {
    return trades.find(t => t.id === id);
  }, [trades]);

  // Get trades by date
  const getTradesByDate = useCallback((date: string) => {
    return trades.filter(t => t.date === date);
  }, [trades]);

  // Get only real trades (excluding paper trades) for calculations
  const getRealTrades = useCallback(() => {
    return trades.filter(trade => !trade.isPaperTrade);
  }, [trades]);

  // PnL calculations - exclude paper trades and no trade taken
  const getDailyPnl = useCallback((date: string) => {
    return getTradesByDate(date)
      .filter(trade => !trade.isPaperTrade && !trade.noTradeTaken)
      .reduce((sum, trade) => sum + trade.pnlAmount, 0);
  }, [getTradesByDate]);

  const getWeeklyPnl = useCallback((startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return trades
      .filter(trade => {
        if (trade.isPaperTrade || trade.noTradeTaken) return false;
        const tradeDate = new Date(trade.date);
        return tradeDate >= start && tradeDate < end;
      })
      .reduce((sum, trade) => sum + trade.pnlAmount, 0);
  }, [trades]);

  const getMonthlyPnl = useCallback((year: number, month: number) => {
    return trades
      .filter(trade => {
        if (trade.isPaperTrade || trade.noTradeTaken) return false;
        const tradeDate = new Date(trade.date);
        return tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
      })
      .reduce((sum, trade) => sum + trade.pnlAmount, 0);
  }, [trades]);

  const getYearlyPnl = useCallback((year: number) => {
    return trades
      .filter(trade => {
        if (trade.isPaperTrade || trade.noTradeTaken) return false;
        const tradeDate = new Date(trade.date);
        return tradeDate.getFullYear() === year;
      })
      .reduce((sum, trade) => sum + trade.pnlAmount, 0);
  }, [trades]);

  const getTotalPnl = useCallback(() => {
    return trades
      .filter(trade => !trade.isPaperTrade && !trade.noTradeTaken)
      .reduce((sum, trade) => sum + trade.pnlAmount, 0);
  }, [trades]);

  return {
    trades: displayTrades,
    // Expose displayTrades separately for components that need stable values during account switching
    displayTrades,
    isLoading: !tradesLoaded,
    addTrade,
    updateTrade,
    deleteTrade,
    duplicateTrade,
    getTrade,
    getTradesByDate,
    getDailyPnl,
    getWeeklyPnl,
    getMonthlyPnl,
    getYearlyPnl,
    getTotalPnl,
    getRealTrades,
    refetch: () => fetchTrades(0, false), // User-initiated refetch shows errors
  };
}