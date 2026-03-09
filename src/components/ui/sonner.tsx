import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isMobile ? "top-center" : "top-right"}
      duration={3000}
      closeButton
      style={isMobile ? { 
        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        pointerEvents: 'none',
      } : undefined}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:pointer-events-auto group-[.toaster]:relative group-[.toaster]:flex group-[.toaster]:items-start group-[.toaster]:gap-2.5 group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:border-border/60 group-[.toaster]:bg-background/92 group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_14px_36px_rgba(0,0,0,0.35)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:ring-1 group-[.toaster]:ring-inset group-[.toaster]:ring-white/5 group-[.toaster]:px-4 group-[.toaster]:pr-12 group-[.toaster]:py-3.5",
          title: "group-[.toast]:text-sm group-[.toast]:font-display group-[.toast]:font-semibold group-[.toast]:tracking-wide",
          description: "group-[.toast]:text-xs group-[.toast]:font-display group-[.toast]:font-medium group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:h-8 group-[.toast]:rounded-lg group-[.toast]:border group-[.toast]:border-border/60 group-[.toast]:bg-muted/50 group-[.toast]:px-3 group-[.toast]:text-xs group-[.toast]:font-display group-[.toast]:font-semibold group-[.toast]:text-foreground hover:group-[.toast]:bg-muted",
          cancelButton: "group-[.toast]:h-8 group-[.toast]:rounded-lg group-[.toast]:border group-[.toast]:border-border/60 group-[.toast]:bg-muted/30 group-[.toast]:px-3 group-[.toast]:text-xs group-[.toast]:font-display group-[.toast]:font-semibold group-[.toast]:text-muted-foreground hover:group-[.toast]:bg-muted/50",
          closeButton: "text-foreground/80",
          success: "group-[.toaster]:border-pnl-positive/35 group-[.toaster]:bg-pnl-positive/10",
          error: "group-[.toaster]:border-pnl-negative/35 group-[.toaster]:bg-pnl-negative/10",
          warning: "group-[.toaster]:border-yellow-500/35 group-[.toaster]:bg-yellow-500/10",
          info: "group-[.toaster]:border-[#9b8cff]/35 group-[.toaster]:bg-[#9b8cff]/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
