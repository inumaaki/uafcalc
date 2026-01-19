import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, LayoutDashboard, User, Users, Search, Menu, X, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/individual", label: "Individual Result", icon: User },
  { path: "/class", label: "Class Result", icon: Users },
  { path: "/smart-search", label: "Smart Search", icon: Search },
  { path: "/contact", label: "Contact", icon: Mail },
];

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 10 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary"
            >
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">UAF Results</h1>
              <p className="text-xs text-muted-foreground">GPA Management System</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2 transition-all",
                        isActive && "shadow-md"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </motion.div>
                </Link>
              );
            })}
            <div className="ml-2">
              <ModeToggle />
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden pb-4"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <div className="flex justify-between items-center px-2 py-2">
                <span className="text-sm font-medium">Theme</span>
                <ModeToggle />
              </div>
            </div>
          </motion.nav>
        )}
      </div>
    </header>
  );
}
