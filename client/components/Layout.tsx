import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Settings } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: ReactNode;
  authenticated?: boolean;
  onLogout?: () => void;
}

export const Layout = ({
  children,
  authenticated = false,
  onLogout,
}: LayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground";

  const navItems = authenticated
    ? [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Reports", path: "/reports" },
      { label: "Maps", path: "/maps" },
    ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-1 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-1 group">
              <div className="flex items-center">
                <img
                  src={`${import.meta.env.BASE_URL}logo2.png`}
                  alt="MedLyf Logo"
                  className="w-15.1 h-12 object-contain"
                />
              </div>
              <span className="font-bold text-lg hidden sm:inline">
                {/* <span className="font-Poppins font-semibold text-4xl text-[#5167b3] tracking-wide">
                  medlyf
                </span> */}
                {/* <span className="text-foreground">Care</span> */}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {authenticated && navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors ${isActive(item.path)} pb-2`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <>
                <Link
                  to="/settings"
                  className="p-2 rounded-lg hover:bg-muted transition-colors md:flex hidden items-center justify-center"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && authenticated && (
            <nav className="md:hidden mt-4 pt-4 border-t border-border space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-4 py-2 rounded-lg transition-colors ${location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-muted/30 py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">ICUCare AI</h3>
              <p className="text-sm text-muted-foreground">
                Adaptive multi-agent AI system for managing ICU and oxygen demand
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>&copy; 2025 ICUCare AI. All rights reserved.</p>
            <p>Serving Tier-2 and Tier-3 Hospitals Across India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
