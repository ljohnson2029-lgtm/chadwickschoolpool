import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Car, User, Users as UsersIcon, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationDropdown } from "./NotificationDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TabNavigation = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const mainTabs = [
    { label: "Profile", path: "/profile", icon: User },
    { label: "Carpools", path: "/family-carpools", icon: Car },
    { label: "Family", path: "/family-links", icon: UsersIcon },
  ];

  const menuItems = [
    { label: "About", path: "/about" },
    { label: "Safety", path: "/safety" },
    { label: "How It Works", path: "/how-it-works" },
  ];

  const accountType = profile?.account_type;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xl font-bold text-foreground hover:scale-105 transition-transform"
          >
            <div className="relative">
              <Car className="w-7 h-7" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-glow" />
            </div>
            <span>SchoolPool</span>
          </button>

          {/* Main Tabs - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {/* Home Icon Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-accent"
              aria-label="Home"
            >
              <Home className="h-5 w-5" />
            </Button>

            {user && mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.path}
                  variant={isActive(tab.path) ? "default" : "ghost"}
                  onClick={() => navigate(tab.path)}
                  className={`gap-2 ${
                    isActive(tab.path)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}

            {/* Hamburger Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="cursor-pointer"
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side - Account Badge & Notifications */}
          <div className="flex items-center gap-3">
            {user && accountType && (
              <Badge
                variant={accountType === "student" ? "secondary" : "default"}
                className={`hidden sm:flex ${
                  accountType === "student"
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-green-500/10 text-green-600"
                }`}
              >
                {accountType === "student" ? "Child Account" : "Parent Account"}
              </Badge>
            )}
            {user && <NotificationDropdown />}
            {!user && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="hidden sm:inline-flex"
                >
                  Log In
                </Button>
                <Button onClick={() => navigate("/register")}>Sign Up</Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => {
              const menu = document.getElementById("mobile-menu");
              menu?.classList.toggle("hidden");
            }}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Menu */}
        <div id="mobile-menu" className="hidden md:hidden pb-4 space-y-2">
          {/* Home button in mobile menu */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full justify-start gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>

          {user &&
            mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.path}
                  variant={isActive(tab.path) ? "default" : "ghost"}
                  onClick={() => navigate(tab.path)}
                  className="w-full justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className="w-full justify-start"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default TabNavigation;
