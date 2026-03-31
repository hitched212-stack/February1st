import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Clipboard, Image, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { ImageZoomDialog } from '@/components/ui/ImageZoomDialog';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  timeframeLabel?: string;
}

type TradeFormCardToastDetail = {
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
};

export function ImageUpload({
  images,
  onChange,
  maxImages = 10,
  timeframeLabel
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const isMobile = useIsMobile();

  const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5MB
  const MAX_DIMENSION = 1800;
  const JPEG_QUALITY = 0.82;

  const showCardToast = (payload: TradeFormCardToastDetail) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<TradeFormCardToastDetail>('trade-form-card-toast', { detail: payload }));
  };

  const showTopCenterError = (title: string, description: string) => {
    showCardToast({
      title,
      description,
      variant: 'error',
    });
  };

  const readBlobAsDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  };

  const compressImage = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const img = new window.Image();

      img.onload = () => {
        try {
          const width = img.width;
          const height = img.height;

          const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
          const targetWidth = Math.max(1, Math.round(width * scale));
          const targetHeight = Math.max(1, Math.round(height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to create image context'));
            return;
          }

          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          canvas.toBlob(
            (compressed) => {
              URL.revokeObjectURL(objectUrl);
              if (!compressed) {
                reject(new Error('Failed to compress image'));
                return;
              }
              resolve(compressed);
            },
            'image/jpeg',
            JPEG_QUALITY
          );
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error instanceof Error ? error : new Error('Failed to compress image'));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for compression'));
      };

      img.src = objectUrl;
    });
  };

  const processBlob = async (blob: Blob): Promise<string> => {
    if (blob.size <= MAX_IMAGE_BYTES) {
      return readBlobAsDataUrl(blob);
    }

    const compressedBlob = await compressImage(blob);
    return readBlobAsDataUrl(compressedBlob.size < blob.size ? compressedBlob : blob);
  };

  const processImage = async (file: File): Promise<string> => {
    return processBlob(file);
  };

  // Process clipboard blobs with optional compression for faster saves
  const processClipboardBlob = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      processBlob(blob).then(resolve).catch(reject);
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showTopCenterError('Invalid file type', 'Please upload image files only.');
      return;
    }
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      showTopCenterError('Maximum images reached', `You can only upload up to ${maxImages} images.`);
      return;
    }
    const filesToProcess = imageFiles.slice(0, remaining);
    try {
      const newImages = await Promise.all(filesToProcess.map(file => processImage(file)));
      onChange([...images, ...newImages]);
      showCardToast({
        title: 'Images added',
        description: `${newImages.length} image(s) uploaded successfully.`,
        variant: 'success',
      });
    } catch {
      showTopCenterError('Upload failed', 'Failed to process one or more images.');
    }
  }, [images, maxImages, onChange]);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map(item => item.getAsFile()).filter((file): file is File => file !== null);
    if (files.length > 0) {
      await handleFiles(files);
    }
  }, [handleFiles]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        showTopCenterError('Paste not supported', 'Your browser does not support clipboard paste. Try using Ctrl+V or Cmd+V instead.');
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      const imageBlobs: Blob[] = [];

      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          imageBlobs.push(blob);
        }
      }

      if (imageBlobs.length === 0) {
        showTopCenterError('No image found', 'No image was found in your clipboard. Copy a chart image first.');
        return;
      }

      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        showTopCenterError('Maximum images reached', `You can only upload up to ${maxImages} images.`);
        return;
      }

      const blobsToProcess = imageBlobs.slice(0, remaining);
      const newImages = await Promise.all(blobsToProcess.map(blob => processClipboardBlob(blob)));
      onChange([...images, ...newImages]);
      setShowMobileOptions(false);
      showCardToast({
        title: 'Images added',
        description: `${newImages.length} image(s) pasted successfully.`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Paste error:', error);
      showTopCenterError('Paste failed', 'Could not read clipboard. Make sure you have copied an image and granted clipboard permission.');
    }
  }, [images, maxImages, onChange]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleUploadZoneClick = () => {
    if (isMobile) {
      setShowMobileOptions(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  // Desktop paste - directly paste from clipboard without asking for Ctrl+V
  const handleDesktopPasteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handlePasteFromClipboard();
  };

  const handleImageClick = (index: number) => {
    setZoomIndex(index);
    setZoomOpen(true);
  };

  return (
    <div className="space-y-2">
      {/* Upload zone - only show when no images */}
      {images.length === 0 && (
        <div
          ref={pasteZoneRef}
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFocus={() => setIsPasteFocused(true)}
          onBlur={() => setIsPasteFocused(false)}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 transition-all cursor-pointer',
            isDragging ? 'border-primary/40 bg-muted/50' : 'hover:border-primary/30 hover:bg-muted/40',
            isPasteFocused && 'ring-1 ring-ring/20'
          )}
          onClick={handleUploadZoneClick}
        >
          <Image className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {isMobile 
                ? 'Tap to add chart' 
                : 'Drop, browse, or Ctrl+V'}
            </p>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <FolderOpen className="mr-1 h-3 w-3" />
                Browse
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleDesktopPasteClick}
              >
                <Clipboard className="mr-1 h-3 w-3" />
                Paste
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
            setShowMobileOptions(false);
          }
        }}
      />

      {/* Mobile options drawer */}
      <Drawer open={showMobileOptions} onOpenChange={setShowMobileOptions}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-lg">Add Chart Image</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-accent transition-colors active:scale-[0.98]"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <FolderOpen className="h-5 w-5 text-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Choose from Gallery</p>
                <p className="text-xs text-muted-foreground">Select an image from your photos</p>
              </div>
            </button>
            <button
              type="button"
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-accent transition-colors active:scale-[0.98]"
              onClick={handlePasteFromClipboard}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <Clipboard className="h-5 w-5 text-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Paste from Clipboard</p>
                <p className="text-xs text-muted-foreground">Paste a copied chart image</p>
              </div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            {images.map((image, index) => (
              <div key={index} className="group relative w-full rounded-lg border border-border overflow-hidden bg-muted/30">
                <img 
                  src={image} 
                  alt={`Trade chart ${index + 1}`} 
                  className="w-full h-auto object-contain block cursor-pointer hover:opacity-90 transition-opacity" 
                  style={{ 
                    imageRendering: 'auto',
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                  loading="eager"
                  decoding="sync"
                  onClick={() => handleImageClick(index)}
                />
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }} 
                  className="absolute right-2 top-2 rounded-full bg-background/80 backdrop-blur-sm p-1.5 shadow-lg transition-all hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {images.length < maxImages && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => {
                if (isMobile) {
                  setShowMobileOptions(true);
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              Add more
            </Button>
          )}
        </div>
      )}

      {/* Zoom Dialog */}
      <ImageZoomDialog
        images={images}
        initialIndex={zoomIndex}
        open={zoomOpen}
        onOpenChange={setZoomOpen}
      />
    </div>
  );
}
