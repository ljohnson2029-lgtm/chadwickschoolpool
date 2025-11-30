import { ReactNode } from "react";
import TabNavigation from "./TabNavigation";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <TabNavigation />
      <main className="pt-20 pb-8">
        {children}
      </main>
    </div>
  );
};
