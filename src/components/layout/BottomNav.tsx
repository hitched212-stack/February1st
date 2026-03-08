import { NavLink, useLocation } from 'react-router-dom';
import { Plus, User, Menu, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { usePreferences } from '@/hooks/usePreferences';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useEffect } from 'react';

// Custom 4-dot grid icon - filled rectangles matching sidebar
const GridDotsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </svg>
);

// Custom calendar icon - thin stroke style matching main nav
const CalendarIcon = ({ className, strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Custom news/globe icon - filled matching sidebar
const NewsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

// Custom AI Coach icon - Chat bubbles icon
const AIIcon = ({ className, strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="9" cy="10" r="0.5" fill="currentColor" />
    <circle cx="12" cy="10" r="0.5" fill="currentColor" />
    <circle cx="15" cy="10" r="0.5" fill="currentColor" />
  </svg>
);

// Custom analytics icon - filled bar chart matching sidebar
const AnalyticsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 20q-.425 0-.712-.288T16 19v-5q0-.425.288-.712T17 13h2q.425 0 .713.288T20 14v5q0 .425-.288.713T19 20zm-6 0q-.425 0-.712-.288T10 19V5q0-.425.288-.712T11 4h2q.425 0 .713.288T14 5v14q0 .425-.288.713T13 20zm-6 0q-.425 0-.712-.288T4 19v-9q0-.425.288-.712T5 9h2q.425 0 .713.288T8 10v9q0 .425-.288.713T7 20z"/>
  </svg>
);

// Custom backtesting icon - filled rewind matching sidebar
const BacktestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11 5L3 11l8 6v-6l8-6-8 6v-6z"/>
    <path d="M21 5L13 11l8 6v-12z"/>
    <rect x="2" y="5" width="2" height="12" fill="currentColor"/>
  </svg>
);

// Custom playbook icon - filled book matching sidebar
const PlaybookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 8h6v2H9V8zm0 4h6v2H9v-2z"/>
  </svg>
);

// Custom history icon - filled clock matching sidebar
const HistoryIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
  </svg>
);

// Custom trading rules icon - filled checklist matching sidebar
const TradingRulesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8.29 13.29L6.7 12.3a.996.996 0 111.41-1.41L10.7 13.3l5.18-5.19a.996.996 0 111.41 1.41l-5.88 5.88a.996.996 0 01-1.41 0z"/>
  </svg>
);

// Custom goals icon - target matching sidebar
const GoalsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
  </svg>
);

// Custom timeframes icon - filled clock matching sidebar
const TimeframesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
  </svg>
);

export function BottomNav() {
  const location = useLocation();
  const scrollDirection = useScrollDirection();
  const { preferences, setTheme } = usePreferences();
  const [moreOpen, setMoreOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const isMoreActive = ['/settings', '/news', '/coach', '/backtesting', '/playbook', '/settings/rules', '/settings/goals', '/settings/timeframes'].includes(location.pathname) || (location.pathname.startsWith('/settings/') && !['/settings/rules', '/settings/goals', '/settings/timeframes'].includes(location.pathname));

  const isDashboardActive = location.pathname === '/dashboard';
  const isHistoryActive = location.pathname === '/history';
  const isAnalyticsActive = location.pathname === '/analytics';
  const isMoreTabActive = moreOpen || isMoreActive;
  const activeTabClasses = 'gap-2 w-[128px] bg-gradient-to-r from-violet-600 to-[#9b8cff] text-white scale-100';
  const moreActiveTabClasses = 'gap-2 w-[104px] bg-gradient-to-r from-violet-600 to-[#9b8cff] text-white scale-100';
  const inactiveTabClasses = 'w-11 justify-center text-white/75 scale-[0.985]';
  const tabTransitionClasses = 'transform-gpu will-change-[width,transform,opacity] transition-[width,background-color,color,box-shadow,transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none';
  
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Hide navigation when on add trade or edit trade pages
  const isTradeFormPage = location.pathname === '/add' || location.pathname.startsWith('/edit');
  if (isTradeFormPage) {
    return null;
  }

  return (
    <nav 
      className={cn(
        'fixed bottom-4 left-3 right-3 z-50 md:hidden transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
        scrollDirection === 'down' ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100',
        !hasAnimated && 'translate-y-24 opacity-0'
      )}
    >
      <div className="relative mx-auto max-w-md">
        <div 
          className="relative flex h-[62px] items-center justify-between gap-1 pl-2 pr-3 rounded-[22px] bg-zinc-900/95 dark:bg-zinc-950/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden"
        >
          <div className="absolute top-[1px] left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          
          {/* Dashboard */}
          <NavLink 
            to="/dashboard" 
            className="relative z-10"
          >
            <div className={cn(
              "relative flex h-11 items-center rounded-full px-3",
              tabTransitionClasses,
              isDashboardActive
                ? activeTabClasses
                : inactiveTabClasses
            )}>
              <GridDotsIcon 
                className={cn(
                  'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  isDashboardActive ? 'h-[18px] w-[18px]' : 'h-[17px] w-[17px]'
                )} 
              />
              <span className={cn(
                'text-sm font-semibold whitespace-nowrap overflow-hidden',
                'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
                isDashboardActive ? 'max-w-[96px] opacity-100 translate-x-0' : 'max-w-0 opacity-0 -translate-x-1'
              )}>Dashboard</span>
            </div>
          </NavLink>
          
          {/* History */}
          <NavLink 
            to="/history" 
            className="relative z-10"
          >
            <div className={cn(
              "relative flex h-11 items-center rounded-full px-3",
              tabTransitionClasses,
              isHistoryActive
                ? activeTabClasses
                : inactiveTabClasses
            )}>
              <HistoryIcon 
                className={cn(
                  'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  isHistoryActive ? 'h-[18px] w-[18px]' : 'h-[17px] w-[17px]'
                )} 
              />
              <span className={cn(
                'text-sm font-semibold whitespace-nowrap overflow-hidden',
                'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
                isHistoryActive ? 'max-w-[64px] opacity-100 translate-x-0' : 'max-w-0 opacity-0 -translate-x-1'
              )}>History</span>
            </div>
          </NavLink>

          {/* Add */}
          <NavLink 
            to="/add" 
            className="relative z-10"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#a89dff] to-[#8b7ae0] shadow-[0_4px_16px_rgba(139,122,224,0.3)] transition-all duration-200 active:scale-95">
              <Plus className="h-5 w-5 text-white" strokeWidth={2.6} />
            </div>
          </NavLink>

          {/* Analytics */}
          <NavLink 
            to="/analytics" 
            className="relative z-10"
          >
            <div className={cn(
              "relative flex h-11 items-center rounded-full px-3",
              tabTransitionClasses,
              isAnalyticsActive
                ? activeTabClasses
                : inactiveTabClasses
            )}>
              <AnalyticsIcon 
                className={cn(
                  'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  isAnalyticsActive ? 'h-[18px] w-[18px]' : 'h-[17px] w-[17px]'
                )} 
              />
              <span className={cn(
                'text-sm font-semibold whitespace-nowrap overflow-hidden',
                'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
                isAnalyticsActive ? 'max-w-[72px] opacity-100 translate-x-0' : 'max-w-0 opacity-0 -translate-x-1'
              )}>Analytics</span>
            </div>
          </NavLink>

          {/* More Menu */}
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <button className="relative z-10">
                <div className={cn(
                  "relative flex h-11 items-center rounded-full px-3",
                  tabTransitionClasses,
                  isMoreTabActive
                    ? moreActiveTabClasses
                    : inactiveTabClasses
                )}>
                  <Menu 
                    className={cn(
                      'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      isMoreTabActive ? 'h-[18px] w-[18px]' : 'h-[17px] w-[17px]'
                    )} 
                    strokeWidth={1.8}
                  />
                  <span className={cn(
                    'text-sm font-semibold whitespace-nowrap overflow-hidden',
                    'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    isMoreTabActive ? 'max-w-[44px] opacity-100 translate-x-0' : 'max-w-0 opacity-0 -translate-x-1'
                  )}>More</span>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              side="top" 
              align="end" 
              sideOffset={12}
              className="w-52 p-2 bg-background/95 dark:bg-black/90 backdrop-blur-2xl border border-border/50 shadow-2xl rounded-3xl"
            >
              <div className="flex flex-col gap-0.5">
                <NavLink 
                  to="/settings" 
                  onClick={() => setMoreOpen(false)} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:bg-foreground/[0.08]"
                  style={{ backgroundColor: location.pathname === '/settings' && !location.pathname.includes('/settings/') ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <User className={cn('h-5 w-5', location.pathname === '/settings' && !location.pathname.includes('/settings/') ? 'text-foreground' : 'text-muted-foreground')} strokeWidth={1.5} />
                  <span className={cn('text-sm', location.pathname === '/settings' && !location.pathname.includes('/settings/') ? 'text-foreground' : 'text-muted-foreground')}>Profile</span>
                </NavLink>
                <NavLink 
                  to="/news" 
                  onClick={() => setMoreOpen(false)} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:bg-foreground/[0.08]"
                  style={{ backgroundColor: location.pathname === '/news' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <NewsIcon className={cn('h-5 w-5', location.pathname === '/news' ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className={cn('text-sm', location.pathname === '/news' ? 'text-foreground' : 'text-muted-foreground')}>News</span>
                </NavLink>
                
                {/* Divider */}
                <div className="h-px bg-border/50 my-1" />
                
                <NavLink 
                  to="/coach"
                  onClick={() => setMoreOpen(false)} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:bg-foreground/[0.08]"
                  style={{ backgroundColor: location.pathname === '/coach' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <AIIcon className={cn('h-5 w-5', location.pathname === '/coach' ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className={cn('text-sm', location.pathname === '/coach' ? 'text-foreground' : 'text-muted-foreground')}>AI Coach</span>
                </NavLink>
                <NavLink 
                  to="/backtesting" 
                  onClick={() => setMoreOpen(false)} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:bg-foreground/[0.08]"
                  style={{ backgroundColor: location.pathname === '/backtesting' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <BacktestIcon className={cn('h-5 w-5', location.pathname === '/backtesting' ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className={cn('text-sm', location.pathname === '/backtesting' ? 'text-foreground' : 'text-muted-foreground')}>Backtesting</span>
                </NavLink>
                <NavLink 
                  to="/playbook" 
                  onClick={() => setMoreOpen(false)} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:bg-foreground/[0.08]"
                  style={{ backgroundColor: location.pathname === '/playbook' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <PlaybookIcon className={cn('h-5 w-5', location.pathname === '/playbook' ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className={cn('text-sm', location.pathname === '/playbook' ? 'text-foreground' : 'text-muted-foreground')}>Playbook</span>
                </NavLink>
                
                {/* Divider */}
                <div className="h-px bg-border/50 my-1" />
                
                {/* Parameters section */}
                <NavLink 
                  to="/settings/rules" 
                  onClick={() => setMoreOpen(false)} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:bg-foreground/[0.08]"
                  style={{ backgroundColor: location.pathname === '/settings/rules' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <TradingRulesIcon className={cn('h-5 w-5', location.pathname === '/settings/rules' ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className={cn('text-sm', location.pathname === '/settings/rules' ? 'text-foreground' : 'text-muted-foreground')}>Trading Rules</span>
                </NavLink>
                <NavLink 
                  to="/settings/goals" 
                  onClick={() => setMoreOpen(false)} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:bg-foreground/[0.08]"
                  style={{ backgroundColor: location.pathname === '/settings/goals' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <GoalsIcon className={cn('h-5 w-5', location.pathname === '/settings/goals' ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className={cn('text-sm', location.pathname === '/settings/goals' ? 'text-foreground' : 'text-muted-foreground')}>P&L Goals</span>
                </NavLink>
                <NavLink 
                  to="/settings/timeframes" 
                  onClick={() => setMoreOpen(false)} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:bg-foreground/[0.08]"
                  style={{ backgroundColor: location.pathname === '/settings/timeframes' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <TimeframesIcon className={cn('h-5 w-5', location.pathname === '/settings/timeframes' ? 'text-foreground' : 'text-muted-foreground')} />
                  <span className={cn('text-sm', location.pathname === '/settings/timeframes' ? 'text-foreground' : 'text-muted-foreground')}>Timeframes</span>
                </NavLink>
                
                {/* Divider */}
                <div className="h-px bg-border/50 my-1" />
                
                {/* Theme Toggle */}
                <div className="py-2">
                  <div className="flex justify-center px-3">
                    <div className="relative inline-flex items-center bg-muted/50 dark:bg-muted/30 rounded-full p-0.5 border border-border/50">
                      {/* Slider Background */}
                      <div
                        className={cn(
                          "absolute top-0.5 h-[calc(100%-4px)] w-10 rounded-full transition-all duration-300 ease-in-out bg-background shadow-sm border border-border/50",
                          preferences.theme === 'light' && "left-0.5",
                          preferences.theme === 'dark' && "left-[2.625rem]",
                          preferences.theme === 'system' && "left-[5.125rem]"
                        )}
                      />
                      
                      {/* Light Mode Button */}
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          'relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 outline-none focus:outline-none focus-visible:outline-none',
                          preferences.theme === 'light'
                            ? 'text-foreground'
                            : 'text-muted-foreground/50 hover:text-muted-foreground/70'
                        )}
                      >
                        <Sun className="h-4 w-4" />
                      </button>
                      
                      {/* Dark Mode Button */}
                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          'relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 outline-none focus:outline-none focus-visible:outline-none',
                          preferences.theme === 'dark'
                            ? 'text-foreground'
                            : 'text-muted-foreground/50 hover:text-muted-foreground/70'
                        )}
                      >
                        <Moon className="h-4 w-4" />
                      </button>
                      
                      {/* System Mode Button */}
                      <button
                        onClick={() => setTheme('system')}
                        className={cn(
                          'relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 outline-none focus:outline-none focus-visible:outline-none',
                          preferences.theme === 'system'
                            ? 'text-foreground'
                            : 'text-muted-foreground/50 hover:text-muted-foreground/70'
                        )}
                      >
                        <Monitor className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </nav>
  );
}