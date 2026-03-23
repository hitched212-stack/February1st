import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { usePreferences } from '@/hooks/usePreferences';
import { useNavigate, useLocation } from 'react-router-dom';
import PreferencesSettings from '@/pages/settings/PreferencesSettings';
import BillingSettings from '@/pages/settings/BillingSettings';
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, User, LogOut, Eye, EyeOff, Lock, Mail, Palette, Bell, Settings2, UserCog, ShieldCheck, Trash2, AlertTriangle, MoreVertical } from 'lucide-react';
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
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingGlobalSettings, setIsSavingGlobalSettings] = useState(false);

  // Initialize activeTab from URL parameter
  const urlParams = new URLSearchParams(location.search);
  const tabParam = urlParams.get('tab') as 'organization' | 'global' | 'user' | 'billing' | 'compliance' | null;
  const [activeTab, setActiveTab] = useState<'organization' | 'global' | 'user' | 'billing' | 'compliance'>(tabParam || 'organization');

  // Update active tab when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab') as 'organization' | 'global' | 'user' | 'billing' | 'compliance' | null;
    if (tabParam && ['organization', 'global', 'user', 'billing', 'compliance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Update time every second for live preview
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setTimeZoneInput(preferences.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [preferences.timeZone]);

  useEffect(() => {
    setNewUsername(settings.username || '');
  }, [settings.username]);

  useEffect(() => {
    setNewEmail(user?.email || '');
  }, [user?.email]);

  const handleSaveGlobalSettings = async () => {
    setIsSavingGlobalSettings(true);
    try {
      setTimeZone(timeZoneInput);
      toast.success('Global settings updated!');
    } catch (error) {
      console.error('Error saving global settings:', error);
      toast.error('Failed to update global settings');
    } finally {
      setIsSavingGlobalSettings(false);
    }
  };

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
    { id: 'global' as const, label: 'Global Settings', icon: GlobeIcon },
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
          <div className="inline-flex items-center gap-1.5 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 p-1.5 shadow-sm">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center justify-center gap-2.5 min-w-[132px] px-4 md:px-6 py-2.5 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] whitespace-nowrap rounded-xl flex-shrink-0 transform-gpu",
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-violet-600 to-[#9b8cff] text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/45"
                  )}
                >
                  <TabIcon
                    className={cn(
                      "h-4 w-4 transition-colors duration-300",
                      activeTab === tab.id ? "text-white" : "text-muted-foreground"
                    )}
                    strokeWidth={2}
                  />
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
          <div className="space-y-8 max-w-7xl w-full font-display">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="space-y-4 xl:col-span-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Profile Details</h2>
              </div>
              <div className={cn(
                "rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm",
                isGlassEnabled
                  ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                  : "border-border/40 bg-card"
              )}>
                <div className="p-6 sm:p-8 space-y-7">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="shrink-0">
                      <div className="h-24 w-24 rounded-full border-2 border-[#9b8cff]/45 bg-[#9b8cff]/10 flex items-center justify-center overflow-hidden">
                        <User className="h-10 w-10 text-[#9b8cff]" strokeWidth={1.8} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-3xl font-bold font-display tracking-tight text-foreground truncate">{settings.username || 'H1tched'}</h3>
                      <p className="mt-1 text-base font-display text-muted-foreground">
                        Date joined: {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '25/02/2026'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newUsername" className="text-sm font-semibold text-foreground/80">Username</Label>
                      <Input
                        id="newUsername"
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Enter username"
                        className="h-12 rounded-xl bg-background/60 border-border/60 font-display"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newEmail" className="text-sm font-semibold text-foreground/80">Email</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter email"
                        className="h-12 rounded-xl bg-background/60 border-border/60 font-display"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
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
                      disabled={
                        isChangingUsername ||
                        isChangingEmail ||
                        (newUsername.trim() === (settings.username || '').trim() && newEmail.trim() === (user?.email || '').trim())
                      }
                      className="h-12 px-8 rounded-2xl text-lg font-semibold font-display bg-[#9b8cff] hover:bg-[#8b79ff] text-white"
                    >
                      {(isChangingUsername || isChangingEmail) ? 'Updating...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 xl:col-span-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display text-foreground">Account Settings</h2>
              </div>
              <div className={cn(
                "rounded-2xl border overflow-hidden transition-all duration-300 shadow-sm",
                isGlassEnabled
                  ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                  : "border-border/40 bg-card"
              )}>
                <Collapsible open={showPasswordReset} onOpenChange={setShowPasswordReset}>
                  <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors text-left group">
                    <div className="h-9 w-9 rounded-xl bg-[#9b8cff]/10 flex items-center justify-center border border-[#9b8cff]/20 group-hover:border-[#9b8cff]/40 transition-colors flex-shrink-0">
                      <Lock className="h-4 w-4 text-[#9b8cff]" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold font-display text-sm text-foreground">Change Password</p>
                      <p className="text-xs font-display text-muted-foreground">Update your account password</p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all duration-300 flex-shrink-0",
                        showPasswordReset ? "rotate-180" : "rotate-0"
                      )}
                      strokeWidth={2}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/60">
                    <div className="p-4 space-y-4 bg-muted/20">
                      <div className="space-y-1.5">
                        <Label htmlFor="newPassword" className="text-xs font-medium text-foreground">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="h-10 text-sm bg-background/50 border-border/60 pr-10 font-display"
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
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="h-10 text-sm bg-background/50 border-border/60 pr-10 font-display"
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
                        className="w-full h-10 mt-1 text-sm font-display"
                      >
                        {isResettingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
            </div>

          </div>
        )}

        {/* Global Settings Tab */}
        {activeTab === 'global' && (
          <div className="w-full flex justify-center">
            <div className={cn(
              "w-full max-w-3xl rounded-3xl border p-6 sm:p-8 md:p-10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]",
              isGlassEnabled
                ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                : "border-border/40 bg-card"
            )}>
              <div className="flex items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">Global settings</h2>
                  <p className="text-sm font-display font-medium tracking-wide text-muted-foreground">Manage universal workspace defaults</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2.5 rounded-2xl border border-border/50 bg-background/40 p-4 sm:p-5">
                  <Label className="text-xs font-bold font-display uppercase tracking-widest text-foreground/70">Time Zone</Label>
                  <Select value={timeZoneInput} onValueChange={setTimeZoneInput}>
                    <SelectTrigger className="h-14 rounded-xl bg-background/70 border-border/55 px-4 text-base sm:text-lg font-bold font-display text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="Etc/UTC">UTC (UTC+00:00)</SelectItem>
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
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSaveGlobalSettings}
                    disabled={isSavingGlobalSettings || preferences.timeZone === timeZoneInput}
                    className="h-12 px-9 rounded-2xl text-lg font-bold font-display bg-[#9b8cff] hover:bg-[#8b79ff] text-white"
                  >
                    {isSavingGlobalSettings ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              <div className="mt-7 text-xs font-display text-muted-foreground/80">
                Current time preview: {getTimeInTimezone(currentTime, timeZoneInput)}
              </div>
            </div>
          </div>
        )}

        {/* User & Permissions Tab */}
        {activeTab === 'user' && (
          <div className="space-y-6 max-w-7xl w-full font-display">
            <div>
              <PreferencesSettings embedded />
            </div>

          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6 max-w-7xl w-full font-display">
            <div>
              <h3 className="text-lg font-semibold font-display text-foreground mb-4">Billing</h3>
              <BillingSettings embedded />
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-6 max-w-7xl w-full font-display">
            <div className={cn(
              "rounded-3xl border p-4 sm:p-5",
              isGlassEnabled
                ? "border-white/10 bg-card/85 backdrop-blur-2xl"
                : "border-border/50 bg-card"
            )}>
              <h3 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">Danger Zone</h3>
              <p className="mt-1 text-sm font-display text-muted-foreground max-w-3xl">
                Permanent actions for your account. Review each option carefully before continuing.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/55 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="h-4.5 w-4.5 text-destructive" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold font-display tracking-tight text-foreground">Erase All Trading Data</h4>
                    <p className="mt-1 text-sm font-display text-muted-foreground leading-relaxed">
                      Permanently remove your trades, charts, and journal entries. Your account and settings remain untouched.
                    </p>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 w-full rounded-lg border-destructive/30 text-destructive/90 text-sm font-semibold font-display hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
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

              <div className="rounded-2xl border border-destructive/25 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4.5 w-4.5 text-destructive" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold font-display tracking-tight text-foreground">Delete Account Permanently</h4>
                    <p className="mt-1 text-sm font-display text-muted-foreground leading-relaxed">
                      Delete your account, profile, settings, and all associated data. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 w-full rounded-lg border-destructive/35 text-destructive/95 text-sm font-semibold font-display hover:bg-destructive/10"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
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

            <div className="rounded-2xl border border-border/50 bg-card p-2.5 sm:p-3">
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full h-10 rounded-xl text-muted-foreground text-sm font-display hover:text-foreground hover:bg-muted/45"
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
