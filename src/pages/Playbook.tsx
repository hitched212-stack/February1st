import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Trash2, X, FolderPlus, Check, Calendar, MoreVertical } from 'lucide-react';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageZoomDialog } from '@/components/ui/ImageZoomDialog';
import { ExpandableGalleryCard } from '@/components/ui/ExpandableGalleryCard';
import { FolderDialog } from '@/components/folders/FolderDialog';
import { ImageUpload } from '@/components/trade/ImageUpload';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import { cn } from '@/lib/utils';
import { usePreferences } from '@/hooks/usePreferences';
import { usePlaybook, PlaybookSetupInsert, PlaybookSetup } from '@/hooks/usePlaybook';
import { useFolders, Folder } from '@/hooks/useFolders';
import { useAuth } from '@/hooks/useAuth';
import { useTradingPreferences } from '@/hooks/useTradingPreferences';
import { getFilteredTimeframes, getTimeframeLabel } from '@/lib/timeframes';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { NEWS_IMPACTS, NewsImpact } from '@/types/trade';
import { NewsEventSelector } from '@/components/trade/NewsEventSelector';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCard } from '@/components/ui/SortableCard';

// Custom news/globe icon
const NewsIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const SESSIONS = ['London', 'New York', 'Asian', 'Sydney', 'Overlap'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ChartAnalysis {
  id: string;
  timeframe: string;
  images: string[];
  notes: string;
}

const createEmptyChart = (): ChartAnalysis => ({
  id: crypto.randomUUID(),
  timeframe: '4h',
  images: [],
  notes: ''
});

export default function Playbook() {
  const { preferences } = usePreferences();
  const isGlassEnabled = preferences.liquidGlassEnabled ?? false;
  const { user } = useAuth();
  const { folders, isLoading: foldersLoading, createFolder, updateFolder, deleteFolder, duplicateFolder } = useFolders('playbook');
  const { setups: allSetups = [], isLoading: setupsLoading } = usePlaybook();

  // Show skeleton while initial load is happening
  const isInitialLoading = foldersLoading || setupsLoading;
  const showSkeleton = isInitialLoading && folders.length === 0 && allSetups.length === 0;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<PlaybookSetup | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<Folder | null>(null);
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  // Folder dialogs
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const { createSetup, updateSetup, deleteSetup, toggleFavorite, reorderSetups } = usePlaybook(activeFolderId);
  
  const { selectedTimeframes } = useTradingPreferences();
  const timeframeOptions = getFilteredTimeframes(selectedTimeframes);
  
  // Multi-chart state
  const [charts, setCharts] = useState<ChartAnalysis[]>([createEmptyChart()]);
  
  // Chart management functions
  const addChart = () => setCharts([...charts, createEmptyChart()]);
  const updateChart = (id: string, field: keyof ChartAnalysis, value: any) => {
    setCharts(charts.map(chart => chart.id === id ? { ...chart, [field]: value } : chart));
  };
  const removeChart = (id: string) => {
    if (charts.length > 1) setCharts(charts.filter(chart => chart.id !== id));
  };
  
  // Form state
  const [formData, setFormData] = useState<PlaybookSetupInsert>({
    name: '',
    folder_id: '',
    symbol: '',
    timeframe: '4h',
    images: [],
    is_favorite: false,
    session: '',
    day_of_week: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    entry_time: '',
    has_news: false,
    news_impact: '',
    news_events: [],
    notes: '',
  });
  
  // Get setups for a folder
  const getSetupsForFolder = (folderId: string) => 
    allSetups.filter(s => s.folder_id === folderId);

  const getSetupCount = (folderId: string) => getSetupsForFolder(folderId).length;

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getSetupsForFolder(folder.id).some(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  useEffect(() => {
    if (!filteredFolders.length) {
      setActiveFolderId(null);
      return;
    }

    if (!activeFolderId || !filteredFolders.some(folder => folder.id === activeFolderId)) {
      setActiveFolderId(filteredFolders[0].id);
    }
  }, [activeFolderId, filteredFolders]);

  const handleCreate = async () => {
    if (!activeFolderId) {
      toast.error('Please select a folder');
      return;
    }
    
    const nameToUse = formData.name.trim() || 'Untitled';
    
    // Combine all chart images and notes
    const allImages = charts.flatMap(c => c.images);
    const allNotes = charts
      .filter(c => c.images.length > 0 || c.notes.trim())
      .map(c => `[${getTimeframeLabel(c.timeframe)}]\n${c.notes}`)
      .join('\n\n');
    
    await createSetup.mutateAsync({
      ...formData,
      name: nameToUse,
      folder_id: activeFolderId,
      images: allImages,
      notes: allNotes,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedSetup) {
      return;
    }
    
    const nameToUse = formData.name.trim() || 'Untitled';
    
    // Combine all chart images and notes
    const allImages = charts.flatMap(c => c.images);
    const allNotes = charts
      .filter(c => c.images.length > 0 || c.notes.trim())
      .map(c => `[${getTimeframeLabel(c.timeframe)}]\n${c.notes}`)
      .join('\n\n');
    
    await updateSetup.mutateAsync({
      id: selectedSetup.id,
      ...formData,
      name: nameToUse,
      images: allImages,
      notes: allNotes,
    });
    setIsEditOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      folder_id: '',
      symbol: '',
      timeframe: '4h',
      images: [],
      is_favorite: false,
      session: '',
      day_of_week: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      entry_time: '',
      has_news: false,
      news_impact: '',
      news_events: [],
      notes: '',
    });
    setCharts([createEmptyChart()]);
  };

  const handleDelete = async (id: string) => {
    await deleteSetup.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  const openView = (setup: PlaybookSetup) => {
    setSelectedSetup(setup);
    setIsViewOpen(true);
  };

  // Parse notes to extract chart sections
  const parseNotesToCharts = (notes: string, images: string[]): ChartAnalysis[] => {
    if (!notes && images.length === 0) return [createEmptyChart()];
    
    const regex = /\[([^\]]+)\]\n?([\s\S]*?)(?=\[|$)/g;
    const parsedCharts: ChartAnalysis[] = [];
    let match;
    let imageIndex = 0;
    
    while ((match = regex.exec(notes)) !== null) {
      const timeframeLabel = match[1];
      const chartNotes = match[2]?.trim() || '';
      const timeframe = timeframeOptions.find(tf => getTimeframeLabel(tf.value) === timeframeLabel)?.value || '4h';
      
      parsedCharts.push({
        id: crypto.randomUUID(),
        timeframe,
        images: images.slice(imageIndex, imageIndex + 1),
        notes: chartNotes
      });
      imageIndex++;
    }
    
    // If no timeframe markers found, create single chart with all data
    if (parsedCharts.length === 0) {
      return [{
        id: crypto.randomUUID(),
        timeframe: '4h',
        images: images,
        notes: notes
      }];
    }
    
    return parsedCharts;
  };

  const openEdit = (setup: PlaybookSetup) => {
    setSelectedSetup(setup);
    setActiveFolderId(setup.folder_id || null);
    setFormData({
      name: setup.name,
      folder_id: setup.folder_id || '',
      symbol: setup.symbol || '',
      timeframe: setup.timeframe || '4h',
      images: setup.images || [],
      is_favorite: setup.is_favorite || false,
      session: setup.session || '',
      day_of_week: setup.day_of_week || '',
      date: setup.date || format(new Date(), 'yyyy-MM-dd'),
      entry_time: setup.entry_time || '',
      has_news: setup.has_news || false,
      news_impact: setup.news_impact || '',
      news_events: setup.news_events || [],
      notes: setup.notes || '',
    });
    // Parse existing notes/images into charts
    setCharts(parseNotesToCharts(setup.notes || '', setup.images || []));
    setIsEditOpen(true);
  };

  const openCreateInFolder = (folderId: string) => {
    setActiveFolderId(folderId);
    resetForm();
    setIsCreateOpen(true);
  };

  const handleFolderSave = async (name: string, description: string, color: string) => {
    if (editingFolder) {
      await updateFolder.mutateAsync({ id: editingFolder.id, name, description, color });
    } else {
      await createFolder.mutateAsync({ name, description, color, type: 'playbook' });
    }
    setIsFolderDialogOpen(false);
    setEditingFolder(null);
  };

  const handleFolderDelete = async () => {
    if (deleteFolderConfirm) {
      await deleteFolder.mutateAsync(deleteFolderConfirm.id);
      setDeleteFolderConfirm(null);
    }
  };

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-5 py-4">
      {/* Name & Symbol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Name</Label>
          <Input
            placeholder="E.g., London Breakout Setup"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="h-10 rounded-xl bg-muted/30 border-border/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Symbol / Pair</Label>
          <Input
            value={formData.symbol || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
            placeholder="e.g. EURUSD, NAS100"
            className="h-10 rounded-xl bg-muted/30 border-border/50 uppercase"
          />
        </div>
      </div>

      {/* Date & Day of Week */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Date</Label>
          <div className="flex rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-center px-3 bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="w-px bg-border/50" />
            <input
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="flex-1 h-10 bg-transparent text-sm px-3 text-foreground focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-50 dark:[&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Day of Week</Label>
          <Select
            value={formData.day_of_week || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: value }))}
          >
            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/50">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Session & Timing */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Session</Label>
          <Select
            value={formData.session || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, session: value }))}
          >
            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/50">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {SESSIONS.map((session) => (
                <SelectItem key={session} value={session}>{session}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Entry Time</Label>
          <Input
            type="time"
            value={formData.entry_time || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, entry_time: e.target.value }))}
            className="h-10 rounded-xl bg-muted/30 border-border/50"
          />
        </div>
      </div>

      {/* News Section */}
      <NewsEventSelector
        date={formData.date || null}
        hasNews={formData.has_news || false}
        selectedEvents={formData.news_events || []}
        newsImpact={formData.news_impact || ''}
        onHasNewsChange={(hasNews) => setFormData(p => ({ ...p, has_news: hasNews }))}
        onNewsSelect={(title, impact) => setFormData(p => ({ ...p, news_impact: impact }))}
        onMultiNewsSelect={(events) => setFormData(p => ({ 
          ...p, 
          news_events: events,
          news_impact: events.length > 0 ? events[0].impact : ''
        }))}
      />

      {/* Multi-Chart Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">Chart Analysis</Label>
          <Button type="button" variant="outline" size="sm" onClick={addChart} className="h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Add Chart
          </Button>
        </div>
        
        {charts.map((chart) => (
          <div key={chart.id} className="space-y-3 p-4 rounded-lg border border-border bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-2">
              <Select 
                value={chart.timeframe} 
                onValueChange={(value) => updateChart(chart.id, 'timeframe', value)}
              >
                <SelectTrigger className="w-28 h-7 bg-muted/50 border-border text-xs">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {timeframeOptions.map(tf => (
                    <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {charts.length > 1 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="ml-auto h-6 w-6 text-muted-foreground hover:text-destructive" 
                  onClick={() => removeChart(chart.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <ImageUpload 
              images={chart.images} 
              onChange={(images) => updateChart(chart.id, 'images', images)} 
              maxImages={5} 
              timeframeLabel={getTimeframeLabel(chart.timeframe)} 
            />
            <RichTextEditor 
              placeholder="Your analysis notes for this timeframe..." 
              value={chart.notes} 
              onChange={(text) => updateChart(chart.id, 'notes', text)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const handleToggleFavorite = async (e: React.MouseEvent, setup: PlaybookSetup) => {
    e.stopPropagation();
    await toggleFavorite.mutateAsync({ id: setup.id, is_favorite: !setup.is_favorite });
  };

  const totalSetups = allSetups.length;
  const totalFolders = folders.length;
  const sessionCounts = allSetups.reduce<Record<string, number>>((acc, setup) => {
    const session = setup.session?.trim();
    if (session) {
      acc[session] = (acc[session] || 0) + 1;
    }
    return acc;
  }, {});
  const strategyCounts = allSetups.reduce<Record<string, number>>((acc, setup) => {
    const strategy = setup.category?.trim();
    if (strategy) {
      acc[strategy] = (acc[strategy] || 0) + 1;
    }
    return acc;
  }, {});
  
  // Calculate average entry time
  const getAverageEntryTime = (setups: PlaybookSetup[]) => {
    const timesWithSetups = setups.filter(s => s.entry_time && s.entry_time.trim());
    if (timesWithSetups.length === 0) return '—';
    
    const totalMinutes = timesWithSetups.reduce((sum, setup) => {
      const [hours, minutes] = setup.entry_time!.split(':').map(Number);
      return sum + (hours * 60 + minutes);
    }, 0);
    
    const avgMinutes = Math.round(totalMinutes / timesWithSetups.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Calculate most common trading day
  const getDayOfWeekCounts = (setups: PlaybookSetup[]) => {
    const dayCounts = setups.reduce<Record<string, number>>((acc, setup) => {
      const day = setup.day_of_week?.trim();
      if (day) {
        acc[day] = (acc[day] || 0) + 1;
      }
      return acc;
    }, {});
    return Object.entries(dayCounts).length > 0 ? Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0] : '—';
  };
  
  const topSessionEntry = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1])[0];
  const topSessionLabel = topSessionEntry?.[0] || '—';
  const topStrategyEntry = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1])[0];
  const topStrategyLabel = topStrategyEntry?.[0] || '—';
  const activeFolder = filteredFolders.find(folder => folder.id === activeFolderId) || null;
  const activeFolderSetups = activeFolder ? getSetupsForFolder(activeFolder.id) : [];
  const activeFolderCount = activeFolder ? getSetupCount(activeFolder.id) : 0;
  const avgEntryTime = getAverageEntryTime(activeFolderSetups);
  const mostCommonDay = getDayOfWeekCounts(activeFolderSetups);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 relative">
        <div className="px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1 h-5 rounded-full bg-[#9b8cff]" />
              <div className="min-w-0">
                <h1 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Playbook</h1>
                <p className="hidden sm:block text-xs text-muted-foreground truncate">Organize and refine your trading setups</p>
              </div>
            </div>
            <div className="rounded-full border border-border/40 bg-card/95 backdrop-blur-xl p-1 shadow-sm hover:shadow-md transition-all">
              <Button
                size="sm"
                variant="ghost"
                className="h-10 rounded-full gap-2 px-4 text-foreground hover:bg-muted/30"
                onClick={() => {
                  setEditingFolder(null);
                  setIsFolderDialogOpen(true);
                }}
              >
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline font-display font-bold tabular-nums">New Folder</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 md:px-6 space-y-6 relative z-10">
        {/* Content */}
        {showSkeleton ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FolderPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No folders yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first folder to organize your setups</p>
            <Button
              onClick={() => setIsFolderDialogOpen(true)}
              variant="outline"
              className="rounded-2xl gap-2 bg-card/60 border-border/50 shadow-sm hover:bg-card"
            >
              <FolderPlus className="h-4 w-4" />
              Create Folder
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Folder Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {filteredFolders.map((folder) => {
                const count = getSetupCount(folder.id);
                const isActive = folder.id === activeFolder?.id;
                return (
                  <div key={folder.id} className="relative">
                    <button
                      onClick={() => setActiveFolderId(folder.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-sm font-medium border transition-colors whitespace-nowrap",
                        isActive
                          ? "bg-white text-black border-black/10 dark:bg-black dark:text-white dark:border-white/10"
                          : "bg-muted/50 text-foreground border-border/50 hover:bg-muted"
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: folder.color || '#8b5cf6' }}
                      />
                      <span>{folder.name}</span>
                      <span
                        className={cn(
                          "min-w-[1.5rem] h-5 rounded-full text-xs flex items-center justify-center px-1",
                          isActive ? "bg-black/5 text-black dark:bg-white/10 dark:text-white" : "bg-foreground/10 text-foreground"
                        )}
                      >
                        {count}
                      </span>
                      {isActive && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <span
                              className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                              onClick={(event) => event.stopPropagation()}
                              role="button"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingFolder(folder);
                                setIsFolderDialogOpen(true);
                              }}
                            >
                              Edit Folder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateFolder.mutate(folder)}>
                              Duplicate Folder
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteFolderConfirm(folder)}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete Folder
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Active Folder Header with Metrics */}
            {activeFolder && (
              <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/60 p-4">
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: activeFolder.color || '#8b5cf6' }}
                  />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{activeFolder.name}</div>
                    <div className="text-xs text-muted-foreground">{activeFolderCount} setups</div>
                  </div>
                </div>
                
                {/* Metrics */}
                <div className="hidden lg:flex items-center gap-4 px-4 border-l border-border/50">
                  <div className="text-center">
                    <div className="text-xs font-medium text-muted-foreground">Top Session</div>
                    <div className="text-sm font-semibold text-foreground">{topSessionLabel}</div>
                  </div>
                  <div className="w-px h-6 bg-border/50" />
                  <div className="text-center">
                    <div className="text-xs font-medium text-muted-foreground">Top Strategy</div>
                    <div className="text-sm font-semibold text-foreground">{topStrategyLabel}</div>
                  </div>
                  <div className="w-px h-6 bg-border/50" />
                  <div className="text-center">
                    <div className="text-xs font-medium text-muted-foreground">Avg Entry Time</div>
                    <div className="text-sm font-semibold text-foreground">{avgEntryTime}</div>
                  </div>
                  <div className="w-px h-6 bg-border/50" />
                  <div className="text-center">
                    <div className="text-xs font-medium text-muted-foreground">Most Common Day</div>
                    <div className="text-sm font-semibold text-foreground">{mostCommonDay}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => openCreateInFolder(activeFolder.id)}
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Add Setup
                  </Button>
                </div>
              </div>
            )}

            {/* Active Folder Content */}
            {activeFolder && (
              activeFolderSetups.length === 0 ? (
                <div className="flex items-center justify-between py-4 px-2 text-sm text-muted-foreground">
                  <span>No setups yet</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs gap-1.5"
                    onClick={() => openCreateInFolder(activeFolder.id)}
                  >
                    <Plus className="h-3 w-3" />
                    Add Setup
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        const oldIndex = activeFolderSetups.findIndex((s) => s.id === active.id);
                        const newIndex = activeFolderSetups.findIndex((s) => s.id === over.id);
                        const newOrder = arrayMove(activeFolderSetups, oldIndex, newIndex);
                        reorderSetups.mutate(newOrder.map(s => s.id));
                      }
                    }}
                  >
                    <SortableContext
                      items={activeFolderSetups.map(s => s.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeFolderSetups.map((setup) => (
                          <SortableCard key={setup.id} id={setup.id}>
                            <ExpandableGalleryCard
                              title={setup.name}
                              subtitle={[
                                setup.entry_time || '',
                                setup.date ? format(new Date(setup.date), 'MMM d') : '',
                                setup.day_of_week || ''
                              ].filter(Boolean).join(' • ')}
                              image={setup.images?.[0]}
                              symbol={setup.symbol}
                              isFavorite={setup.is_favorite}
                              onFavoriteClick={(e) => handleToggleFavorite(e, setup)}
                              onViewClick={() => openView(setup)}
                              onEditClick={() => openEdit(setup)}
                              onDeleteClick={() => setDeleteConfirmId(setup.id)}
                              isGlassEnabled={isGlassEnabled}
                              details={[
                                { label: 'Symbol', value: setup.symbol || '-' },
                                { label: 'Session', value: setup.session || '-' },
                              ]}
                              onImageClick={() => {
                                if (setup.images?.length) {
                                  setZoomImages(setup.images);
                                  setZoomOpen(true);
                                }
                              }}
                            />
                          </SortableCard>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* Folder Dialog */}
      <FolderDialog
        open={isFolderDialogOpen}
        onOpenChange={setIsFolderDialogOpen}
        folder={editingFolder}
        onSave={handleFolderSave}
        isLoading={createFolder.isPending || updateFolder.isPending}
        type="playbook"
      />

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!deleteFolderConfirm} onOpenChange={() => setDeleteFolderConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteFolderConfirm?.name}" and all setups inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFolderDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Setup Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md sm:max-h-[85vh] p-0 gap-0 overflow-hidden" fullScreenOnMobile hideCloseButton>
          <div className="flex flex-col h-full max-h-[inherit] overflow-hidden">
            {/* Sticky Header with safe area padding on mobile */}
            <div className="flex-shrink-0 sticky top-0 z-10 bg-card px-5 py-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-5 sm:px-6 border-b border-border/30">
              <div className="flex items-center justify-between">
                <DialogHeader className="text-left">
                  <DialogTitle>Add Setup</DialogTitle>
                </DialogHeader>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors sm:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 sm:pt-4 min-h-0">
              {renderForm(false)}
            </div>
            
            {/* Fixed footer with safe area */}
            <div className="flex-shrink-0 px-5 pt-3 sm:px-6 flex gap-3 [padding-bottom:max(5rem,calc(env(safe-area-inset-bottom)+2rem))] sm:[padding-bottom:1.5rem] border-t border-border/30">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-xl h-12" onClick={handleCreate} disabled={createSetup.isPending}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md sm:max-h-[85vh] p-0 gap-0 overflow-hidden" fullScreenOnMobile hideCloseButton>
          <div className="flex flex-col h-full max-h-[inherit] overflow-hidden">
            {/* Sticky Header with safe area padding on mobile */}
            <div className="flex-shrink-0 sticky top-0 z-10 bg-card px-5 py-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-5 sm:px-6 border-b border-border/30">
              <div className="flex items-center justify-between">
                <DialogHeader className="text-left">
                  <DialogTitle>Edit Setup</DialogTitle>
                </DialogHeader>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors sm:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 sm:pt-4 min-h-0 overscroll-y-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              {renderForm(true)}
            </div>
            
            {/* Fixed footer with safe area */}
            <div className="flex-shrink-0 px-5 pt-3 sm:px-6 flex gap-3 [padding-bottom:max(5rem,calc(env(safe-area-inset-bottom)+2rem))] sm:[padding-bottom:1.5rem] border-t border-border/30 bg-card">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-xl h-12" onClick={handleEdit} disabled={updateSetup.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Setup Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden" fullScreenOnMobile hideCloseButton>
          <div className={cn(
            "flex flex-col h-full overflow-hidden relative",
            isGlassEnabled
              ? "bg-card/95 dark:bg-card/80 backdrop-blur-xl"
              : "bg-card"
          )}>
            {/* Dot pattern removed - these pages should not have dot background */}
            {/* Header - sticky with safe area padding */}
            <div className="sticky top-0 z-10 px-4 md:px-6 py-4 border-b border-border/50 bg-muted/30 dark:bg-white/[0.02] relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {selectedSetup?.symbol && <SymbolIcon symbol={selectedSetup.symbol} size="md" />}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-semibold text-foreground">{selectedSetup?.name}</span>
                    </div>
                    {selectedSetup?.symbol && (
                      <p className="text-sm text-muted-foreground font-mono">{selectedSetup.symbol}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewOpen(false)}
                  className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Info row with date, day, session */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                {selectedSetup?.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {selectedSetup.date}
                  </span>
                )}
                {selectedSetup?.day_of_week && (
                  <span>{selectedSetup.day_of_week}</span>
                )}
                {selectedSetup?.entry_time && (
                  <span className="tabular-nums">{selectedSetup.entry_time}</span>
                )}
                {selectedSetup?.session && (
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px] font-medium">
                    {selectedSetup.session}
                  </span>
                )}
                {selectedSetup?.has_news && selectedSetup?.news_impact && (
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium",
                    selectedSetup.news_impact === 'high' && 'bg-red-500/20 text-red-400',
                    selectedSetup.news_impact === 'medium' && 'bg-amber-500/20 text-amber-400',
                    selectedSetup.news_impact === 'low' && 'bg-emerald-500/20 text-emerald-400'
                  )}>
                    {selectedSetup.news_impact} impact
                  </span>
                )}
              </div>
            </div>
            
            {/* Scrollable content with proper overflow containment */}
            {selectedSetup && (
              <div 
                className="flex-1 overflow-y-auto p-5 sm:p-6 sm:pt-4 min-h-0 space-y-4 overscroll-y-contain relative z-10"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {/* News Section */}
                {selectedSetup?.has_news && (
                  <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                      </svg>
                      <span className="text-sm font-medium text-foreground">Economic News</span>
                    </div>
                    
                    {/* Display full news events if available */}
                    {selectedSetup.news_events && selectedSetup.news_events.length > 0 ? (
                      <div className="space-y-2">
                        {selectedSetup.news_events.map((event, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border/30">
                            <div className="flex flex-wrap gap-4">
                              <div className="flex-1 min-w-[150px] space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Event</span>
                                <p className="text-sm font-medium text-foreground">{event.title}</p>
                              </div>
                              {event.currency && (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Currency</span>
                                  <p className="text-sm font-medium text-foreground">{event.currency}</p>
                                </div>
                              )}
                              {event.time && (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</span>
                                  <p className="text-sm font-medium text-foreground tabular-nums">{event.time}</p>
                                </div>
                              )}
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Impact</span>
                                <p className={cn(
                                  "text-sm font-medium capitalize",
                                  event.impact === 'high' && 'text-red-500',
                                  event.impact === 'medium' && 'text-orange-500',
                                  event.impact === 'low' && 'text-yellow-500'
                                )}>
                                  {event.impact}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedSetup.news_impact ? (
                      <div className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-2">
                        <div className="flex flex-wrap gap-4">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Impact</span>
                            <p className={cn(
                              "text-sm font-medium capitalize",
                              selectedSetup.news_impact === 'high' && 'text-red-500',
                              selectedSetup.news_impact === 'medium' && 'text-orange-500',
                              selectedSetup.news_impact === 'low' && 'text-yellow-500'
                            )}>
                              {selectedSetup.news_impact}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Chart Analysis Cards - matching TradeViewDialog style */}
                {(() => {
                  const charts = parseNotesToCharts(selectedSetup.notes || '', selectedSetup.images || []);
                  return charts.map((chart, idx) => (
                    <div key={chart.id || idx} className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/20">
                      {/* Timeframe badge */}
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded bg-muted text-sm font-medium text-foreground">
                          {getTimeframeLabel(chart.timeframe)}
                        </span>
                      </div>
                      
                      {/* Chart image with proper containment */}
                      {chart.images && chart.images.length > 0 && chart.images[0] && (
                        <div className="relative rounded-lg border border-border/50 overflow-hidden bg-muted/30">
                          <img 
                            src={chart.images[0]} 
                            alt={getTimeframeLabel(chart.timeframe)}
                            className="w-full h-auto cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ 
                              imageRendering: 'auto',
                              display: 'block',
                              maxWidth: '100%',
                              objectFit: 'contain',
                            }}
                            onClick={() => {
                              setZoomImages(selectedSetup.images || []);
                              setZoomOpen(true);
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Notes below the chart */}
                      {chart.notes && (
                        <div className="rounded-lg border border-border bg-muted/50 p-3">
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{chart.notes}</p>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            )}
            
            {/* Fixed footer with safe area */}
            <div className="flex-shrink-0 px-5 pt-3 sm:px-6 flex gap-3 [padding-bottom:max(5rem,calc(env(safe-area-inset-bottom)+2rem))] sm:[padding-bottom:1.5rem] border-t border-border/30">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
              <Button 
                className="flex-1 rounded-xl h-12" 
                onClick={() => {
                  setIsViewOpen(false);
                  if (selectedSetup) openEdit(selectedSetup);
                }}
              >
                Edit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Setup Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this setup? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Zoom Dialog */}
      <ImageZoomDialog
        images={zoomImages}
        open={zoomOpen}
        onOpenChange={setZoomOpen}
      />
    </div>
    </PageTransition>
  );
}
