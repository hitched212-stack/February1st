import { Pencil, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface StatItem {
  label: string;
  value: string;
}

export interface ExpandableGalleryCardProps {
  title: string;
  subtitle?: string;
  symbol?: string;
  image?: string | null;
  images?: string[];
  placeholderIcon?: React.ReactNode;
  buttonLabel?: string;
  onButtonClick?: () => void;
  onViewClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  onImageClick?: () => void;
  onFavoriteClick?: (e: React.MouseEvent) => void;
  isFavorite?: boolean;
  stats?: StatItem[];
  details?: StatItem[];
  description?: string;
  isGlassEnabled?: boolean;
}

export function ExpandableGalleryCard({
  title,
  subtitle,
  symbol,
  image,
  images,
  placeholderIcon,
  onViewClick,
  onEditClick,
  onDeleteClick,
  onImageClick,
  stats,
  details,
  isGlassEnabled = false,
}: ExpandableGalleryCardProps) {
  const allImages = images || (image ? [image] : []);
  const displayStats = stats || details;

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewClick) {
      onViewClick();
    }
  };

  return (
    <>
      <Card
        className={cn(
          'rounded-xl border overflow-hidden transition-all duration-300 group relative',
          'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
          isGlassEnabled
            ? 'border-border/50 bg-card/95 dark:bg-card/80 backdrop-blur-xl'
            : 'bg-card border-border/50 shadow-sm'
        )}
      >
        {/* Dot pattern - only show when glass is enabled */}
        {isGlassEnabled && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`gallery-card-${title.replace(/\s/g, '-')}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" className="fill-foreground/[0.08] dark:fill-foreground/[0.04]" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#gallery-card-${title.replace(/\s/g, '-')})`} />
          </svg>
        )}
        {/* Image Section - Full width at top */}
        <div 
          className="relative aspect-[16/9] overflow-hidden cursor-pointer"
          onClick={handleImageClick}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center">
              {placeholderIcon || (
                <span className="text-muted-foreground text-xs">No image</span>
              )}
            </div>
          )}
          {displayStats && displayStats.length > 0 && (
            <div className="absolute left-3 bottom-3 flex flex-wrap gap-2">
              {displayStats.map((stat, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-background/85 text-foreground text-[11px] px-2.5 py-1 border border-border/50 shadow-sm"
                >
                  <span className="text-muted-foreground mr-1">{stat.label}:</span>
                  <span className="font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Title Section */}
        {title && (
          <div className="px-4 py-2">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/90 truncate">
              {title}
            </div>
          </div>
        )}

        {/* Footer with Stats, Title and Menu */}
        <div className="bg-muted/30 border-t border-border/50 relative z-10">
          <Separator className="bg-border/50" />
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {subtitle && (
                <span className="text-[10px] text-muted-foreground bg-background/50 border border-border/50 rounded-md px-2 py-0.5 truncate">
                  {subtitle}
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent active:bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onViewClick && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onViewClick();
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                )}
                {onEditClick && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEditClick();
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDeleteClick && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick();
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

    </>
  );
}
