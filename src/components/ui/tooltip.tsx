import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = ({
  delayDuration = 0,
  skipDelayDuration = 0,
  disableHoverableContent = false,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider
    delayDuration={delayDuration}
    skipDelayDuration={skipDelayDuration}
    disableHoverableContent={disableHoverableContent}
    {...props}
  />
);

const Tooltip = ({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) => {
  const [open, setOpen] = React.useState(false);
  
  return (
    <TooltipPrimitive.Root 
      delayDuration={delayDuration} 
      open={open}
      onOpenChange={setOpen}
      {...props} 
    />
  );
};

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>((props, ref) => (
  <TooltipPrimitive.Trigger
    ref={ref}
    onClick={(e) => {
      // On mobile/touch devices, toggle tooltip on click
      e.preventDefault();
      props.onClick?.(e);
    }}
    {...props}
  />
));
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden max-w-sm rounded-2xl border border-border/70 bg-card/90 px-4 py-3 text-xs font-display font-medium leading-relaxed text-foreground shadow-[0_14px_36px_rgba(0,0,0,0.42)] ring-1 ring-inset ring-white/5 backdrop-blur-xl [&_p]:m-0 [&_p]:text-xs [&_p]:font-display [&_p]:font-medium [&_p]:leading-relaxed [&_p]:text-foreground [&_span]:text-xs [&_span]:font-display [&_span]:font-medium",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
