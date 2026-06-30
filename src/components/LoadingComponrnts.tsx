import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; 

interface LoadingProps {
  variant?: "spinner" | "dots" | "skeleton" | "fullscreen";
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export default function LoadingComponrnts({
  variant = "spinner",
  size = "md",
  text = "กำลังโหลด...",
  className,
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="animate-spin text-primary h-12 w-12" />
            <div className="absolute inset-0 animate-ping bg-primary/20 rounded-full" />
          </div>
          {text && <p className="text-sm text-muted-foreground font-medium">{text}</p>}
        </div>
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-5/6 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  // Default Spinner
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        <Loader2
          className={cn(
            "animate-spin text-primary",
            sizeClasses[size]
          )}
        />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      </div>
      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}