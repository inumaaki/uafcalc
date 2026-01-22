import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { motion } from "framer-motion";
import { ScrollToTopButton } from "@/components/ui/ScrollToTopButton";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  className?: string; // Allow overriding main container styles
  fullWidth?: boolean; // If true, removes 'container' constraint
}

export function Layout({ children, className, fullWidth = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          fullWidth ? "w-full" : "container mx-auto px-4 py-8",
          "flex-1",
          className
        )}
      >
        {children}
      </motion.main>

      <Footer />
      <ScrollToTopButton />
    </div>
  );
}
