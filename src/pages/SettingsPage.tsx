import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { usePreferences } from '@/hooks/usePreferences';
import { useNavigate, useLocation } from 'react-router-dom';
import PreferencesSettings from '@/pages/settings/PreferencesSettings';
import BillingSettings from '@/pages/settings/BillingSettings';
import { useState, useEffect } from 'react';
import { ChevronRight, User, LogOut, Eye, EyeOff, Lock, Mail, Palette, Bell, Settings2, UserCog, ShieldCheck, Trash2, AlertTriangle, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Custom filled icons
const KeyRoundIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
  </svg>
);

const MailIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
  </svg>
);

const PaletteIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
);

const ShieldAlertIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v7h-2V7zm1 11.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

interface SettingsItemProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function SettingsItem({ icon: Icon, title, subtitle, onClick, variant = 'default' }: SettingsItemProps) {
  const isDanger = variant === 'danger';
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-transparent transition-colors text-left border-b border-border/50 last:border-b-0 group [-webkit-tap-highlight-color:transparent]"
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
        isDanger ? 'bg-destructive/10' : 'bg-muted'
      }`}>
        <Icon className={`h-5 w-5 ${isDanger ? 'text-destructive' : 'text-foreground/70'}`} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-base ${isDanger ? 'text-destructive' : 'text-foreground'}`}>{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
    </button>
  );
}

function SettingsSection({ title, children, isGlassEnabled, patternId }: { title: string; children: React.ReactNode; isGlassEnabled?: boolean; patternId: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        {title}
      </h2>
      <div className={cn(
        "rounded-2xl border overflow-hidden shadow-sm relative",
        isGlassEnabled
          ? "border-border/50 bg-card/95 dark:bg-card/80 backdrop-blur-xl"
          : "border-border/50 bg-card"
      )}>
        {isGlassEnabled && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={patternId} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" className="fill-foreground/[0.04] dark:fill-foreground/[0.03]" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        )}
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}

const TIMEZONE_GROUPS = [
  {
    region: 'Americas',
    timezones: [
      { value: 'America/New_York', label: 'EST', name: 'New York' },
      { value: 'America/Chicago', label: 'CST', name: 'Chicago' },
      { value: 'America/Denver', label: 'MST', name: 'Denver' },
      { value: 'America/Los_Angeles', label: 'PST', name: 'Los Angeles' },
    ]
  },
  {
    region: 'Europe',
    timezones: [
      { value: 'Europe/London', label: 'GMT', name: 'London' },
      { value: 'Europe/Frankfurt', label: 'CET', name: 'Frankfurt' },
      { value: 'Europe/Paris', label: 'CET', name: 'Paris' },
      { value: 'Europe/Amsterdam', label: 'CET', name: 'Amsterdam' },
    ]
  },
  {
    region: 'Asia',
    timezones: [
      { value: 'Asia/Dubai', label: 'GST', name: 'Dubai' },
      { value: 'Asia/Hong_Kong', label: 'HKT', name: 'Hong Kong' },
      { value: 'Asia/Tokyo', label: 'JST', name: 'Tokyo' },
      { value: 'Asia/Singapore', label: 'SGT', name: 'Singapore' },
    ]
  },
  {
    region: 'Oceania',
    timezones: [
      { value: 'Australia/Sydney', label: 'AEST', name: 'Sydney' },
      { value: 'Australia/Melbourne', label: 'AEST', name: 'Melbourne' },
    ]
  }
];

function getTimeInTimezone(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    hour12: true,
  });
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { preferences, setTimeZone } = usePreferences();
  const isGlassEnabled = preferences.liquidGlassEnabled ?? false;
  const [timeZoneInput, setTimeZoneInput] = useState(preferences.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showUsernameChange, setShowUsernameChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialize activeTab from URL parameter
  const urlParams = new URLSearchParams(location.search);
  const tabParam = urlParams.get('tab') as 'organization' | 'user' | 'billing' | 'compliance' | null;
  const [activeTab, setActiveTab] = useState<'organization' | 'user' | 'billing' | 'compliance'>(tabParam || 'organization');

  // Update active tab when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab') as 'organization' | 'user' | 'billing' | 'compliance' | null;
    if (tabParam && ['organization', 'user', 'billing', 'compliance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Update time every second for live preview
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordReset(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Please enter a new email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast.success('Confirmation email sent! Check your inbox to verify the new email.');
      setNewEmail('');
      setShowEmailChange(false);
    } catch (error) {
      console.error('Error changing email:', error);
      toast.error('Failed to change email');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      toast.error('Please enter a new username');
      return;
    }

    if (newUsername.trim() === settings.username) {
      toast.error('New username is the same as current username');
      return;
    }

    setIsChangingUsername(true);
    try {
      await updateSettings({ username: newUsername.trim() });
      toast.success('Username updated successfully');
      setNewUsername('');
      setShowUsernameChange(false);
    } catch (error) {
      console.error('Error changing username:', error);
      toast.error('Failed to change username');
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const { toast: toastHook } = useToast();

  const handleEraseAllData = async () => {
    if (!user) return;

    try {
      // Delete all user data in order (respecting foreign key constraints)
      const { error: tradesError } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', user.id);
      if (tradesError) throw tradesError;

      const { error: backtestsError } = await supabase
        .from('backtests')
        .delete()
        .eq('user_id', user.id);
      if (backtestsError) throw backtestsError;

      const { error: playbookError } = await supabase
        .from('playbook_setups')
        .delete()
        .eq('user_id', user.id);
      if (playbookError) throw playbookError;

      const { error: messagesError } = await supabase
        .from('ai_messages')
        .delete()
        .eq('user_id', user.id);
      if (messagesError) throw messagesError;

      const { error: conversationsError } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('user_id', user.id);
      if (conversationsError) throw conversationsError;

      const { error: foldersError } = await supabase
        .from('folders')
        .delete()
        .eq('user_id', user.id);
      if (foldersError) throw foldersError;

      toastHook({
        title: 'Data Erased',
        description: 'All trading data has been deleted',
      });

      window.location.reload();
    } catch (error) {
      console.error('Error erasing data:', error);
      toastHook({
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

      toastHook({
        title: 'Account Deleted',
        description: 'Your account has been deleted successfully',
      });
      
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toastHook({
        title: 'Error',
        description: 'Failed to delete account',
        variant: 'destructive',
      });
    }
  };

  const orgId = 'NDIS 435678965';

  const tabs = [
    { id: 'organization' as const, label: 'General', icon: Settings2 },
    { id: 'user' as const, label: 'Preferences', icon: UserCog },
    { id: 'billing' as const, label: 'Billing', icon: CreditCardIcon },
    { id: 'compliance' as const, label: 'Security', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Profile Header */}
      <header className="px-4 pt-6 pb-5 md:px-6 lg:px-8 border-b border-border/40">
        {/* Top Bar with Settings Title and Profile */}
        <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1 h-5 rounded-full bg-[#9b8cff]" />
              <div className="min-w-0">
                <h1 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Settings</h1>
                <p className="hidden sm:block text-xs text-muted-foreground truncate">Manage your account and preferences</p>
              </div>
          </div>
          
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-2.5 shadow-sm">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground leading-tight">{settings.username || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <div className="relative h-9 w-9 rounded-full bg-[#9b8cff]/10 flex items-center justify-center border border-[#9b8cff]/20">
              <User className="h-4 w-4 text-[#9b8cff]" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="w-full overflow-x-auto md:overflow-x-visible [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-background border border-border/40 p-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 md:px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out whitespace-nowrap rounded-lg flex-shrink-0",
                    activeTab === tab.id
                      ? "bg-foreground text-background shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <TabIcon className="h-4 w-4" strokeWidth={2} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <div className="px-4 md:px-6 lg:px-8 py-6">
        {/* Organization Tab */}
        {activeTab === 'organization' && (
          <div className="space-y-8 max-w-4xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-[#9b8cff] rounded-full" />
                <h2 className="text-xl font-bold text-foreground">Profile Details</h2>
              </div>
              <div className={cn(
                "rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm",
                isGlassEnabled
                  ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                  : "border-border/40 bg-card"
              )}>
                <Collapsible open={showUsernameChange} onOpenChange={setShowUsernameChange}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between gap-4 p-6 hover:bg-muted/20 transition-colors text-left group">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">User Name</Label>
                        <p className="text-base font-semibold text-foreground">{settings.username || 'H1tched'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email</Label>
                        <p className="text-base font-medium text-foreground">{user?.email}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Member Since</Label>
                        <p className="text-base font-medium text-foreground">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '02/02/2026'}
                        </p>
                      </div>
                    </div>
                    <MoreVertical className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" strokeWidth={2} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/60">
                    <div className="p-6 space-y-5 bg-muted/20">
                      <div className="space-y-2">
                        <Label htmlFor="newUsername" className="text-sm font-medium text-foreground">New Username</Label>
                        <Input
                          id="newUsername"
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder={settings.username || 'Enter new username'}
                          className="h-11 bg-background/50 border-border/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newEmail" className="text-sm font-medium text-foreground">New Email</Label>
                        <Input
                          id="newEmail"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder={user?.email || 'Enter new email'}
                          className="h-11 bg-background/50 border-border/60"
                        />
                        <p className="text-xs text-muted-foreground">
                          A confirmation email will be sent to verify your new email address.
                        </p>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={async () => {
                            const promises = [];
                            if (newUsername.trim() && newUsername.trim() !== settings.username) {
                              promises.push(handleChangeUsername());
                            }
                            if (newEmail.trim() && newEmail.trim() !== user?.email) {
                              promises.push(handleChangeEmail());
                            }
                            if (promises.length > 0) {
                              await Promise.all(promises);
                            } else {
                              toast.error('No changes to save');
                            }
                          }}
                          disabled={isChangingUsername || isChangingEmail || (!newUsername.trim() && !newEmail.trim())}
                          className="flex-1 h-11 bg-foreground text-background hover:bg-foreground/90"
                        >
                          {(isChangingUsername || isChangingEmail) ? 'Updating...' : 'Save Changes'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowUsernameChange(false);
                            setNewUsername('');
                            setNewEmail('');
                          }}
                          variant="outline"
                          className="flex-1 h-11"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-[#9b8cff] rounded-full" />
                <h2 className="text-xl font-bold text-foreground">Account Settings</h2>
              </div>
              <div className={cn(
                "rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm",
                isGlassEnabled
                  ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                  : "border-border/40 bg-card"
              )}>
                <Collapsible open={showPasswordReset} onOpenChange={setShowPasswordReset}>
                  <CollapsibleTrigger className="w-full flex items-center gap-4 p-6 hover:bg-muted/20 transition-colors text-left group">
                    <div className="h-11 w-11 rounded-xl bg-[#9b8cff]/10 flex items-center justify-center border border-[#9b8cff]/20 group-hover:border-[#9b8cff]/40 transition-colors flex-shrink-0">
                      <Lock className="h-5 w-5 text-[#9b8cff]" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base text-foreground">Change Password</p>
                      <p className="text-sm text-muted-foreground">Update your account password</p>
                    </div>
                    <MoreVertical className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" strokeWidth={2} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/60">
                    <div className="p-6 space-y-5 bg-muted/20">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="h-11 bg-background/50 border-border/60 pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                            ) : (
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="h-11 bg-background/50 border-border/60 pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                            ) : (
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button
                        onClick={handleResetPassword}
                        disabled={isResettingPassword || !newPassword || !confirmPassword}
                        className="w-full h-11 mt-2"
                      >
                        {isResettingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-[#9b8cff] rounded-full" />
                <h2 className="text-xl font-bold text-foreground">Time Zone & Localization</h2>
              </div>
              <div className={cn(
                "rounded-2xl border overflow-hidden shadow-sm relative transition-all duration-300",
                isGlassEnabled
                  ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                  : "border-border/40 bg-card"
              )}>
                <div className="relative p-6">
                  {/* Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-[#9b8cff]/10 border border-[#9b8cff]/20 flex items-center justify-center flex-shrink-0">
                        <GlobeIcon className="w-6 h-6 text-[#9b8cff]" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-foreground mb-0.5">Time Zone</h4>
                        <p className="text-sm text-muted-foreground">Your economic calendar will show news events in this time zone.</p>
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Current Time</div>
                      <div className="text-3xl font-bold text-foreground tabular-nums tracking-tight">{getTimeInTimezone(currentTime, timeZoneInput)}</div>
                    </div>
                  </div>

                  {/* Timezone Select */}
                  <div className="space-y-4">
                    <Select value={timeZoneInput} onValueChange={setTimeZoneInput}>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-background border-border/40 text-sm font-medium hover:border-border transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIMEZONE_GROUPS.map((group) => (
                          <div key={group.region}>
                            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              {group.region}
                            </div>
                            {group.timezones.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                <span className="font-medium">{tz.label}</span>
                                <span className="text-muted-foreground"> • {tz.name}</span>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={() => { setTimeZone(timeZoneInput); toast.success('Time zone updated!'); }}
                      className="w-full h-11 rounded-xl text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-sm"
                      disabled={preferences.timeZone === timeZoneInput}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User & Permissions Tab */}
        {activeTab === 'user' && (
          <div className="space-y-6 max-w-5xl w-full">
            <div>
              <PreferencesSettings embedded />
            </div>

          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6 max-w-5xl w-full">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Billing</h3>
              <BillingSettings embedded />
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-8 max-w-3xl w-full">
            {/* Header */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">
                These actions are permanent and cannot be reversed.
              </p>
            </div>

            {/* Danger Actions */}
            <div className="space-y-4">
              {/* Erase All Data */}
              <div className="group relative rounded-xl border border-border/60 bg-card hover:border-destructive/30 transition-all duration-200 overflow-hidden">
                <div className="absolute inset-0 bg-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0 group-hover:bg-destructive/15 transition-colors">
                        <Trash2 className="h-5 w-5 text-destructive" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1.5">Erase All Trading Data</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Permanently remove all trades, charts, and journal entries. Your account and settings remain untouched.
                        </p>
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Erase Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Erase all trading data?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your trades, charts, and trading history. This action cannot be undone.
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
              <div className="group relative rounded-xl border-2 border-destructive/40 bg-card hover:border-destructive/60 transition-all duration-200 overflow-hidden">
                <div className="absolute inset-0 bg-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-11 w-11 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0 group-hover:bg-destructive/20 transition-colors">
                        <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-destructive mb-1.5">Delete Account Permanently</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Complete account deletion including all data, settings, and profile information. This cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-2" />
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

            {/* Sign Out - Separate Section */}
            <div className="pt-4 border-t border-border/50">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full h-11 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
