import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Theme } from '@/hooks/usePreferences';

const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'system', icon: Monitor, label: 'System preference' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
];

interface ThemeSwitchProps {
  value: Theme;
  onChange: (value: Theme) => void;
}

export function ThemeSwitch({ value, onChange }: ThemeSwitchProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {themes.map((theme) => {
        const Icon = theme.icon;
        const isActive = value === theme.value;
        
        return (
          <button
            key={theme.value}
            onClick={() => onChange(theme.value)}
            className={cn(
              "group relative rounded-3xl border overflow-hidden text-left transform-gpu transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10",
              isActive
                ? "border-violet-400/50 shadow-[0_0_0_1px_rgba(155,140,255,0.35)]"
                : "border-border/50 hover:border-border"
            )}
          >
            {/* Preview Window */}
            <div className={cn(
              "h-28 relative flex flex-col",
              theme.value === 'light'
                ? 'bg-[#f7f7f8]'
                : theme.value === 'dark'
                  ? 'bg-[#17181c]'
                  : 'bg-gradient-to-b from-[#ececef] via-[#b2b3b7] to-[#0f1014]'
            )}>
              {/* Window Header */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-3 border-b",
                theme.value === 'light'
                  ? 'bg-[#efeff1] border-[#d9d9dd]'
                  : theme.value === 'dark'
                    ? 'bg-[#222329] border-[#32333a]'
                    : 'bg-[#d9d9db]/60 border-[#c8c8cc]/70'
              )}>
                <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f57]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[#28c940]" />
              </div>

              {/* Content Lines */}
              <div className="flex-1 flex flex-col justify-center px-5 py-3 gap-2.5">
                <div className={cn(
                  "h-2.5 rounded-full",
                  theme.value === 'light'
                    ? 'bg-[#c9c9cc]'
                    : theme.value === 'dark'
                      ? 'bg-[#3f4048]'
                      : 'bg-[#c9c9cc]/85'
                )} />
                <div className={cn(
                  "h-2.5 rounded-full w-3/4",
                  theme.value === 'light'
                    ? 'bg-[#c9c9cc]'
                    : theme.value === 'dark'
                      ? 'bg-[#3f4048]'
                      : 'bg-[#c9c9cc]/85'
                )} />
              </div>
            </div>

            {/* Label */}
            <div className="px-4 py-3 bg-card/50 border-t border-border/40 flex items-center justify-center gap-2.5">
              <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
              <p className="text-sm font-semibold text-foreground">{theme.label}</p>
            </div>

            {/* Active Indicator */}
            {isActive && (
              <>
                <div className="absolute inset-0 rounded-3xl ring-2 ring-violet-300/80 pointer-events-none" />
                <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-violet-300 shadow-[0_0_0_4px_rgba(155,140,255,0.2)]" />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
