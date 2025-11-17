import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Car } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const navItems = [
    { label: "Home", id: "home" },
    { label: "About", id: "mission" },
    { label: "Features", id: "features" },
    { label: "Safety", id: "safety" },
    { label: "How It Works", id: "how-it-works" },
  ];

  const navClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled
      ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg"
      : "bg-transparent"
  }`;

  const textColorClass = isScrolled || !isHomePage ? "text-foreground" : "text-white";
  const hoverColorClass = "hover:text-primary";

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button
            onClick={() => scrollToSection("home")}
            className={`flex items-center gap-2 text-2xl font-bold transition-all duration-300 ${textColorClass} hover:scale-105`}
          >
            <div className="relative">
              <Car className="w-8 h-8" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal rounded-full animate-glow" />
            </div>
            <span className="gradient-text">SchoolPool</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`relative text-[15px] font-medium transition-all duration-200 ${textColorClass} ${hoverColorClass} hover:scale-105 group`}
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-teal transition-all duration-200 group-hover:w-full" />
              </button>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => navigate("/dashboard")}
                  className={`transition-all duration-250 ${textColorClass} hover:bg-teal/10`}
                >
                  Dashboard
                </Button>
                <Button
                  onClick={() => navigate("/profile")}
                  className="rounded-full px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-250"
                >
                  Profile
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  className={`rounded-full px-6 border-2 transition-all duration-250 hover:scale-105 hover:-translate-y-0.5 ${
                    isScrolled || !isHomePage
                      ? "border-foreground text-foreground hover:bg-foreground hover:text-background"
                      : "border-white text-white hover:bg-white hover:text-foreground"
                  }`}
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
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 transition-transform duration-200 hover:scale-110"
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

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-foreground/95 backdrop-blur-xl border-t border-border animate-fade-in">
          <div className="px-4 py-6 space-y-1">
            {navItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="block w-full text-left px-4 py-3 text-background hover:bg-background/10 rounded-lg transition-all duration-200 font-medium"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {item.label}
              </button>
            ))}
            
            <div className="pt-4 space-y-3">
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate("/dashboard");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-background border-background/20 hover:bg-background/10"
                  >
                    Dashboard
                  </Button>
                  <Button
                    onClick={() => {
                      navigate("/profile");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-white"
                  >
                    Profile
                  </Button>
                </>
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
