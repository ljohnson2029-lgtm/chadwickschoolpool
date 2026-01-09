import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-background">Chadwick SchoolPool</h3>
            <p className="text-background/80 leading-relaxed">
              Connecting Chadwick families for safer, smarter, and more sustainable carpooling.
            </p>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-background">Contact & Support</h4>
            <div className="space-y-3">
              <a 
                href="mailto:support@chadwickschoolpool.org" 
                className="flex items-center gap-2 text-background/80 hover:text-background transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>support@chadwickschoolpool.org</span>
              </a>
              <p className="text-background/60 text-sm">Response time: 24-48 hours</p>
              <Link 
                to="/help" 
                className="block text-background/80 hover:text-background transition-colors"
              >
                Help Center
              </Link>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-background">Quick Links</h4>
            <div className="space-y-3">
              <Link 
                to="/privacy" 
                className="block text-background/80 hover:text-background transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/terms" 
                className="block text-background/80 hover:text-background transition-colors"
              >
                Terms of Service
              </Link>
              <Link 
                to="/about" 
                className="block text-background/80 hover:text-background transition-colors"
              >
                About Us
              </Link>
              <Link 
                to="/safety" 
                className="block text-background/80 hover:text-background transition-colors"
              >
                Safety
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/20">
          <p className="text-background/60 text-sm text-center">
            © {currentYear} Chadwick SchoolPool. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
