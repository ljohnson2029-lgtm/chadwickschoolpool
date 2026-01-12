import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Car, User, Users as UsersIcon, Home, Radio, Plus, MessageSquare, MapPin, Send, Link2, Settings, GraduationCap, Calendar, MessageSquarePlus } from "lucide-react";
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
  const isStudent = profile?.account_type === 'student';

  // Parent/Staff tabs - same as students but with My Rides
  const parentTabs = [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Family Carpools", path: "/family-carpools", icon: Calendar },
    { label: "My Rides", path: "/my-rides", icon: Car },
  ];

  // Student tabs - restricted
  const studentTabs = [
    { label: "Dashboard", path: "/dashboard", icon: Home },
    { label: "Family Carpools", path: "/family-carpools", icon: Calendar },
    { label: "Link to Parent", path: "/family-links", icon: Link2 },
  ];

  const mainTabs = isStudent ? studentTabs : parentTabs;

  // Parent/Staff menu items
  const parentMenuItems = [
    { label: "Profile", path: "/profile", icon: User },
    { label: "Conversations", path: "/conversations", icon: MessageSquare },
    { label: "Family Links", path: "/family-links", icon: UsersIcon },
    { label: "Give Feedback", path: "/feedback", icon: MessageSquarePlus },
    { label: "About", path: "/about" },
    { label: "Safety", path: "/safety" },
    { label: "How It Works", path: "/how-it-works" },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  // Student menu items - restricted
  const studentMenuItems = [
    { label: "Profile", path: "/profile", icon: User },
    { label: "Give Feedback", path: "/feedback", icon: MessageSquarePlus },
    { label: "Settings", path: "/settings", icon: Settings },
    { label: "About", path: "/about" },
    { label: "Safety", path: "/safety" },
  ];

  const menuItems = isStudent ? studentMenuItems : parentMenuItems;

  const accountType = profile?.account_type;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-bold text-foreground hover:scale-105 transition-transform min-h-[44px]"
          >
            <div className="relative">
              <Car className="w-6 h-6 sm:w-7 sm:h-7" />
              <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-glow" />
            </div>
            <span className="hidden xs:inline">SchoolPool</span>
          </button>

          {/* Main Tabs - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {user && mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.path}
                  variant={isActive(tab.path) ? "default" : "ghost"}
                  onClick={() => navigate(tab.path)}
                  className={`gap-2 relative ${
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
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side - Account Badge & Notifications */}
          <div className="flex items-center gap-3">
            {user && accountType && (
              <Badge
                variant={accountType === "student" ? "secondary" : "default"}
                className={`hidden sm:flex gap-1 ${
                  accountType === "student"
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-green-500/10 text-green-600"
                }`}
              >
                {accountType === "student" ? (
                  <>
                    <GraduationCap className="h-3 w-3" />
                    Student
                  </>
                ) : (
                  "Parent"
                )}
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

        </div>
      </div>
    </nav>
  );
};

export default TabNavigation;
