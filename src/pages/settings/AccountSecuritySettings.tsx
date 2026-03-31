import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AccountSecuritySettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEraseAllData = async () => {
    if (!user) return;

    try {
      // Delete all user data in order (respecting foreign key constraints)
      // 1. Delete trades
      const { error: tradesError } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', user.id);
      if (tradesError) throw tradesError;

      // 2. Delete backtests
      const { error: backtestsError } = await supabase
        .from('backtests')
        .delete()
        .eq('user_id', user.id);
      if (backtestsError) throw backtestsError;

      // 3. Delete playbook setups
      const { error: playbookError } = await supabase
        .from('playbook_setups')
        .delete()
        .eq('user_id', user.id);
      if (playbookError) throw playbookError;

      // 4. Delete folders (should be last since backtests/playbook reference them)
      const { error: foldersError } = await supabase
        .from('folders')
        .delete()
        .eq('user_id', user.id);
      if (foldersError) throw foldersError;

      toast({
        title: 'Data Erased',
        description: 'All trading data has been deleted',
      });

      // Reload the page to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error erasing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to erase data',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('delete-user');

      if (error) throw error;

      toast({
        title: 'Account Deleted',
        description: 'Your account has been deleted successfully',
      });
      
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete account',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate('/settings')}
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors -ml-1"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <h1 className="text-sm font-bold uppercase tracking-widest">Account Security</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Manage sensitive account actions. These changes are permanent and cannot be undone.
        </p>

        {/* Erase All Data */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
          <div className="p-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base text-foreground">Erase All Data</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Delete all your trades and reset your trading history. Your account and settings will remain intact.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Erase All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Erase all trading data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your trades and trading history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleEraseAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Erase All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Delete Account */}
        <div className="rounded-2xl border border-destructive/30 bg-card overflow-hidden shadow-sm">
          <div className="p-4">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Permanently delete your account and all associated data including trades, settings, and profile information.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}