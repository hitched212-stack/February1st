import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  ChevronsUpDown,
  PanelLeft,
  LogOut,
  CreditCard,
  Wallet,
  Check,
  Bot,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { BugReportDialog } from "@/components/layout/BugReportDialog";
import { AccountSelectionDialog } from "@/components/account/AccountSelectionDialog";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useAccount";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { usePreferences } from "@/hooks/usePreferences";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol } from "@/types/trade";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Dashboard icon - solid house
// Custom 4-dot grid icon - filled
const GridDotsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </svg>
);

// Custom calendar icon - filled
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10z"/>
  </svg>
);

// Clock icon - filled
const ClockHistoryIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
  </svg>
);

// Bar chart icon - filled three vertical bars (same as Total PnL card)
const BarChartIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 20q-.425 0-.712-.288T16 19v-5q0-.425.288-.712T17 13h2q.425 0 .713.288T20 14v5q0 .425-.288.713T19 20zm-6 0q-.425 0-.712-.288T10 19V5q0-.425.288-.712T11 4h2q.425 0 .713.288T14 5v14q0 .425-.288.713T13 20zm-6 0q-.425 0-.712-.288T4 19v-9q0-.425.288-.712T5 9h2q.425 0 .713.288T8 10v9q0 .425-.288.713T7 20z"/>
  </svg>
);

// Backtest icon - rewind/fast-backward
const BacktestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11 5L3 11l8 6v-6l8-6-8 6v-6z"/>
    <path d="M21 5L13 11l8 6v-12z"/>
    <rect x="2" y="5" width="2" height="12" fill="currentColor"/>
  </svg>
);

// Custom playbook icon - filled book style
const PlaybookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 8h6v2H9V8zm0 4h6v2H9v-2z"/>
  </svg>
);

// Custom trading rules icon - filled checklist
const TradingRulesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8.29 13.29L6.7 12.3a.996.996 0 111.41-1.41L10.7 13.3l5.18-5.19a.996.996 0 111.41 1.41l-5.88 5.88a.996.996 0 01-1.41 0z"/>
  </svg>
);

// Custom settings icon - filled gear
const SettingsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81a.488.488 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

// Bug report icon - filled bug
const BugIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/>
  </svg>
);

// Custom target icon - crosshair reticle
const TargetIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
  </svg>
);

// Custom slash logo icon
const SlashLogoIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="15" y1="5" x2="9" y2="19" />
  </svg>
);

// Navigation sections with their items
const navSections = [
  {
    label: "Trading",
    items: [
      { to: "/dashboard", icon: GridDotsIcon, label: "Dashboard" },
      { to: "/history", icon: ClockHistoryIcon, label: "History" },
      { to: "/analytics", icon: BarChartIcon, label: "Analytics" },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/backtesting", icon: BacktestIcon, label: "Backtesting" },
      { to: "/playbook", icon: PlaybookIcon, label: "Playbook" },
    ],
  },
];

// Parameters section items (collapsible)
const parametersItems = [
  { to: "/settings/rules", icon: TradingRulesIcon, label: "Trading Rules" },
  { to: "/settings/goals", icon: TargetIcon, label: "P&L Goals" },
  { to: "/settings/timeframes", icon: ClockHistoryIcon, label: "Chart Timeframes" },
];

// Flatten all nav items for indicator positioning
const allNavItems = [
  ...navSections.flatMap((section) => section.items),
  ...parametersItems,
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export function Sidebar({
  isCollapsed: controlledCollapsed,
  setIsCollapsed: setControlledCollapsed,
}: {
  isCollapsed?: boolean;
  setIsCollapsed?: (value: boolean) => void;
} = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { accounts, activeAccount, setActiveAccount } = useAccount();
  const { trades } = useTrades();
  const { settings } = useSettings();
  const { preferences, setTheme } = usePreferences();
  const isGlassEnabled = preferences.liquidGlassEnabled ?? false;
  const activeNavClass = "text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/15 border border-violet-300 dark:border-violet-400/20";
  const activeIndicatorClass = "bg-violet-600 dark:bg-violet-400";
  const [isCollapsedState, setIsCollapsedState] = useState(false);
  const isCollapsed = controlledCollapsed ?? isCollapsedState;
  const setIsCollapsed = setControlledCollapsed ?? setIsCollapsedState;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);

  // Track active path for indicator
  const [activePath, setActivePath] = useState<string | null>(null);

  // Calculate balances for each account - exclude paper trades
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach((account) => {
      const accountTrades = trades.filter((t) => t.accountId === account.id && !t.isPaperTrade && !t.noTradeTaken);
      const totalPnl = accountTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
      balances[account.id] = (account.starting_balance || 0) + totalPnl;
    });
    return balances;
  }, [accounts, trades]);

  const activeAccounts = accounts.filter((acc) => acc.status === "active");
  const otherAccounts = activeAccounts.filter((acc) => acc.id !== activeAccount?.id);

  const formatBalance = (amount: number, currency: string) => {
    if (settings.balanceHidden) {
      return "••••••";
    }
    const symbol = getCurrencySymbol(currency as any);
    return `${symbol}${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Fetch user profile for avatar
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("avatar_url, username").eq("user_id", user.id).single();

      if (data) {
        setAvatarUrl(data.avatar_url);
        setProfileUsername(data.username);
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Sidebar UI state is kept in-memory only

  // Track active path for indicator
  useEffect(() => {
    const currentPath = location.pathname;
    const matchedPath = allNavItems.find((item) => {
      if (item.to === "/settings") {
        return currentPath.startsWith("/settings");
      }
      return currentPath === item.to;
    })?.to;

    setActivePath(matchedPath || null);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/settings") {
      // Don't highlight settings when on tools pages
      const toolsPaths = ["/settings/rules", "/settings/goals", "/settings/timeframes", "/settings/accounts"];
      if (toolsPaths.includes(location.pathname)) return false;
      return location.pathname === "/settings" || location.pathname.startsWith("/settings");
    }
    return location.pathname === path;
  };

  const userEmail = user?.email || "";
  const userName = profileUsername || userEmail.split("@")[0] || "User";
  const userInitials = userName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <motion.aside
      className={cn(
        "hidden md:flex flex-col fixed top-4 left-4 z-40 rounded-[2rem] overflow-hidden border shadow-[0_24px_80px_-40px_rgba(0,0,0,0.7)]",
        isGlassEnabled
          ? "bg-sidebar/85 backdrop-blur-2xl border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "bg-sidebar border-border/60"
      )}
      style={{ height: "calc(100vh - 32px)" }}
      initial={false}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Dot pattern - only show when glass is enabled */}
      {isGlassEnabled && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sidebar-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1" className="fill-white/[0.08] dark:fill-white/[0.04]" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sidebar-dots)" />
        </svg>
      )}
      {/* Header Logo */}
      <div className="p-3">
        <div className={cn(
          "flex items-center gap-2 transition-all duration-200",
          isCollapsed ? "justify-center" : ""
        )}>
          {isCollapsed ? (
            <img 
              src="/images/mytradelog-icon.png" 
              alt="MyTradeLog" 
              className="h-11 w-11 object-contain transition-all duration-200 dark:invert-0 invert"
            />
          ) : (
            <img 
              src="/images/mytradelog-logo-new.png" 
              alt="MyTradeLog" 
              className="h-11 w-auto object-contain transition-all duration-200 dark:invert-0 invert"
            />
          )}
        </div>
      </div>

      {/* Add Trade Button */}
      <div className="px-3 mb-4">
        <button
          onClick={() => setShowAccountDialog(true)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white py-2.5 transition-all duration-200 hover:bg-violet-500 hover:scale-[1.02] active:scale-[0.98] font-bold font-display text-sm",
            isCollapsed ? "w-10 h-10 mx-auto p-0" : "w-full px-3",
          )}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && (
            <span className="whitespace-nowrap overflow-hidden transition-opacity duration-200">Add Trade</span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto relative">
        <div className="space-y-0.5 py-0.5">
          {navSections[0].items.map(({ to, icon: Icon, label }) => {
            const active = isActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "group relative flex items-center gap-3 px-2 py-2 rounded-xl border border-transparent transition-all duration-200 ease-out",
                  "hover:scale-[1.02]",
                  active
                    ? activeNavClass
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  isCollapsed ? "justify-center" : "",
                )}
              >
                <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 relative overflow-hidden self-center">
                  {isCollapsed ? (
                    <>
                      <Icon className="h-[18px] w-[18px] stroke-[1.5px] block transition-all duration-500 group-hover:translate-y-[-100%]" />
                      <Icon className="h-[18px] w-[18px] stroke-[1.5px] absolute top-[100%] left-0 block transition-all duration-500 group-hover:translate-y-[-100%]" />
                    </>
                  ) : (
                    <Icon className="h-[18px] w-[18px] stroke-[1.5px]" />
                  )}
                </div>
                {!isCollapsed && (
                  <span className="relative h-[18px] overflow-hidden whitespace-nowrap transition-opacity duration-200 flex items-center">
                    <span className="block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                      {label}
                    </span>
                    <span className="absolute top-[100%] left-0 block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                      {label}
                    </span>
                  </span>
                )}
                {active && !isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn("ml-auto w-[2px] h-4 rounded-full", activeIndicatorClass)}
                  />
                )}
              </NavLink>
            );
          })}
          {!isCollapsed && <div className="my-3 mx-2 h-px bg-border/50" />}
          {navSections[1].items.map(({ to, icon: Icon, label }) => {
            const active = isActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "group relative flex items-center gap-3 px-2 py-2 rounded-xl border border-transparent transition-all duration-200 ease-out",
                  "hover:scale-[1.02]",
                  active
                    ? activeNavClass
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  isCollapsed ? "justify-center" : "",
                )}
              >
                <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 relative overflow-hidden self-center">
                  {isCollapsed ? (
                    <>
                      <Icon className="h-[18px] w-[18px] stroke-[1.5px] block transition-all duration-500 group-hover:translate-y-[-100%]" />
                      <Icon className="h-[18px] w-[18px] stroke-[1.5px] absolute top-[100%] left-0 block transition-all duration-500 group-hover:translate-y-[-100%]" />
                    </>
                  ) : (
                    <Icon className="h-[18px] w-[18px] stroke-[1.5px]" />
                  )}
                </div>
                {!isCollapsed && (
                  <span className="relative h-[18px] overflow-hidden whitespace-nowrap flex-1 transition-opacity duration-200 flex items-center">
                    <span className="block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                      {label}
                    </span>
                    <span className="absolute top-[100%] left-0 block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                      {label}
                    </span>
                  </span>
                )}
                {active && !isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn("ml-auto w-[2px] h-4 rounded-full", activeIndicatorClass)}
                  />
                )}
              </NavLink>
            );
          })}
          {!isCollapsed && <div className="my-3 mx-2 h-px bg-border/50" />}
          {parametersItems.map(({ to, icon: Icon, label }) => {
            const active = isActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "group relative flex items-center gap-3 px-2 py-2 rounded-xl border border-transparent transition-all duration-200 ease-out",
                  "hover:scale-[1.02]",
                  active
                    ? activeNavClass
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  isCollapsed ? "justify-center" : "",
                )}
              >
                <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 relative overflow-hidden self-center">
                  {isCollapsed ? (
                    <>
                      <Icon className="h-[18px] w-[18px] stroke-[1.5px] block transition-all duration-500 group-hover:translate-y-[-100%]" />
                      <Icon className="h-[18px] w-[18px] stroke-[1.5px] absolute top-[100%] left-0 block transition-all duration-500 group-hover:translate-y-[-100%]" />
                    </>
                  ) : (
                    <Icon className="h-[18px] w-[18px] stroke-[1.5px]" />
                  )}
                </div>
                {!isCollapsed && (
                  <span className="relative h-[18px] overflow-hidden whitespace-nowrap transition-opacity duration-200 flex items-center">
                    <span className="block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                      {label}
                    </span>
                    <span className="absolute top-[100%] left-0 block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                      {label}
                    </span>
                  </span>
                )}
                {active && !isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn("ml-auto w-[2px] h-4 rounded-full", activeIndicatorClass)}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Profile & Collapse */}
      <div className="p-3 border-t border-border/60 dark:border-border/20 space-y-2">
        {/* Report Bug */}
        <div>
          <button
            onClick={() => {
              setIsBugReportOpen(true);
            }}
            className={cn(
              "group relative flex items-center gap-3 px-2 py-2 rounded-xl border border-transparent transition-all duration-200 ease-out w-full text-left",
              "hover:scale-[1.02]",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              isCollapsed ? "justify-center" : "",
            )}
          >
            <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 relative overflow-hidden">
              {isCollapsed ? (
                <>
                  <BugIcon className="h-[18px] w-[18px] block transition-all duration-500 group-hover:translate-y-[-100%]" />
                  <BugIcon className="h-[18px] w-[18px] absolute top-[100%] left-0 block transition-all duration-500 group-hover:translate-y-[-100%]" />
                </>
              ) : (
                <BugIcon className="h-[18px] w-[18px]" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="relative h-5 overflow-hidden whitespace-nowrap flex-1 transition-opacity duration-200">
                  <span className="block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                    Report Bug
                  </span>
                  <span className="absolute top-[100%] left-0 block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                    Report Bug
                  </span>
                </span>
              </>
            )}
          </button>
        </div>
        
        {/* Settings */}
        <div>
          <NavLink
            to="/settings"
            className={cn(
              "group relative flex items-center gap-3 px-2 py-2 rounded-xl border border-transparent transition-all duration-200 ease-out",
              "hover:scale-[1.02]",
              isActive("/settings")
                ? activeNavClass
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              isCollapsed ? "justify-center" : "",
            )}
          >
            <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 relative overflow-hidden self-center">
              {isCollapsed ? (
                <>
                  <SettingsIcon className="h-[18px] w-[18px] block transition-all duration-500 group-hover:translate-y-[-100%]" />
                  <SettingsIcon className="h-[18px] w-[18px] absolute top-[100%] left-0 block transition-all duration-500 group-hover:translate-y-[-100%]" />
                </>
              ) : (
                <SettingsIcon className="h-[18px] w-[18px]" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="relative h-[18px] overflow-hidden whitespace-nowrap flex-1 transition-opacity duration-200 flex items-center">
                  <span className="block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                    {"Settings"}
                  </span>
                  <span className="absolute top-[100%] left-0 block text-[11px] font-bold uppercase tracking-widest transition-all duration-500 group-hover:translate-y-[-100%]">
                    Settings
                  </span>
                </span>
              </>
            )}
            {/* Active indicator line */}
            {isActive("/settings") && !isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn("ml-auto w-[2px] h-4 rounded-full", activeIndicatorClass)} 
              />
            )}
          </NavLink>
        </div>
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors w-full text-left",
                isCollapsed && "justify-center p-2",
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback
                  className="text-xs bg-muted"
                  style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 700, letterSpacing: '0.06em' }}
                >
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 overflow-hidden min-w-0 transition-opacity duration-200">
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-sm text-foreground truncate"
                      style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 700, letterSpacing: '0.02em' }}
                    >
                      {userName}
                    </span>
                    <span
                      className="text-xs text-muted-foreground truncate"
                      style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 700, letterSpacing: '0.02em' }}
                    >
                      {userEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-64 p-2 bg-background/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl z-50"
            sideOffset={8}
          >
            {/* User Header */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl">
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback
                  className="text-sm bg-muted/70"
                  style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 700, letterSpacing: '0.06em' }}
                >
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span
                  className="text-sm text-foreground truncate"
                  style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 700, letterSpacing: '0.02em' }}
                >
                  {userName}
                </span>
                <span
                  className="text-xs text-muted-foreground truncate"
                  style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 700, letterSpacing: '0.02em' }}
                >
                  {userEmail}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem onClick={() => navigate("/settings?tab=billing")} className="py-2 px-2.5 rounded-xl cursor-pointer hover:bg-muted/50">
              <CreditCard className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Billing</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} className="py-2 px-2.5 rounded-xl cursor-pointer hover:bg-muted/50">
              <SettingsIcon className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Settings</span>
            </DropdownMenuItem>
            
            {/* Theme Switch */}
            <div className="p-2 rounded-xl border border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Theme</span>
                <div className="relative inline-flex items-center bg-muted/50 dark:bg-muted/30 rounded-full p-0.5 border border-border/50">
                  {/* Slider Background */}
                  <div
                    className={cn(
                      "absolute top-0.5 h-[calc(100%-4px)] w-8 rounded-full transition-all duration-300 ease-in-out bg-background shadow-sm border border-border/50",
                      preferences.theme === 'light' && "left-0.5",
                      preferences.theme === 'dark' && "left-[2.125rem]",
                      preferences.theme === 'system' && "left-[4.125rem]"
                    )}
                  />
                  
                  {[
                    { value: 'light', icon: Sun },
                    { value: 'dark', icon: Moon },
                    { value: 'system', icon: Monitor }
                  ].map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value as any)}
                      className={cn(
                        'relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300',
                        preferences.theme === value
                          ? 'text-foreground'
                          : 'text-muted-foreground/50 hover:text-muted-foreground/70'
                      )}
                      title={value.charAt(0).toUpperCase() + value.slice(1)}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem onClick={handleSignOut} className="py-2 px-2.5 rounded-xl cursor-pointer hover:bg-muted/50">
              <LogOut className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200",
            isCollapsed && "mx-auto",
          )}
        >
          <div
            className="transition-transform duration-200"
            style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <PanelLeft className="h-[18px] w-[18px] stroke-[1.5px]" />
          </div>
        </button>
      </div>

      {/* Bug Report Dialog */}
      <BugReportDialog open={isBugReportOpen} onOpenChange={setIsBugReportOpen} />
      
      {/* Account Selection Dialog */}
      <AccountSelectionDialog open={showAccountDialog} onOpenChange={setShowAccountDialog} />
    </motion.aside>
  );
}
