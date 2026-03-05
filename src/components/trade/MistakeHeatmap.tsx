import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MistakeHeatmapProps {
  mistakeTagsAnalysis: {
    heatmapData: Map<string, Map<string, number>>;
    mistakeHeatmaps: Map<string, Map<string, Map<string, number>>>;
    days: string[];
    hours: string[];
    maxMistakesInCell: number;
  };
}

export function MistakeHeatmap({ mistakeTagsAnalysis }: MistakeHeatmapProps) {
  const [selectedMistake, setSelectedMistake] = useState<string | null>(null);

  // Listen for external filter changes
  useEffect(() => {
    const handleFilterChange = () => {
      const appWindow = window as Window & {
        __selectedMistakeFilter?: string | null;
      };
      const filter = appWindow.__selectedMistakeFilter;
      setSelectedMistake(filter);
    };

    document.addEventListener('mistakeFilterChanged', handleFilterChange);
    return () => document.removeEventListener('mistakeFilterChanged', handleFilterChange);
  }, []);

  // Get the appropriate heatmap data based on selected filter
  const currentHeatmap = selectedMistake 
    ? mistakeTagsAnalysis.mistakeHeatmaps.get(selectedMistake) || mistakeTagsAnalysis.heatmapData
    : mistakeTagsAnalysis.heatmapData;

  // Calculate max for the current heatmap
  let maxForCurrentHeatmap = 0;
  currentHeatmap.forEach(dayMap => {
    dayMap.forEach(count => {
      maxForCurrentHeatmap = Math.max(maxForCurrentHeatmap, count);
    });
  });

  return (
    <div className="space-y-2 pt-2 border-t border-border/40">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        When Mistakes Happen
      </p>
      
      {selectedMistake && (
        <p className="text-[10px] text-muted-foreground">
          Showing: <span className="text-foreground font-medium">{selectedMistake}</span>
        </p>
      )}

      <div className="space-y-1.5 overflow-x-auto">
        {mistakeTagsAnalysis.days.map((day) => (
          <div key={day} className="flex items-center gap-2">
            <p className="text-[10px] font-medium text-muted-foreground w-8 flex-shrink-0">{day}</p>
            <div className="flex gap-0.5 flex-wrap">
              {mistakeTagsAnalysis.hours.map((hour) => {
                const count = currentHeatmap.get(day)?.get(hour) || 0;
                
                // Use absolute thresholds for better color distribution
                // 1 mistake = yellow, 2-3 = orange, 4+ = red
                const getColorClass = () => {
                  if (count === 0) return "bg-muted/30 border border-border/40";
                  if (count === 1) return "bg-yellow-500/40 border border-yellow-500/40";
                  if (count <= 3) return "bg-orange-500/60 border border-orange-500/60";
                  return "bg-red-500/80 border border-red-500/80";
                };
                
                return (
                  <Tooltip key={`${day}-${hour}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-sm cursor-pointer transition-all hover:scale-110",
                          getColorClass()
                        )}
                        title={`${day} ${hour}: ${count} ${selectedMistake || 'mistakes'}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {day} {hour}: {count} {count === 1 ? 'mistake' : 'mistakes'}
                        {selectedMistake && <><br/><span className="text-muted-foreground">({selectedMistake})</span></>}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-yellow-500/40 border border-yellow-500/40" />
          <span className="text-[10px] font-medium text-muted-foreground">1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-orange-500/60 border border-orange-500/60" />
          <span className="text-[10px] font-medium text-muted-foreground">2-3</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-red-500/80 border border-red-500/80" />
          <span className="text-[10px] font-medium text-muted-foreground">4+</span>
        </div>
      </div>
    </div>
  );
}
