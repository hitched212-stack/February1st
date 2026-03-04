export type TradeDirection = 'long' | 'short';
export type TradeCategory = 'stocks' | 'futures' | 'forex' | 'crypto' | 'options';
export type TradeStatus = 'open' | 'closed';
export type Currency = 'USD' | 'GBP' | 'EUR' | 'JPY' | 'CHF' | 'AUD' | 'CAD' | 'NZD';

export const TRADE_CATEGORIES: { value: TradeCategory; label: string }[] = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'futures', label: 'Futures' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'options', label: 'Options' },
];

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CHF', label: 'Swiss Franc', symbol: 'Fr' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
];

export const getCurrencySymbol = (currency: Currency): string => {
  return CURRENCIES.find(c => c.value === currency)?.symbol || '$';
};

export type NewsImpact = 'high' | 'medium' | 'low';

export interface NewsEvent {
  id: string;
  type: string;
  impact: NewsImpact | '';
  time: string;
  currency?: string;
}

export const NEWS_IMPACTS: { value: NewsImpact; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-red-500' },
  { value: 'medium', label: 'Medium', color: 'text-orange-500' },
  { value: 'low', label: 'Low', color: 'text-yellow-500' },
];

export interface Trade {
  id: string;
  accountId?: string;
  symbol: string;
  direction: TradeDirection;
  date: string; // ISO date string
  entryTime: string;
  holdingTime: string;
  lotSize: number;
  performanceGrade: 1 | 2 | 3;
  entryPrice: number;
  stopLoss: number;
  stopLossPips?: number;
  takeProfit: number;
  riskRewardRatio: string;
  pnlAmount: number;
  pnlPercentage: number;
  preMarketPlan: string;
  postMarketReview: string;
  emotionalJournalBefore: string;
  emotionalJournalDuring: string;
  emotionalJournalAfter: string;
  overallEmotions?: string;
  emotionalState: number;
  images: string[];
  preMarketImages?: string[];
  postMarketImages?: string[];
  chartAnalysisNotes?: string;
  preMarketNotes?: string;
  postMarketNotes?: string;
  strategy?: string;
  category?: TradeCategory;
  forecastId?: string;
  followedRules?: boolean;
  followedRulesList?: string[];
  brokenRules?: string[];
  notes?: string;
  mistakeTagging?: string;
  mistakeTags?: string[];
  hasNews?: boolean;
  newsEvents?: NewsEvent[];
  isPaperTrade?: boolean;
  noTradeTaken?: boolean;
  status?: TradeStatus;
  // Legacy fields for backward compatibility
  newsType?: string;
  newsImpact?: NewsImpact;
  newsTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalFilters {
  dateFrom?: string;
  dateTo?: string;
  symbol?: string;
  strategy?: string;
  outcome?: 'win' | 'loss' | 'all';
}

export interface PnlGoals {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface AppSettings {
  currency: Currency;
  goals: PnlGoals;
  accountBalance?: number;
}

export interface TradeFormData extends Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> {}
