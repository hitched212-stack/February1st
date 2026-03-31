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

const isMissingColumnError = (error: unknown): boolean => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() || '';
  return message.includes('column') && message.includes('does not exist');
};

const isStatementTimeoutError = (error: unknown): boolean => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() || '';
  return message.includes('cancelling statement due to timeout') || message.includes('statement timeout') || message.includes('canceling statement due to statement timeout');
};

const isNetworkLoadError = (error: unknown): boolean => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() || '';
  return message.includes('load failed') || message.includes('failed to fetch') || message.includes('networkerror');
};

const areValuesEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;

  // Handle nullish checks early
  if ((left == null) !== (right == null)) return false;

  // Handle arrays/objects with stable structural comparison
  if (typeof left === 'object' && typeof right === 'object') {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch {
      return false;
    }
  }

  return false;
};

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

const getLegacyPersistedTrades = (activeAccountId?: string): Trade[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem('trade-log-storage');
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const legacyTrades = Array.isArray(parsed?.state?.trades) ? parsed.state.trades : [];

    return legacyTrades.map((t: Partial<Trade>, index: number): Trade => ({
      id: String(t.id ?? `legacy-${index}`),
      accountId: t.accountId || activeAccountId,
      symbol: t.symbol || '',
      direction: (t.direction as TradeDirection) || 'long',
      date: t.date || new Date().toISOString().split('T')[0],
      entryTime: t.entryTime || '00:00',
      holdingTime: t.holdingTime || '',
      lotSize: Number(t.lotSize || 0),
      performanceGrade: (Math.min(3, Number(t.performanceGrade || 3)) as 1 | 2 | 3),
      entryPrice: Number(t.entryPrice || 0),
      stopLoss: Number(t.stopLoss || 0),
      stopLossPips: t.stopLossPips,
      takeProfit: Number(t.takeProfit || 0),
      riskRewardRatio: t.riskRewardRatio || '',
      pnlAmount: Number(t.pnlAmount || 0),
      pnlPercentage: Number(t.pnlPercentage || 0),
      preMarketPlan: t.preMarketPlan || '',
      postMarketReview: t.postMarketReview || '',
      emotionalJournalBefore: t.emotionalJournalBefore || '',
      emotionalJournalDuring: t.emotionalJournalDuring || '',
      emotionalJournalAfter: t.emotionalJournalAfter || '',
      overallEmotions: t.overallEmotions || '',
      emotionalState: Number(t.emotionalState || 3),
      images: Array.isArray(t.images) ? t.images : [],
      preMarketImages: Array.isArray(t.preMarketImages) ? t.preMarketImages : [],
      postMarketImages: Array.isArray(t.postMarketImages) ? t.postMarketImages : [],
      chartAnalysisNotes: t.chartAnalysisNotes || '',
      preMarketNotes: t.preMarketNotes || '',
      postMarketNotes: t.postMarketNotes || '',
      strategy: t.strategy,
      category: t.category || 'stocks',
      forecastId: t.forecastId,
      followedRules: t.followedRules ?? true,
      followedRulesList: Array.isArray(t.followedRulesList) ? t.followedRulesList : [],
      brokenRules: Array.isArray(t.brokenRules) ? t.brokenRules : [],
      notes: t.notes || '',
      mistakeTagging: t.mistakeTagging || '',
      mistakeTags: Array.isArray(t.mistakeTags) ? t.mistakeTags : [],
      hasNews: t.hasNews ?? false,
      newsEvents: Array.isArray(t.newsEvents) ? t.newsEvents : [],
      isPaperTrade: t.isPaperTrade ?? false,
      noTradeTaken: t.noTradeTaken ?? false,
      status: t.status || 'closed',
      newsType: t.newsType,
      newsImpact: t.newsImpact,
      newsTime: t.newsTime,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
};

export function useTrades() {
  const { user } = useAuth();
  const { activeAccount, accounts, isSwitching, setActiveAccount } = useAccount();
  const { trades, tradesLoaded, currentAccountId, previousTrades, isTransitioning, setTrades, setCurrentAccountId, setTradesLoaded } = useDataStore();
  const hasFetchedRef = useRef(false);
  const recentlyUpdatedRef = useRef<Set<string>>(new Set());
  const hasShownLoadErrorRef = useRef(false);

  // Fetch trades from database for the active account - with fast retry logic
  const fetchTrades = useCallback(async (retryCount = 0, silent = false): Promise<void> => {
    if (!user) {
      setTrades([]);
      return;
    }

    const accountId = activeAccount?.id ?? null;
    const knownAccountIds = new Set(accounts.map(a => a.id));

    try {
      // Optimized query - only select needed fields and use index hints via ordering
      let query = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id);

      let data: any[] | null = null;
      let error: any = null;

      try {
        const primaryResult = await query
          .order('date', { ascending: false })
          .limit(200); // Keep payload bounded

        data = primaryResult.data;
        error = primaryResult.error;
      } catch (primaryError) {
        // Browser/network-level fetch failure: retry with lightweight projection
        if (isNetworkLoadError(primaryError)) {
          const lightResult = await supabase
            .from('trades')
            .select('id,user_id,account_id,symbol,direction,date,entry_time,holding_time,lot_size,performance_grade,entry_price,stop_loss,stop_loss_pips,take_profit,risk_reward_ratio,pnl_amount,pnl_percentage,strategy,category,is_paper_trade,no_trade_taken,status,created_at,updated_at')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(100);

          data = lightResult.data;
          error = lightResult.error;
        } else {
          throw primaryError;
        }
      }

      // Fallback for large datasets/rows: retry with a lightweight projection
      if (error && isStatementTimeoutError(error)) {
        const lightResult = await supabase
          .from('trades')
          .select('id,user_id,account_id,symbol,direction,date,entry_time,holding_time,lot_size,performance_grade,entry_price,stop_loss,stop_loss_pips,take_profit,risk_reward_ratio,pnl_amount,pnl_percentage,strategy,category,is_paper_trade,no_trade_taken,status,created_at,updated_at')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(100);

        data = lightResult.data;
        error = lightResult.error;
      }

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

      const existingTradesById = new Map(trades.map((t) => [t.id, t]));

      const mappedTrades = (data || []).map(d => {
        const mapped = mapDbTradeToTrade(d as unknown as DbTrade);
        const existing = existingTradesById.get(mapped.id);

        const mergedMediaTrade = {
          ...mapped,
          images: mapped.images.length > 0 ? mapped.images : (existing?.images || []),
          preMarketImages: mapped.preMarketImages.length > 0 ? mapped.preMarketImages : (existing?.preMarketImages || []),
          postMarketImages: mapped.postMarketImages.length > 0 ? mapped.postMarketImages : (existing?.postMarketImages || []),
          chartAnalysisNotes: mapped.chartAnalysisNotes || existing?.chartAnalysisNotes || '',
          preMarketNotes: mapped.preMarketNotes || existing?.preMarketNotes || '',
          postMarketNotes: mapped.postMarketNotes || existing?.postMarketNotes || '',
        };

        // Legacy compatibility: some older databases don't have account_id on trades.
        // In that case, bind the trade to the currently active account so account-scoped
        // dashboard views can still render historical data.
        if (!mergedMediaTrade.accountId && activeAccount?.id) {
          return { ...mergedMediaTrade, accountId: activeAccount.id };
        }
        // If a trade points to an account that isn't in the current user's account list,
        // attach it to the active account so it remains visible instead of being filtered out.
        if (mergedMediaTrade.accountId && !knownAccountIds.has(mergedMediaTrade.accountId) && activeAccount?.id) {
          return { ...mergedMediaTrade, accountId: activeAccount.id };
        }
        return mergedMediaTrade;
      });

      // Recovery path: if current account returns no trades, but the user has trades in
      // another account, auto-switch to that account so dashboard isn't stuck empty.
      if (accountId && mappedTrades.length === 0) {
        const fallbackResult = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(500);

        if (!fallbackResult.error && (fallbackResult.data?.length || 0) > 0) {
          const fallbackMappedTrades = (fallbackResult.data || []).map(d => {
            const mapped = mapDbTradeToTrade(d as unknown as DbTrade);
            if (!mapped.accountId && activeAccount?.id) {
              return { ...mapped, accountId: activeAccount.id };
            }
            return mapped;
          });

          const accountsWithTrades = new Set(
            fallbackMappedTrades
              .map(t => t.accountId)
              .filter((id): id is string => Boolean(id))
          );

          const fallbackAccount = accounts.find(a => a.id !== accountId && accountsWithTrades.has(a.id));
          if (fallbackAccount) {
            setActiveAccount(fallbackAccount);
          }

          setTrades(fallbackMappedTrades);
          setCurrentAccountId(accountId ?? 'all');
          return;
        }
      }

      // Final fallback: if backend is empty, restore legacy locally persisted trades.
      if (mappedTrades.length === 0) {
        const legacyTrades = getLegacyPersistedTrades(activeAccount?.id);
        if (legacyTrades.length > 0) {
          setTrades(legacyTrades);
          setCurrentAccountId(accountId ?? 'all');
          toast.success('Loaded trades from local backup');
          return;
        }
      }

      setTrades(mappedTrades);
      setCurrentAccountId(accountId ?? 'all');
    } catch (error) {
      console.error('Error fetching trades:', error);
      // Set empty trades so UI shows "No trades yet" instead of infinite loading
      setTrades([]);
      const errorMessage = (error as { message?: string } | null)?.message || 'Unknown error';
      // Show once even in silent mode so backend communication issues aren't hidden
      if (!silent || !hasShownLoadErrorRef.current) {
        hasShownLoadErrorRef.current = true;
        const isTradeFormRoute =
          typeof window !== 'undefined' &&
          (window.location.pathname === '/add' || window.location.pathname.startsWith('/edit'));

        if (isTradeFormRoute && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('trade-form-card-toast', {
              detail: {
                title: 'Failed to load trades',
                description: errorMessage,
                variant: 'error',
              },
            })
          );
        } else {
          toast.error(`Failed to load trades: ${errorMessage}`);
        }
      }
    }
  }, [user, activeAccount, accounts, trades, setActiveAccount, setTrades, setCurrentAccountId]);

  // Return previous trades during transition for smooth crossfade
  // This prevents the "flash" when switching accounts
  const displayTrades = (isSwitching || isTransitioning) && previousTrades.length > 0 
    ? previousTrades 
    : trades;

  // Subscribe to realtime updates - only recreate channel when user changes
  useEffect(() => {
    if (!user) return;

    let refetchTimeout: NodeJS.Timeout | null = null;
    let healthCheckTimeout: NodeJS.Timeout | null = null;
    let subscriptionStatus: 'SUBSCRIBED' | 'CLOSED' = 'CLOSED';

    const channel = supabase
      .channel(`trades-${user.id}`, { config: { broadcast: { self: true } } })
      .on('subscribe', () => {
        subscriptionStatus = 'SUBSCRIBED';
      })
      .on('system', { event: 'postgres_changes' }, () => {
        subscriptionStatus = 'SUBSCRIBED';
      })
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
          }, 1000); // Reduced to 1s for faster updates - DB batching is handled server-side
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscriptionStatus = 'SUBSCRIBED';
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          subscriptionStatus = 'CLOSED';
          // Attempt to resubscribe on error
          setTimeout(() => {
            channel.subscribe();
          }, 2000);
        }
      });

    // Health check: if subscription seems dead, force a refetch
    const startHealthCheck = () => {
      if (healthCheckTimeout) clearTimeout(healthCheckTimeout);
      healthCheckTimeout = setTimeout(() => {
        if (tradesLoaded && user && activeAccount && !isSwitching) {
          // Do a silent refetch to ensure data is fresh
          fetchTrades(0, true);
          startHealthCheck(); // Restart the health check
        }
      }, 30000); // Check every 30 seconds
    };
    
    startHealthCheck();

    return () => {
      if (refetchTimeout) clearTimeout(refetchTimeout);
      if (healthCheckTimeout) clearTimeout(healthCheckTimeout);
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

  // Refetch trades when app becomes visible (user returns from another tab/app)
  useEffect(() => {
    if (!user || !activeAccount) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App just became visible - refresh trades to catch any missed updates
        console.debug('App became visible, refreshing trades');
        fetchTrades(0, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, activeAccount, fetchTrades]);

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

    const nowIso = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticTrade: Trade = {
      ...tradeData,
      id: tempId,
      accountId: activeAccount.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Optimistic UI update first so the form can close instantly
    setTrades([optimisticTrade, ...trades]);

    (async () => {
      try {
        const insertPayload = {
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
      };

        let { data, error } = await supabase
          .from('trades')
          .insert(insertPayload as any)
          .select()
          .single();

        // Backward-compatible fallback for projects where newer columns are not migrated yet
        if (error && isMissingColumnError(error)) {
          const fallbackPayload = {
            user_id: user.id,
            symbol: tradeData.symbol,
            direction: tradeData.direction,
            date: tradeData.date,
            entry_time: tradeData.entryTime,
            holding_time: tradeData.holdingTime,
            lot_size: tradeData.lotSize,
            performance_grade: tradeData.performanceGrade,
            entry_price: tradeData.entryPrice,
            stop_loss: tradeData.stopLoss,
            take_profit: tradeData.takeProfit,
            risk_reward_ratio: tradeData.riskRewardRatio,
            pnl_amount: tradeData.pnlAmount,
            pnl_percentage: tradeData.pnlPercentage,
            pre_market_plan: tradeData.preMarketPlan,
            post_market_review: tradeData.postMarketReview,
            emotional_journal_before: tradeData.emotionalJournalBefore,
            emotional_journal_during: tradeData.emotionalJournalDuring,
            emotional_journal_after: tradeData.emotionalJournalAfter,
            images: tradeData.images,
            strategy: tradeData.strategy,
          };

          const fallbackResult = await supabase
            .from('trades')
            .insert(fallbackPayload as any)
            .select()
            .single();

          data = fallbackResult.data;
          error = fallbackResult.error;
        }

        if (error) throw error;

        const mappedNewTrade = mapDbTradeToTrade(data as unknown as DbTrade);
        const newTrade = !mappedNewTrade.accountId && activeAccount?.id
          ? { ...mappedNewTrade, accountId: activeAccount.id }
          : mappedNewTrade;

        // Replace optimistic trade with persisted trade
        setTrades([
          newTrade,
          ...trades.filter(trade => trade.id !== tempId),
        ]);

        // Mark as recently updated to prevent real-time listener from overwriting it
        recentlyUpdatedRef.current.add(newTrade.id);
        setTimeout(() => recentlyUpdatedRef.current.delete(newTrade.id), 7000);
      } catch (error) {
        console.error('Error adding trade:', error);
        // Revert optimistic insert on failure
        setTrades(trades.filter(trade => trade.id !== tempId));
        toast.error('Failed to add trade');
      }
    })();

    return optimisticTrade;
  }, [user, activeAccount, trades, setTrades]);

  // Update trade - optimistic local update first, persist in background
  const updateTrade = useCallback(async (id: string, updates: Partial<Trade>): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to update trades');
      return false;
    }

    const existingTrade = trades.find(trade => trade.id === id);
    const shouldUpdateField = <K extends keyof Trade>(key: K, value: Trade[K] | undefined) => {
      if (value === undefined) return false;
      if (!existingTrade) return true;
      return !areValuesEqual(existingTrade[key], value);
    };

    const updateData: Record<string, unknown> = {};

    if (shouldUpdateField('symbol', updates.symbol)) updateData.symbol = updates.symbol;
    if (shouldUpdateField('direction', updates.direction)) updateData.direction = updates.direction;
    if (shouldUpdateField('date', updates.date)) updateData.date = updates.date;
    if (shouldUpdateField('entryTime', updates.entryTime)) updateData.entry_time = updates.entryTime;
    if (shouldUpdateField('holdingTime', updates.holdingTime)) updateData.holding_time = updates.holdingTime;
    if (shouldUpdateField('lotSize', updates.lotSize)) updateData.lot_size = updates.lotSize;
    if (shouldUpdateField('performanceGrade', updates.performanceGrade)) updateData.performance_grade = updates.performanceGrade;
    if (shouldUpdateField('entryPrice', updates.entryPrice)) updateData.entry_price = updates.entryPrice;
    if (shouldUpdateField('stopLoss', updates.stopLoss)) updateData.stop_loss = updates.stopLoss;
    if (shouldUpdateField('stopLossPips', updates.stopLossPips)) updateData.stop_loss_pips = updates.stopLossPips || null;
    if (shouldUpdateField('takeProfit', updates.takeProfit)) updateData.take_profit = updates.takeProfit;
    if (shouldUpdateField('riskRewardRatio', updates.riskRewardRatio)) updateData.risk_reward_ratio = updates.riskRewardRatio;
    if (shouldUpdateField('pnlAmount', updates.pnlAmount)) updateData.pnl_amount = updates.pnlAmount;
    if (shouldUpdateField('pnlPercentage', updates.pnlPercentage)) updateData.pnl_percentage = updates.pnlPercentage;
    if (shouldUpdateField('preMarketPlan', updates.preMarketPlan)) updateData.pre_market_plan = updates.preMarketPlan;
    if (shouldUpdateField('postMarketReview', updates.postMarketReview)) updateData.post_market_review = updates.postMarketReview;
    if (shouldUpdateField('emotionalJournalBefore', updates.emotionalJournalBefore)) updateData.emotional_journal_before = updates.emotionalJournalBefore;
    if (shouldUpdateField('emotionalJournalDuring', updates.emotionalJournalDuring)) updateData.emotional_journal_during = updates.emotionalJournalDuring;
    if (shouldUpdateField('emotionalJournalAfter', updates.emotionalJournalAfter)) updateData.emotional_journal_after = updates.emotionalJournalAfter;
    if (shouldUpdateField('overallEmotions', updates.overallEmotions)) updateData.overall_emotions = updates.overallEmotions;
    if (shouldUpdateField('emotionalState', updates.emotionalState)) updateData.emotional_state = updates.emotionalState;
    if (shouldUpdateField('images', updates.images)) updateData.images = updates.images;
    if (shouldUpdateField('preMarketImages', updates.preMarketImages)) updateData.pre_market_images = updates.preMarketImages;
    if (shouldUpdateField('postMarketImages', updates.postMarketImages)) updateData.post_market_images = updates.postMarketImages;
    if (shouldUpdateField('chartAnalysisNotes', updates.chartAnalysisNotes)) updateData.chart_analysis_notes = updates.chartAnalysisNotes;
    if (shouldUpdateField('preMarketNotes', updates.preMarketNotes)) updateData.pre_market_notes = updates.preMarketNotes;
    if (shouldUpdateField('postMarketNotes', updates.postMarketNotes)) updateData.post_market_notes = updates.postMarketNotes;
    if (shouldUpdateField('strategy', updates.strategy)) updateData.strategy = updates.strategy;
    if (shouldUpdateField('category', updates.category)) updateData.category = updates.category;
    if (shouldUpdateField('forecastId', updates.forecastId)) updateData.forecast_id = updates.forecastId || null;
    if (shouldUpdateField('followedRules', updates.followedRules)) updateData.followed_rules = updates.followedRules;
    if (shouldUpdateField('followedRulesList', updates.followedRulesList)) updateData.followed_rules_list = updates.followedRulesList;
    if (shouldUpdateField('brokenRules', updates.brokenRules)) updateData.broken_rules = updates.brokenRules;
    if (shouldUpdateField('notes', updates.notes)) updateData.notes = updates.notes;
    if (shouldUpdateField('mistakeTagging', updates.mistakeTagging)) updateData.mistake_tagging = updates.mistakeTagging;
    if (shouldUpdateField('mistakeTags', updates.mistakeTags)) updateData.mistake_tags = updates.mistakeTags;
    if (shouldUpdateField('hasNews', updates.hasNews)) updateData.has_news = updates.hasNews;
    if (shouldUpdateField('newsEvents', updates.newsEvents)) updateData.news_events = updates.newsEvents;
    if (shouldUpdateField('isPaperTrade', updates.isPaperTrade)) updateData.is_paper_trade = updates.isPaperTrade;
    if (shouldUpdateField('noTradeTaken', updates.noTradeTaken)) updateData.no_trade_taken = updates.noTradeTaken;
    if (shouldUpdateField('status', updates.status)) updateData.status = updates.status;
    if (shouldUpdateField('newsType', updates.newsType)) updateData.news_type = updates.newsType || null;
    if (shouldUpdateField('newsImpact', updates.newsImpact)) updateData.news_impact = updates.newsImpact || null;
    if (shouldUpdateField('newsTime', updates.newsTime)) updateData.news_time = updates.newsTime || null;

    // No-op update: avoid a network request and finish immediately.
    if (Object.keys(updateData).length === 0) {
      return true;
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

    (async () => {
      try {
        let lastError: unknown = null;

        for (let attempt = 0; attempt <= 3; attempt++) {
          const { error } = await supabase
            .from('trades')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id);

          if (!error) {
            return;
          }

          lastError = error;

          if (attempt < 3) {
            const delay = 100 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        throw lastError;
      } catch (error) {
        console.error('Error updating trade:', error);
        // Revert optimistic update on failure
        fetchTrades(0, true);
        toast.error('Failed to update trade');
      }
    })();

    return true;
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