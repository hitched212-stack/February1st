import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/hooks/useAccount';
import { useTrades } from '@/hooks/useTrades';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AccountSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSelectionDialog({ open, onOpenChange }: AccountSelectionDialogProps) {
  const navigate = useNavigate();
  const { accounts, activeAccount } = useAccount();
  const { trades } = useTrades();

  const getAccountBalance = (accountId: string) => {
    const accountTrades = trades.filter(t => t.accountId === accountId);
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;
    
    const totalPnl = accountTrades.reduce((sum, trade) => sum + (trade.pnlAmount || 0), 0);
    return account.starting_balance + totalPnl;
  };

  const getLastLoggedTradeDate = (accountId: string) => {
    const accountTrades = trades.filter(t => t.accountId === accountId);
    if (!accountTrades.length) return null;

    const latestTrade = accountTrades.reduce((latest, trade) => {
      const latestTs = new Date(latest.createdAt).getTime();
      const currentTs = new Date(trade.createdAt).getTime();
      return currentTs > latestTs ? trade : latest;
    });

    return latestTrade.createdAt;
  };

  const handleAddTrade = (accountId: string) => {
    onOpenChange(false);
    navigate('/add');
  };

  const formatLastUpdate = (date: string | null) => {
    if (!date) return 'Never';
    const updateDate = new Date(date);
    return updateDate.toLocaleDateString('en-US');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[900px] max-h-[82vh] overflow-hidden p-0 gap-0 bg-background border-border/50 [&>button]:top-4 [&>button]:right-4">
        <DialogHeader className="px-4 sm:px-6 pt-6 pb-4 border-b border-border/30 pr-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <DialogTitle className="text-xl font-bold font-display text-foreground">
              My Trading Accounts
            </DialogTitle>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:mr-10">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 font-bold font-display"
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/settings/accounts');
                }}
                className="h-9 rounded-xl font-bold font-display"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add New Account
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2.5">
            {accounts.map((account, index) => {
              const balance = getAccountBalance(account.id);
              const isActive = activeAccount?.id === account.id;
              const lastLoggedTradeDate = getLastLoggedTradeDate(account.id);

              return (
                <div
                  key={account.id}
                  className={cn(
                    'rounded-xl border p-3.5 transform-gpu will-change-transform animate-in fade-in-0 slide-in-from-bottom-2 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none',
                    isActive
                      ? 'bg-violet-500/5 border-violet-500/30'
                      : 'bg-card/50 border-border/30'
                  )}
                  style={{ animationDelay: `${Math.min(index * 55, 275)}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold font-display text-foreground leading-tight">
                        {account.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-display">
                        {account.broker_name || 'manual'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold font-display uppercase tracking-wide',
                          isActive
                            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Button
                        size="icon"
                        onClick={() => handleAddTrade(account.id)}
                        className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border border-emerald-500/30"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <div className="inline-flex items-center gap-1.5 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Balance</p>
                      <p className="font-bold font-display tabular-nums text-foreground whitespace-nowrap">
                        {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Last Update</p>
                      <p className="font-display text-muted-foreground whitespace-nowrap">{formatLastUpdate(lastLoggedTradeDate)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr,1.5fr,1.5fr,1.5fr,1fr,auto] gap-4 px-4 py-3 bg-muted/30 rounded-xl mb-2">
            <div className="text-xs font-bold font-display uppercase tracking-widest text-muted-foreground">
              Account Name
            </div>
            <div className="text-xs font-bold font-display uppercase tracking-widest text-muted-foreground">
              Broker
            </div>
            <div className="text-xs font-bold font-display uppercase tracking-widest text-muted-foreground">
              Balance
            </div>
            <div className="text-xs font-bold font-display uppercase tracking-widest text-muted-foreground">
              Last Update
            </div>
            <div className="text-xs font-bold font-display uppercase tracking-widest text-muted-foreground">
              Type
            </div>
            <div className="text-xs font-bold font-display uppercase tracking-widest text-muted-foreground">
              Actions
            </div>
          </div>

          {/* Account Rows */}
          <div className="space-y-2">
            {accounts.map((account, index) => {
              const balance = getAccountBalance(account.id);
              const isActive = activeAccount?.id === account.id;
              const lastLoggedTradeDate = getLastLoggedTradeDate(account.id);
              
              return (
                <div
                  key={account.id}
                  className={cn(
                    "grid grid-cols-[2fr,1.5fr,1.5fr,1.5fr,1fr,auto] gap-4 px-4 py-4 rounded-xl border transform-gpu will-change-transform animate-in fade-in-0 slide-in-from-bottom-2 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none",
                    isActive 
                      ? "bg-violet-500/5 border-violet-500/30" 
                      : "bg-card/50 border-border/30"
                  )}
                  style={{ animationDelay: `${Math.min(index * 55, 275)}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold font-display text-foreground">
                      {account.name}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground font-display">
                    {account.broker_name || 'manual'}
                  </div>
                  
                  <div className="flex items-center text-sm font-bold font-display tabular-nums text-foreground">
                    {balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground font-display">
                    {formatLastUpdate(lastLoggedTradeDate)}
                  </div>
                  
                  <div className="flex items-center">
                    <span className={cn(
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-bold font-display",
                      isActive 
                        ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="icon"
                      onClick={() => handleAddTrade(account.id)}
                      className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border border-emerald-500/30"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
