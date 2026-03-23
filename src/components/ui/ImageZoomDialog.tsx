import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Check if running as native app (Capacitor)
const isNativeApp = () => {
  return typeof window !== 'undefined' && 
         window.matchMedia('(display-mode: standalone)').matches === false &&
         /capacitor/i.test(navigator.userAgent);
};

interface ImageZoomDialogProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageZoomDialog({ 
  images, 
  initialIndex = 0, 
  open, 
  onOpenChange 
}: ImageZoomDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const initialPinchDistance = useRef<number | null>(null);
  const initialPinchScale = useRef<number>(1);
  const isDragging = useRef(false);
  const lastDragPosition = useRef<{ x: number; y: number } | null>(null);

  // Reset state when dialog opens or image changes
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Touch handlers for pinch-to-zoom on mobile - simple and predictable
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsInteracting(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      initialPinchDistance.current = distance;
      initialPinchScale.current = scale;
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        setIsInteracting(true);
        isDragging.current = true;
        lastDragPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      
      // Simple linear scale calculation - no dampening, just direct 1:1 pinch ratio
      const ratio = currentDistance / initialPinchDistance.current;
      // Clamp between 1x and 4x - standard photo viewer range
      const newScale = Math.min(Math.max(initialPinchScale.current * ratio, 1), 4);
      
      setScale(newScale);
      
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging.current && lastDragPosition.current && scale > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastDragPosition.current.x;
      const deltaY = e.touches[0].clientY - lastDragPosition.current.y;
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      lastDragPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    setIsInteracting(false);
    initialPinchDistance.current = null;
    isDragging.current = false;
    lastDragPosition.current = null;
    
    // Snap back to 1x if very close
    if (scale < 1.1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // Double tap to toggle between 1x and 2x
  const lastTap = useRef<number>(0);
  const handleDoubleTap = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const now = Date.now();
    if (now - lastTap.current < 300) {
      e.preventDefault();
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2);
      }
    }
    lastTap.current = now;
  };

  // Mobile pinch-to-zoom view
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="max-w-full max-h-full w-full h-full p-0 bg-background border-0 rounded-none">
          <div className="relative w-full h-full flex flex-col">
            {/* Professional Header with safe area */}
            <div 
              className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-xl"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  Image {currentIndex + 1} of {images.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-lg bg-muted/50 hover:bg-muted text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Image Container with pinch-to-zoom */}
            <div 
              ref={containerRef}
              className="flex-1 flex items-center justify-center overflow-hidden touch-none bg-muted/20"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchStartCapture={handleDoubleTap}
            >
              <img
                src={images[currentIndex]}
                alt={`Image ${currentIndex + 1}`}
                className="select-none max-w-full max-h-full"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isInteracting ? 'none' : 'transform 0.2s ease-out',
                  transformOrigin: 'center center',
                  objectFit: 'contain',
                }}
                loading="eager"
                decoding="sync"
                draggable={false}
              />
            </div>

            {/* Navigation arrows - refined style */}
            {images.length > 1 && scale === 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card text-foreground shadow-lg"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card text-foreground shadow-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Zoom indicator - refined */}
            {scale > 1 && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 text-foreground text-xs font-medium shadow-lg">
                {Math.round(scale * 100)}%
              </div>
            )}

            {/* Footer with thumbnails - professional style */}
            <div 
              className="flex-shrink-0 border-t border-border bg-card/95 backdrop-blur-xl"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              {/* Hint text */}
              {scale === 1 && (
                <div className="text-center py-2 text-muted-foreground text-xs">
                  Pinch to zoom • Double tap to zoom
                </div>
              )}
              
              {/* Thumbnail Navigation */}
              {images.length > 1 && (
                <div className="px-4 pb-3 pt-1">
                  <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={cn(
                          'w-14 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0',
                          currentIndex === idx
                            ? 'border-primary ring-2 ring-primary/30 scale-105'
                            : 'border-border opacity-60 hover:opacity-100'
                        )}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="w-[92vw] xl:w-full xl:max-w-[84rem] max-h-[92vh] p-0 bg-background/95 border border-border/60 overflow-hidden rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border/60 bg-gradient-to-b from-background to-background/90">
            <div className="inline-flex items-center px-2.5 py-1 rounded-md border border-border/60 bg-muted/30 text-sm text-foreground/90 font-medium tabular-nums">
              {currentIndex + 1} / {images.length}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Container */}
          <div className="flex-1 overflow-hidden bg-black/35 p-3 md:p-4">
            <div className="w-full h-full rounded-xl border border-border/60 bg-black/25 backdrop-blur-sm p-2 md:p-3 flex items-center justify-center">
              <img
                src={images[currentIndex]}
                alt={`Image ${currentIndex + 1}`}
                className="max-w-full max-h-[78vh] object-contain select-none"
                style={{ 
                  imageRendering: 'auto',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                }}
                loading="eager"
                decoding="sync"
                draggable={false}
              />
            </div>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="absolute left-5 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/65 hover:bg-black/80 text-white shadow-xl border border-white/15 backdrop-blur-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-5 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/65 hover:bg-black/80 text-white shadow-xl border border-white/15 backdrop-blur-sm"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Thumbnail Navigation */}
          {images.length > 1 && (
            <div className="px-4 py-3 border-t border-border/60 bg-gradient-to-t from-background to-background/90">
              <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      'w-14 h-10 rounded-lg overflow-hidden border transition-all flex-shrink-0 bg-muted/20',
                      currentIndex === idx
                        ? 'border-primary ring-2 ring-primary/30 scale-105 opacity-100'
                        : 'border-border/70 hover:border-muted-foreground/60 opacity-65 hover:opacity-100'
                    )}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
