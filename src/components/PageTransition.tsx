import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <div className="page-transition">
      {children}
    </div>
  );
};

export default PageTransition;
