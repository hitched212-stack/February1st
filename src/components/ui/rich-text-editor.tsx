import { useRef, useEffect, useState } from 'react';
import { Bold, Italic, List, ListOrdered, Underline, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';

const CUSTOM_COLORS_EVENT = 'rte-custom-colors-updated';
const CUSTOM_HIGHLIGHTS_EVENT = 'rte-custom-highlights-updated';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start note...',
  rows = 4,
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const fontPickerRef = useRef<HTMLDivElement>(null);
  const listDropdownRef = useRef<HTMLDivElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isBulletList, setIsBulletList] = useState(false);
  const [isNumberedList, setIsNumberedList] = useState(false);
  const [currentFontFamily, setCurrentFontFamily] = useState('sans-serif');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rteSelectedColor') || '#000000';
    }
    return '#000000';
  });
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState('#FFFF00');
  const [customHighlights, setCustomHighlights] = useState<string[]>([]);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [showCustomColorDialog, setShowCustomColorDialog] = useState(false);
  const [tempCustomColor, setTempCustomColor] = useState('#FF5733');
  const [showCustomHighlightDialog, setShowCustomHighlightDialog] = useState(false);
  const [tempCustomHighlight, setTempCustomHighlight] = useState('#FFFF00');
  const [hasLoadedCustomColors, setHasLoadedCustomColors] = useState(false);
  const [hasLoadedCustomHighlights, setHasLoadedCustomHighlights] = useState(false);

  const normalizeHex = (value: string) => value.trim().toUpperCase();

  const defaultColors = [
    '#000000', // black
    '#4B5563', // gray
    '#9CA3AF', // light gray
    '#FFFFFF', // white
    '#EF4444', // red
    '#F97316', // orange
    '#EAB308', // yellow
    '#22C55E', // green
    '#14B8A6', // teal
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
  ];

  const handleAddCustomColor = () => {
    setShowCustomColorDialog(true);
  };

  const handleConfirmCustomColor = () => {
    const normalized = normalizeHex(tempCustomColor);
    if (/^#[0-9A-F]{6}$/i.test(normalized)) {
      if (!customColors.includes(normalized)) {
        setCustomColors((prev) => [...prev, normalized]);
        setShowCustomColorDialog(false);
        setShowColorPicker(true);
      } else {
        alert('This color has already been added');
      }
    } else {
      alert('Please enter a valid hex color code');
    }
  };

  const handleClearColor = () => {
    applyFormat('foreColor', '#000000');
    setSelectedColor('#000000');
  };

  const handleAddCustomHighlight = () => {
    setShowCustomHighlightDialog(true);
  };

  const handleConfirmCustomHighlight = () => {
    const normalized = normalizeHex(tempCustomHighlight);
    if (/^#[0-9A-F]{6}$/i.test(normalized)) {
      if (!customHighlights.includes(normalized)) {
        setCustomHighlights((prev) => [...prev, normalized]);
        setShowCustomHighlightDialog(false);
        setShowHighlightPicker(true);
      } else {
        alert('This highlight color has already been added');
      }
    } else {
      alert('Please enter a valid hex color code');
    }
  };

  const applyHighlight = (color: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    setTimeout(() => {
      try {
        document.execCommand('backColor', false, color);
        const html = editorRef.current?.innerHTML || '';
        onChange(html);
        updateFormatIndicators();
      } catch (e) {
        console.error('Highlight error:', e);
      }
    }, 0);
  };

  const clearHighlight = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    setTimeout(() => {
      try {
        document.execCommand('backColor', false, 'transparent');
        const html = editorRef.current?.innerHTML || '';
        onChange(html);
        updateFormatIndicators();
      } catch (e) {
        console.error('Clear highlight error:', e);
      }
    }, 0);
  };

  const fontStyles = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Courier New', value: '"Courier New", monospace' }
  ];

  // Load persisted custom colors/highlights
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedColors = localStorage.getItem('rteCustomColors');
    const storedHighlights = localStorage.getItem('rteCustomHighlights');
    if (storedColors) {
      try {
        const parsed = JSON.parse(storedColors);
        if (Array.isArray(parsed)) {
          const normalized = Array.from(new Set(parsed.map((color) => normalizeHex(String(color)))));
          setCustomColors(normalized);
        }
      } catch {
        // ignore
      }
    }
    setHasLoadedCustomColors(true);
    if (storedHighlights) {
      try {
        const parsed = JSON.parse(storedHighlights);
        if (Array.isArray(parsed)) {
          const normalized = Array.from(new Set(parsed.map((color) => normalizeHex(String(color)))));
          setCustomHighlights(normalized);
        }
      } catch {
        // ignore
      }
    }
    setHasLoadedCustomHighlights(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'rteCustomColors' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) {
            const normalized = Array.from(new Set(parsed.map((color) => normalizeHex(String(color)))));
            setCustomColors(normalized);
          }
        } catch {
          // ignore
        }
      }

      if (event.key === 'rteCustomHighlights' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) {
            const normalized = Array.from(new Set(parsed.map((color) => normalizeHex(String(color)))));
            setCustomHighlights(normalized);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    const handleCustomColorsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<string[]>;
      if (Array.isArray(customEvent.detail)) {
        const normalized = Array.from(new Set(customEvent.detail.map((color) => normalizeHex(String(color)))));
        setCustomColors((prev) => {
          if (prev.length === normalized.length && prev.every((color, index) => color === normalized[index])) {
            return prev;
          }
          return normalized;
        });
      }
    };

    const handleCustomHighlightsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<string[]>;
      if (Array.isArray(customEvent.detail)) {
        const normalized = Array.from(new Set(customEvent.detail.map((color) => normalizeHex(String(color)))));
        setCustomHighlights((prev) => {
          if (prev.length === normalized.length && prev.every((color, index) => color === normalized[index])) {
            return prev;
          }
          return normalized;
        });
      }
    };

    window.addEventListener(CUSTOM_COLORS_EVENT, handleCustomColorsUpdated as EventListener);
    window.addEventListener(CUSTOM_HIGHLIGHTS_EVENT, handleCustomHighlightsUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CUSTOM_COLORS_EVENT, handleCustomColorsUpdated as EventListener);
      window.removeEventListener(CUSTOM_HIGHLIGHTS_EVENT, handleCustomHighlightsUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasLoadedCustomColors) return;
    localStorage.setItem('rteCustomColors', JSON.stringify(customColors));
    window.dispatchEvent(new CustomEvent(CUSTOM_COLORS_EVENT, { detail: customColors }));
  }, [customColors, hasLoadedCustomColors]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasLoadedCustomHighlights) return;
    localStorage.setItem('rteCustomHighlights', JSON.stringify(customHighlights));
    window.dispatchEvent(new CustomEvent(CUSTOM_HIGHLIGHTS_EVENT, { detail: customHighlights }));
  }, [customHighlights, hasLoadedCustomHighlights]);

  // Handle clicking outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(target)) {
        setShowHighlightPicker(false);
      }
      if (fontPickerRef.current && !fontPickerRef.current.contains(target)) {
        setShowFontPicker(false);
      }
      if (listDropdownRef.current && !listDropdownRef.current.contains(target)) {
        setShowListDropdown(false);
      }
    };

    if (showColorPicker || showHighlightPicker || showFontPicker || showListDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker, showHighlightPicker, showFontPicker, showListDropdown]);

  // Save selected color to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rteSelectedColor', selectedColor);
    }
  }, [selectedColor]);

  // Keep editor content in sync with value
  useEffect(() => {
    if (!editorRef.current) return;
    const nextValue = value || '';
    if (editorRef.current.innerHTML !== nextValue) {
      editorRef.current.innerHTML = nextValue;
    }
  }, [value]);

  // Update format indicators
  const updateFormatIndicators = () => {
    try {
      setIsBold(!!(document.queryCommandState('bold')));
      setIsItalic(!!(document.queryCommandState('italic')));
      setIsUnderline(!!(document.queryCommandState('underline')));
      setIsBulletList(!!(document.queryCommandState('insertUnorderedList')));
      setIsNumberedList(!!(document.queryCommandState('insertOrderedList')));
    } catch (e) {
      // Silently fail if command state check fails
    }
  };

  const insertBulletList = () => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // Get current selection
    const selection = window.getSelection();
    
    // If no selection, select all content
    if (!selection || selection.toString().length === 0) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    try {
      document.execCommand('insertUnorderedList', false);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        onChange(html);
      }
      updateFormatIndicators();
    } catch (err) {
      console.error('Bullet list error:', err);
    }
  };

  const insertOrderedList = () => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // Get current selection
    const selection = window.getSelection();
    
    // If no selection, select all content
    if (!selection || selection.toString().length === 0) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    try {
      document.execCommand('insertOrderedList', false);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        onChange(html);
      }
      updateFormatIndicators();
    } catch (err) {
      console.error('Numbered list error:', err);
    }
  };

  const applyFormat = (command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    
    // Ensure editor is focused
    editorRef.current.focus();
    
    // Give the browser a moment to set focus
    setTimeout(() => {
      try {
        document.execCommand(command, false, commandValue);
        
        // Trigger change after formatting
        const html = editorRef.current?.innerHTML || '';
        onChange(html);
        // Update indicators after formatting
        updateFormatIndicators();
      } catch (e) {
        console.error('Format error:', e);
      }
    }, 0);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      updateFormatIndicators();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
        default:
          break;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
      handleInput();
    }
  };

  const handleMouseUp = () => {
    setTimeout(() => {
      updateFormatIndicators();
    }, 0);
  };

  const handleKeyUp = () => {
    updateFormatIndicators();
  };

  const handleBlur = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-visible">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 p-3 bg-muted/35 border-b border-border/60 flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible [&>*]:shrink-0 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden z-10">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('bold');
          }}
          className={cn(
            "h-9 min-w-9 px-2 rounded-lg transition-all duration-150",
            isBold
              ? "bg-foreground/15 text-foreground border border-border/70"
              : "text-foreground/70 hover:text-foreground hover:bg-background/70 border border-transparent"
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('italic');
          }}
          className={cn(
            "h-9 min-w-9 px-2 rounded-lg transition-all duration-150",
            isItalic
              ? "bg-foreground/15 text-foreground border border-border/70"
              : "text-foreground/70 hover:text-foreground hover:bg-background/70 border border-transparent"
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormat('underline');
          }}
          className={cn(
            "h-9 min-w-9 px-2 rounded-lg transition-all duration-150",
            isUnderline
              ? "bg-foreground/15 text-foreground border border-border/70"
              : "text-foreground/70 hover:text-foreground hover:bg-background/70 border border-transparent"
          )}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="w-px h-6 bg-border/60 mx-1" />

        {/* List Dropdown */}
        <div className="relative z-40" ref={listDropdownRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowListDropdown(!showListDropdown);
              if (!showListDropdown) {
                setShowColorPicker(false);
                setShowHighlightPicker(false);
                setShowFontPicker(false);
              }
            }}
            className="h-9 px-2.5 rounded-lg hover:bg-background/70 transition-all duration-150 text-foreground/70 hover:text-foreground flex items-center gap-1.5 border border-transparent hover:border-border/70"
            title="List Options"
          >
            {isBulletList ? (
              <List className="h-4 w-4" strokeWidth={2} />
            ) : isNumberedList ? (
              <ListOrdered className="h-4 w-4" strokeWidth={2} />
            ) : (
              <span className="text-sm">+</span>
            )}
            <span className="text-xs">▼</span>
          </button>

          {showListDropdown && (
            <div className="absolute top-full mt-2 left-0 bg-background border border-border rounded-lg shadow-2xl z-50 w-40">
              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertBulletList();
                    setShowListDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 whitespace-nowrap",
                    isBulletList
                      ? "bg-foreground/20 text-foreground font-semibold"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  )}
                  title="Bullet List"
                >
                  <List className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Bullet List</span>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertOrderedList();
                    setShowListDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 whitespace-nowrap",
                    isNumberedList
                      ? "bg-foreground/20 text-foreground font-semibold"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  )}
                  title="Numbered List"
                >
                  <ListOrdered className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Numbered List</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border/60 mx-1" />

        {/* Highlight Color Picker */}
        <div className="relative z-45" ref={highlightPickerRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowHighlightPicker(!showHighlightPicker);
              if (!showHighlightPicker) {
                setShowColorPicker(false);
                setShowFontPicker(false);
              }
            }}
            className="h-9 min-w-9 px-2 rounded-lg hover:bg-background/70 transition-all duration-150 text-foreground/70 hover:text-foreground border border-transparent hover:border-border/70"
            title="Highlight Color"
          >
            <Highlighter className="h-4 w-4" strokeWidth={2} />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-full mt-2 left-0 bg-background border border-border rounded-lg shadow-2xl z-50 w-80 max-h-96 overflow-y-auto">
              {/* Custom Highlights Section */}
              {customHighlights.length > 0 && (
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-foreground/80">Custom Highlights</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {customHighlights.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedHighlight(color);
                          applyHighlight(color);
                          setShowHighlightPicker(false);
                        }}
                        className="w-8 h-8 rounded-full border-2 border-border hover:border-foreground transition-colors cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddCustomHighlight();
                      }}
                      className="w-8 h-8 rounded-full border-2 border-border/50 hover:border-foreground transition-colors cursor-pointer flex items-center justify-center text-foreground/50 hover:text-foreground"
                      title="Add Custom Highlight"
                    >
                      <span className="text-lg">+</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Default Highlights Section */}
              <div className="p-4">
                <span className="text-xs font-semibold text-foreground/80 block mb-3">Default Highlights</span>
                <div className="grid grid-cols-10 gap-2">
                  {['#FFFF00', '#FFE135', '#FFC700', '#FFAA00', '#FF6600', '#FF0000', '#FF69B4', '#FF1493', '#00FF00', '#00FFFF', '#0000FF', '#9370DB', '#FFB6C1', '#FFDAB9', '#FFE4B5', '#FFFACD', '#E0FFFF', '#E6E6FA', '#F0FFF0', '#FFFAF0'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedHighlight(color);
                        applyHighlight(color);
                        setShowHighlightPicker(false);
                      }}
                      className="w-6 h-6 rounded-full border border-border/30 hover:border-foreground transition-colors cursor-pointer"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Add Highlight + Clear Button */}
              <div className="p-4 border-t border-border/50 space-y-2">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddCustomHighlight();
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-foreground/70 hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>+ Add Highlight</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    clearHighlight();
                    setShowHighlightPicker(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium text-foreground/70 hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>Remove Highlight</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border/60 mx-1" />

        {/* Text Color Picker */}
        <div className="relative z-50" ref={colorPickerRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowColorPicker(!showColorPicker);
              if (!showColorPicker) {
                setShowHighlightPicker(false);
                setShowFontPicker(false);
              }
            }}
            className="h-9 w-9 rounded-lg hover:bg-background/70 transition-all duration-150 flex items-center justify-center border border-transparent hover:border-border/70 leading-none"
            title="Text Color"
          >
            <span className="text-sm font-bold" style={{ color: selectedColor }}>A</span>
          </button>
          {showColorPicker && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 bg-background border border-border rounded-lg shadow-2xl z-50 w-56 sm:w-64 max-w-[calc(100vw-1rem)] max-h-80 overflow-y-auto">
              {/* Custom Colors Section */}
              {customColors.length > 0 && (
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-foreground/80">Custom Colors</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {customColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedColor(color);
                          applyFormat('foreColor', color);
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded-md border border-border/50 hover:border-foreground transition-colors cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddCustomColor();
                      }}
                      className="w-6 h-6 rounded-md border border-border/50 hover:border-foreground transition-colors cursor-pointer flex items-center justify-center text-foreground/50 hover:text-foreground"
                      title="Add Custom Color"
                    >
                      <span className="text-sm">+</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Default Colors Section */}
              <div className="p-3">
                <span className="text-[11px] font-semibold text-foreground/80 block mb-2">Default Colors</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedColor(color);
                        applyFormat('foreColor', color);
                        setShowColorPicker(false);
                      }}
                      className="w-5 h-5 rounded-md border border-border/40 hover:border-foreground transition-colors cursor-pointer"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Add Custom Color + Clear Button */}
              <div className="p-3 border-t border-border/50 space-y-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddCustomColor();
                  }}
                  className="w-full px-2.5 py-1.5 text-[11px] font-medium text-foreground/70 hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <span>+ Add Color</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleClearColor();
                    setShowColorPicker(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-[11px] font-medium text-foreground/70 hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Font Style Dropdown */}
        <div className="relative z-40" ref={fontPickerRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowFontPicker(!showFontPicker);
              if (!showFontPicker) {
                setShowColorPicker(false);
                setShowHighlightPicker(false);
              }
            }}
            className="h-9 px-2.5 rounded-lg text-xs bg-background/70 border border-border/70 transition-all duration-150 text-foreground/80 hover:text-foreground hover:bg-background cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            title="Font Style"
          >
            <span style={{ fontFamily: currentFontFamily }}>Aa</span>
            <span className="text-foreground/50">▼</span>
          </button>

          {showFontPicker && (
            <div className="absolute top-full mt-2 left-0 bg-background border border-border rounded-lg shadow-2xl z-50 w-32 md:w-48">
              <div className="p-2">
                {fontStyles.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyFormat('fontName', font.value);
                      setCurrentFontFamily(font.value);
                      setShowFontPicker(false);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors mb-1 whitespace-nowrap",
                      currentFontFamily === font.value
                        ? "bg-foreground/20 text-foreground font-semibold"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                    )}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={true}
        autoCorrect="off"
        autoCapitalize="sentences"
        lang="en-US"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        onPaste={handlePaste}
        onBlur={handleBlur}
        className={cn(
          "rich-text-content",
          "w-full p-4 bg-transparent border-0 rounded-none",
          "text-foreground dark:text-zinc-100 text-sm outline-none",
          "focus:bg-transparent",
          "overflow-auto whitespace-pre-wrap break-words",
          className,
          rows === 4 ? "min-h-44" : "",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        )}
        data-placeholder={placeholder}
        style={{ WebkitUserSelect: 'text' } as React.CSSProperties}
      />

      {/* Custom Color Picker Dialog */}
      {showCustomColorDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-2xl p-6 w-80 max-w-full mx-4">
            <h2 className="text-base font-semibold text-foreground mb-4">Add Custom Color</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={tempCustomColor}
                  onChange={(e) => setTempCustomColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer outline-none"
                  style={{ border: 'none', padding: '0' }}
                />
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground/70 block mb-2">Hex Code</label>
                  <input
                    type="text"
                    value={tempCustomColor}
                    onChange={(e) => setTempCustomColor(e.target.value.toUpperCase())}
                    placeholder="#FF5733"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-foreground/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCustomColorDialog(false)}
                  className="px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCustomColor}
                  className="px-3 py-1.5 text-xs font-medium text-foreground bg-foreground/20 hover:bg-foreground/30 rounded-lg transition-colors"
                >
                  Add Color
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Highlight Color Picker Dialog */}
      {showCustomHighlightDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-2xl p-6 w-80 max-w-full mx-4">
            <h2 className="text-base font-semibold text-foreground mb-4">Add Highlight Color</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={tempCustomHighlight}
                  onChange={(e) => setTempCustomHighlight(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer outline-none"
                  style={{ border: 'none', padding: '0' }}
                />
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground/70 block mb-2">Hex Code</label>
                  <input
                    type="text"
                    value={tempCustomHighlight}
                    onChange={(e) => setTempCustomHighlight(e.target.value.toUpperCase())}
                    placeholder="#FFFF00"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-foreground/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCustomHighlightDialog(false)}
                  className="px-3 py-1.5 text-xs font-medium text-foreground/70 hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCustomHighlight}
                  className="px-3 py-1.5 text-xs font-medium text-foreground bg-foreground/20 hover:bg-foreground/30 rounded-lg transition-colors"
                >
                  Add Highlight
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
