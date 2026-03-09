import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette, Check, Plus, Trash } from 'lucide-react';
import { usePreferences, ColorPreset } from '@/hooks/usePreferences';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeSwitch } from '@/components/ui/theme-switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ColorRowProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorRow({ label, description, value, onChange }: ColorRowProps) {
  return (
    <div className="group flex items-center justify-between py-4 border-b border-border/40 last:border-0">
      <div className="flex-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] px-2.5 py-1 rounded-md border border-border/60 bg-background/60 text-muted-foreground font-mono uppercase tracking-wide">
          {value}
        </span>
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
          />
          <div
            className="w-10 h-10 rounded-xl border border-border/50 cursor-pointer shadow-sm transition-all duration-200 group-hover:scale-105"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>
    </div>
  );
}

interface PresetChipProps {
  preset: ColorPreset;
  isActive: boolean;
  onSelect: () => void;
}

function PresetChip({ preset, isActive, onSelect }: PresetChipProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all duration-200 text-sm",
        isActive
          ? "border-violet-400/30 bg-violet-500/10 shadow-[0_0_0_1px_rgba(155,140,255,0.25)]"
          : "border-border/50 bg-transparent hover:bg-muted/50"
      )}
    >
      <div className="flex -space-x-1">
        <div
          className="w-4 h-4 rounded-full border border-background"
          style={{ backgroundColor: preset.winColor }}
        />
        <div
          className="w-4 h-4 rounded-full border border-background"
          style={{ backgroundColor: preset.lossColor }}
        />
      </div>
      <span className="text-foreground font-medium">{preset.name}</span>
      {isActive && (
        <Check className="h-3.5 w-3.5 text-violet-300" strokeWidth={2.2} />
      )}
    </button>
  );
}

interface PreferencesSettingsProps {
  embedded?: boolean;
}

export default function PreferencesSettings({ embedded = false }: PreferencesSettingsProps) {
  const navigate = useNavigate();
  const { preferences, setTheme, setCustomColor, createPreset, deletePreset, applyPreset } = usePreferences();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const activePreset = preferences.presets.find((preset) => preset.id === preferences.activePresetId);

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) {
      toast({
        title: 'Preset name required',
        description: 'Please enter a name for the preset.',
        variant: 'destructive',
      });
      return;
    }

    createPreset(newPresetName.trim());
    setNewPresetName('');
    setShowCreateDialog(false);
    toast({
      title: 'Preset created',
      description: `"${newPresetName.trim()}" has been saved`,
    });
  };

  const handleDeletePreset = () => {
    if (preferences.activePresetId && preferences.activePresetId !== 'default') {
      const presetName = activePreset?.name;
      deletePreset(preferences.activePresetId);
      setShowDeleteDialog(false);
      toast({
        title: 'Preset deleted',
        description: `"${presetName}" has been removed`,
      });
    }
  };

  const handleColorChange = (key: keyof typeof preferences.customColors, value: string) => {
    setCustomColor(key, value);
  };

  return (
    <div className={embedded ? '' : 'min-h-screen pb-24'}>
      {!embedded && (
        <header className="px-4 pt-6 pb-8 md:px-6 lg:px-8">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center border border-border/50">
              <Palette className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Appearance</h1>
              <p className="text-sm text-muted-foreground">Customize your trading interface</p>
            </div>
          </div>
        </header>
      )}

      <div className={embedded ? 'max-w-4xl space-y-8' : 'px-4 md:px-6 lg:px-8 max-w-4xl'}>
        <div className="space-y-6">
          {/* Theme Section */}
          <section className="space-y-4 rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Theme</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Choose your preferred color scheme
              </p>
            </div>
            <ThemeSwitch value={preferences.theme} onChange={setTheme} />
          </section>

          {/* Presets Section */}
          <section className="space-y-4 rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Color Presets</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Save and apply custom color schemes (synced across devices)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateDialog(true)}
                  className="h-8 text-xs gap-1.5 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Save
                </Button>
                {preferences.activePresetId !== 'default' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-8 text-xs gap-1.5 rounded-lg text-destructive hover:text-destructive"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferences.presets.map((preset) => (
                <PresetChip
                  key={preset.id}
                  preset={preset}
                  isActive={preferences.activePresetId === preset.id}
                  onSelect={() => applyPreset(preset)}
                />
              ))}
            </div>
          </section>

          {/* Colors Section */}
          <section className="space-y-4 rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Custom Colors</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Fine-tune your interface colors
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/40 px-4">
              <ColorRow
                label="Profit Color"
                description="Color for positive P&L values"
                value={preferences.customColors.winColor}
                onChange={(v) => handleColorChange('winColor', v)}
              />
              <ColorRow
                label="Loss Color"
                description="Color for negative P&L values"
                value={preferences.customColors.lossColor}
                onChange={(v) => handleColorChange('lossColor', v)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md font-semibold border border-emerald-500/30 bg-emerald-500/10" style={{ color: preferences.customColors.winColor }}>
                +$420
              </span>
              <span className="px-2.5 py-1 rounded-md font-semibold border border-red-500/30 bg-red-500/10" style={{ color: preferences.customColors.lossColor }}>
                -$125
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* Create Preset Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Save Preset</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter preset name"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePreset()}
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePreset}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Preset Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{activePreset?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePreset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
