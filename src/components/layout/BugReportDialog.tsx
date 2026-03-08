import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Mail, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BugReportDialog({ open, onOpenChange }: BugReportDialogProps) {
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [severity, setSeverity] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setScreenshot(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !description || !steps || !severity) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `bug-reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(filePath, screenshot);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('screenshots')
            .getPublicUrl(filePath);
          screenshotUrl = publicUrl;
        }
      }

      // Here you would typically send this to your backend
      // For now, we'll just log it and show a success message
      console.log({
        email,
        description,
        steps,
        severity,
        screenshotUrl,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Bug report submitted",
        description: "Thank you for helping us improve! We'll look into this issue.",
      });

      // Reset form
      setEmail("");
      setDescription("");
      setSteps("");
      setSeverity("");
      setScreenshot(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast({
        title: "Submission failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto rounded-3xl border border-border/70 bg-card/95 backdrop-blur-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-[#9b8cff] rounded-full" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground">Support</p>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">Bug report form</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Help us fix issues faster by sharing what happened and how to reproduce it.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Your email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9 rounded-xl border-border/70 bg-background/70"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity" className="text-sm font-semibold">
                Severity <span className="text-red-500">*</span>
              </Label>
              <Select value={severity} onValueChange={setSeverity} required>
                <SelectTrigger id="severity" className="h-11 rounded-xl border-border/70 bg-background/70">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                  <SelectItem value="medium">Medium - Affects functionality</SelectItem>
                  <SelectItem value="high">High - Major issue</SelectItem>
                  <SelectItem value="critical">Critical - App unusable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Brief description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Summarize the issue in one or two sentences"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none min-h-[92px] rounded-xl border-border/70 bg-background/70"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="steps" className="text-sm font-semibold">
              Steps to reproduce <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">Please be as detailed as possible.</p>
            <Textarea
              id="steps"
              placeholder="1. Go to...\n2. Click on...\n3. Notice that..."
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className="resize-none min-h-[120px] rounded-xl border-border/70 bg-background/70"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshot" className="text-sm font-semibold">
              Screenshot or video
            </Label>
            <label
              htmlFor="screenshot"
              className="group flex items-center justify-between gap-4 rounded-xl border border-dashed border-border/70 bg-background/50 px-4 py-3 cursor-pointer hover:border-[#9b8cff]/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg border border-border/70 bg-background/80 flex items-center justify-center">
                  <Upload className="h-4 w-4 text-muted-foreground group-hover:text-[#9b8cff] transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {screenshot ? screenshot.name : "Choose file"}
                  </p>
                  <p className="text-xs text-muted-foreground">Image or video • Max 10MB</p>
                </div>
              </div>
              {screenshot && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setScreenshot(null);
                  }}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Remove attached file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <Input
              id="screenshot"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl">
              {isSubmitting ? "Submitting..." : "Submit report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
