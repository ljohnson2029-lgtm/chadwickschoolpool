import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { LucideIcon, HelpCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────── */

interface ActionConfig {
  label: string;
  onClick?: () => void;
  /** Optional: If provided, renders as a Link instead of a button click */
  href?: string;
  /** Optional: Leading icon for the button */
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string | ReactNode;
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
  helpLink?: string;
  helpText?: string;
  className?: string;
  children?: ReactNode;
}

/* ─── Main Component ───────────────────────────────────────────── */

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  helpLink,
  helpText = "Need help getting started?",
  className,
  children,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        "animate-in fade-in zoom-in-95 duration-500", // Smooth entry
        className,
      )}
    >
      {/* 1. Visual Anchor (Dashed "Blank Canvas" Look) */}
      <div className="relative mb-6 group">
        <div className="absolute inset-0 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-500" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-primary/20 bg-background shadow-sm">
          {Icon ? (
            <Icon className="h-10 w-10 text-muted-foreground/80" aria-hidden="true" />
          ) : (
            <Plus className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* 2. Text Content */}
      <div className="max-w-md space-y-2 mb-8">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        <div className="text-muted-foreground text-sm leading-relaxed">{description}</div>
      </div>

      {/* 3. Action Area */}
      <div className="flex flex-col sm:flex-row items-center gap-3 min-w-[200px]">
        {/* Primary Action */}
        {primaryAction && (
          <ActionButton
            action={primaryAction}
            variant="default"
            size="lg"
            className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
          />
        )}

        {/* Secondary Action (e.g. "Import" or "Learn More") */}
        {secondaryAction && (
          <ActionButton action={secondaryAction} variant="outline" size="lg" className="w-full sm:w-auto" />
        )}
      </div>

      {/* 4. Footer / Help Link */}
      {helpLink && (
        <div className="mt-8 pt-6 border-t border-border/40 w-full max-w-xs flex justify-center">
          <Link
            to={helpLink}
            className="group flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5 group-hover:text-primary" />
            <span>{helpText}</span>
          </Link>
        </div>
      )}

      {/* 5. Custom Slots (e.g. for injected forms or extra UI) */}
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
};

/* ─── Helper: Action Button ────────────────────────────────────── */

interface ActionButtonProps {
  action: ActionConfig;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const ActionButton = ({ action, variant, size, className }: ActionButtonProps) => {
  const { label, onClick, href, icon: Icon } = action;

  const content = (
    <>
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {label}
    </>
  );

  if (href) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <Link to={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button onClick={onClick} variant={variant} size={size} className={className}>
      {content}
    </Button>
  );
};
