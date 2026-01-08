import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Car, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NotificationDropdown } from "./NotificationDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsParent(false);
        setUserRole(null);
        setPendingRequestsCount(0);
        return;
      }
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setUserRole(data.role);
        setIsParent(data.role === 'parent');
        
        if (data.role === 'parent') {
          fetchPendingRequests();
        }
      }
    };
    
    checkUserRole();
  }, [user]);

  const fetchPendingRequests = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from('account_links')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', user.id)
      .eq('status', 'pending');
    
    setPendingRequestsCount(count || 0);
  };

  // Real-time subscription for pending requests
  useEffect(() => {
    if (!user || !isParent) return;

    const channel = supabase
      .channel('parent-link-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_links',
          filter: `parent_id=eq.${user.id}`,
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isParent]);

  const scrollToSection = (id: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          const offset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        const offset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    }
    setIsMobileMenuOpen(false);
  };

  // Define navigation item type
  type NavItem = {
    label: string;
    path: string;
    authRequired?: boolean;
    parentOnly?: boolean;
  };

  // Main navigation items (always visible)
  const mainNavItems: NavItem[] = [
    { label: "Features", path: "/features" },
    { label: userRole === 'student' ? "Family Carpools" : "Dashboard", path: "/dashboard", authRequired: true },
  ];

  // Additional navigation items (in hamburger menu)
  const moreNavItems: NavItem[] = [
    { label: "About", path: "/about" },
    { label: "Safety", path: "/safety" },
    { label: "How It Works", path: "/how-it-works" },
    { label: "Map & Routes", path: "/map", authRequired: true },
    { label: "Settings", path: "/settings", authRequired: true },
  ];

  // Student-specific navigation items
  const studentNavItems: NavItem[] = [
    { label: "Family Links", path: "/family-links", authRequired: true },
  ];

  const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled
      ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg"
      : "bg-background/80 backdrop-blur-md border-b border-border/30"
  }`;

  const textColorClass = "text-foreground";
  const hoverColorClass = "hover:text-primary";

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className={`flex items-center gap-2 text-2xl font-bold transition-all duration-300 ${textColorClass} hover:scale-105`}
          >
            <div className="relative">
              <Car className="w-8 h-8" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-glow" />
            </div>
            <span className={textColorClass}>SchoolPool</span>
          </button>

          {/* Desktop Navigation - Home Icon + Main Items + More Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Home Icon Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className={`transition-all duration-200 ${textColorClass} ${hoverColorClass} hover:scale-110`}
              aria-label="Home"
            >
              <Home className="h-5 w-5" />
            </Button>

            {/* Main Navigation Buttons */}
            {mainNavItems.map((item) => {
              if (item.authRequired && !user) return null;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className={`relative text-[15px] font-medium transition-all duration-200 ${textColorClass} ${hoverColorClass} hover:scale-105`}
                >
                  {item.label}
                </Button>
              );
            })}

            {/* Profile/Login Button */}
            {user ? (
              <div className="flex items-center gap-3">
                {userRole && (
                  <Badge 
                    variant={userRole === 'student' ? 'secondary' : 'default'}
                    className={`hidden sm:flex ${
                      userRole === 'student' 
                        ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' 
                        : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                    }`}
                  >
                    {userRole === 'student' ? 'Student - View Only' : 'Parent Account'}
                  </Badge>
                )}
                <NotificationDropdown />
                <Button
                  onClick={() => navigate("/profile")}
                  className="rounded-full px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-250"
                >
                  Profile
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="rounded-full px-6 transition-all duration-250 hover:scale-105 hover:-translate-y-0.5"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => navigate("/register")}
                  className="rounded-full px-7 py-2.5 bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-2xl hover:-translate-y-1 hover:brightness-110 transition-all duration-250 shadow-lg"
                >
                  Sign Up
                </Button>
              </>
            )}

            {/* More Menu (Hamburger) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`transition-all duration-200 ${textColorClass} hover:bg-primary/10`}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border-border z-[100]">
                {moreNavItems.map((item) => {
                  if (item.parentOnly && !isParent) return null;
                  return (
                    <DropdownMenuItem
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{item.label}</span>
                        {item.path === '/family-links' && pendingRequestsCount > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {pendingRequestsCount}
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
                {user && userRole === 'student' && studentNavItems.map((item) => (
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

          {/* Mobile: Notification Bell + Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationDropdown />}
            <button
              className="p-2 transition-transform duration-200 hover:scale-110"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className={`h-6 w-6 ${textColorClass}`} />
              ) : (
                <Menu className={`h-6 w-6 ${textColorClass}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-foreground/95 backdrop-blur-xl border-t border-border animate-fade-in">
          <div className="px-4 py-6 space-y-1">
            {/* Home button in mobile menu */}
            <button
              onClick={() => {
                navigate("/");
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full text-left px-4 py-3 text-background hover:bg-background/10 rounded-lg transition-all duration-200 font-medium"
            >
              <Home className="h-5 w-5" />
              Home
            </button>
            
            {[...mainNavItems, ...moreNavItems, ...(userRole === 'student' ? studentNavItems : [])].map((item, index) => {
              if (item.authRequired && !user) return null;
              if (item.parentOnly && !isParent) return null;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 text-background hover:bg-background/10 rounded-lg transition-all duration-200 font-medium"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {item.label}
                </button>
              );
            })}
            
            <div className="pt-4 space-y-3">
              {user ? (
                <Button
                  onClick={() => {
                    navigate("/profile");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white"
                >
                  Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate("/login");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-background border border-background/30 hover:bg-background/10"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => {
                      navigate("/register");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
