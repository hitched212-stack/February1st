import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function ComingSoonDialog({ open, onOpenChange, featureName }: ComingSoonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 !border-0 shadow-2xl overflow-hidden [&>button]:z-50 [&>button]:text-white">
        <div className="relative w-full h-full bg-gradient-to-br from-violet-600 via-violet-700 to-violet-800 p-6">
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer" />
          
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
          
          <DialogHeader className="relative pt-6">
            <DialogTitle className="text-sm font-semibold uppercase tracking-widest text-violet-100 text-center">
              Coming Soon
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 text-center space-y-3 relative">
            <p className="text-base font-medium text-white/90 leading-relaxed px-4">
              {featureName ? `${featureName} feature will be available soon.` : 'Bug reporting feature will be available soon.'}
            </p>
            <p className="text-sm text-violet-200/80">
              Stay tuned for updates!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
