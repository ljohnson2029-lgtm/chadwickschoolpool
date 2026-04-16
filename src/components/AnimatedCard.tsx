import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function AnimatedCard({ 
  children, 
  className, 
  hover = true,
  onClick 
}: AnimatedCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden",
        className
      )}
      whileHover={hover ? { 
        y: -4, 
        boxShadow: "0 12px 40px -12px rgba(0, 0, 0, 0.15)",
        transition: { type: "spring", stiffness: 400, damping: 25 }
      } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      style={{ willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}
