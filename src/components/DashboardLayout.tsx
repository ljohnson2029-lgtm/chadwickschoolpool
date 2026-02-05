import { ReactNode } from "react";
import TabNavigation from "./TabNavigation";
import MobileBottomNav from "./MobileBottomNav";
import FloatingFeedbackButton from "./FloatingFeedbackButton";

interface DashboardLayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export const DashboardLayout = ({ children, hideBottomNav = false }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <TabNavigation />
      <main className="pt-16 md:pt-20 pb-20 md:pb-8">
        {children}
      </main>
      {!hideBottomNav && <MobileBottomNav />}
      <FloatingFeedbackButton />
    </div>
  );
};
