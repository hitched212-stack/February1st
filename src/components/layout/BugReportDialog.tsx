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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Bug report form</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Use this form to report any bugs or issues you encounter
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Your email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          {/* Brief Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Brief description of the issue
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of the issue"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none min-h-[80px]"
              required
            />
          </div>

          {/* Steps to Reproduce */}
          <div className="space-y-2">
            <Label htmlFor="steps" className="text-sm font-medium">
              Steps to reproduce the issue <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">Please be as detailed as possible!</p>
            <Textarea
              id="steps"
              placeholder="1. Go to... 2. Click on... 3. Notice that..."
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className="resize-none min-h-[100px]"
              required
            />
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="severity" className="text-sm font-medium">
              Severity of the issue
            </Label>
            <Select value={severity} onValueChange={setSeverity} required>
              <SelectTrigger id="severity">
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

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label htmlFor="screenshot" className="text-sm font-medium">
              Screenshot or video of the issue
            </Label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="screenshot"
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background hover:bg-muted/50 cursor-pointer transition-colors text-sm font-medium"
              >
                <Upload className="h-4 w-4" />
                Choose file
              </label>
              <Input
                id="screenshot"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {screenshot && (
                <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md bg-muted/50 text-sm">
                  <span className="truncate flex-1">{screenshot.name}</span>
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {!screenshot && (
              <p className="text-xs text-muted-foreground">Max file size: 10MB</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
