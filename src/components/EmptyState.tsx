import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { LucideIcon, HelpCircle } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  helpLink?: string;
  helpText?: string;
  children?: ReactNode;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  helpLink,
  helpText = "Need help getting started?",
  children 
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="lg" className="mb-4">
          {action.label}
        </Button>
      )}
      {helpLink && (
        <Link 
          to={helpLink} 
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          {helpText}
        </Link>
      )}
      {children}
    </div>
  );
};
