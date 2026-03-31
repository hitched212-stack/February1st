import { useAccount, AccountType, Account } from '@/hooks/useAccount';
import { useTrades } from '@/hooks/useTrades';
import { Check, ChevronDown, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const accountTypeConfig: Record<AccountType, { label: string }> = {
  prop_firm: { label: 'Prop Firm' },
  personal: { label: 'Personal' },
  funded: { label: 'Funded' },
  demo: { label: 'Demo' },
};

export function DashboardAccountSelector() {
  const { accounts, activeAccount, setActiveAccount, loading } = useAccount();
  const { trades: allTrades } = useTrades();
  const navigate = useNavigate();

  const activeAccounts = accounts.filter(a => a.status === 'active');

  // Calculate account balance (starting balance + P&L) for each account
  const getAccountBalance = (account: Account) => {
    const accountTrades = allTrades.filter(t => t.accountId === account.id);
    const totalPnl = accountTrades.reduce((sum, t) => sum + t.pnlAmount, 0);
    return account.starting_balance + totalPnl;
  };

  const formatBalance = (balance: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(balance);
  };

  if (loading) {
    return (
      <div className="h-10 w-48 rounded-full bg-foreground/5 animate-pulse" />
    );
  }

  if (!activeAccount) return null;

  const config = accountTypeConfig[activeAccount.type] || accountTypeConfig.personal;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'group inline-flex items-center gap-2 px-3 py-1.5 h-9 rounded-xl transition-all duration-200',
            'hover:bg-muted/50',
            'text-sm font-medium text-foreground',
            'focus:outline-none'
          )}
        >
          <User className="h-4 w-4" strokeWidth={1.5} />
          <span className="truncate max-w-[120px] font-display font-bold tabular-nums">{activeAccount.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-colors duration-200" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="center" 
        className="w-56 md:w-72 bg-card/95 backdrop-blur-xl border-border/70 rounded-2xl p-2"
        sideOffset={8}
      >
        <div className="space-y-0.5">
          {activeAccounts.map((account) => {
            const accConfig = accountTypeConfig[account.type] || accountTypeConfig.personal;
            const isActive = account.id === activeAccount.id;
            
            return (
              <DropdownMenuItem
                key={account.id}
                onClick={() => setActiveAccount(account)}
                className={cn(
                  'flex items-center gap-3 cursor-pointer rounded-xl px-3 py-3 transition-all duration-200',
                  isActive 
                    ? 'bg-gradient-to-r from-[#9b8cff]/18 to-violet-500/8 border border-[#9b8cff]/35' 
                    : 'hover:bg-foreground/5 border border-transparent'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0',
                  isActive ? 'bg-[#9b8cff]/18 border border-[#9b8cff]/30' : 'bg-foreground/5 border border-border/40'
                )}>
                  <User className={cn('h-4 w-4', isActive ? 'text-[#9b8cff]' : 'text-foreground')} strokeWidth={1.7} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate font-display">
                    {account.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate font-display">
                    {accConfig.label}
                    {account.broker_name && ` · ${account.broker_name}`}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-display font-semibold tabular-nums">
                    {formatBalance(getAccountBalance(account), account.currency)}
                  </span>
                  {isActive && (
                    <Check className="h-4 w-4 text-[#9b8cff]" strokeWidth={2.5} />
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
        
        <DropdownMenuSeparator className="my-1.5" />
        
        <DropdownMenuItem
          onClick={() => navigate('/settings/accounts')}
          className="flex items-center gap-3 cursor-pointer rounded-xl px-3 py-3 text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-transparent"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-border/70 bg-background/40">
            <Settings className="h-4 w-4" strokeWidth={1.7} />
          </div>
          <span className="text-sm font-medium">Manage Accounts</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
