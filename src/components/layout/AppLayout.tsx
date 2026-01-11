import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  Wrench,
  BarChart3,
  LayoutDashboard,
  Settings,
  Target,
  Globe,
  Home,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Building,
  Landmark,
  BookOpen,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import WithuLogo from "@/components/ui/WithuLogo";

interface AppLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  hasSubmenu?: boolean;
  submenu?: {
    name: string;
    href: string;
    icon: any;
  }[];
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "Units", href: "/units", icon: Home },
  { name: "Leads", href: "/leads", icon: Target },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Leases", href: "/leases", icon: FileText },
  { 
    name: "Finance", 
    icon: DollarSign,
    hasSubmenu: true,
    submenu: [
      { name: "Overview", href: "/finance", icon: LayoutDashboard },
      { name: "Vendors & AP", href: "/vendors", icon: Building },
      { name: "Treasury", href: "/treasury", icon: Landmark },
      { name: "Chart of Accounts", href: "/chart-of-accounts", icon: BookOpen },
      { name: "Budget", href: "/budget", icon: PieChart },
    ]
  },
  { name: "Helpdesk", href: "/helpdesk", icon: Wrench },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Marketing", href: "/marketing", icon: Globe },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>('Finance');

  // Check if any finance submenu item is active
  const isFinanceActive = location.pathname.startsWith('/finance') || 
                         location.pathname === '/vendors' || 
                         location.pathname === '/treasury' ||
                         location.pathname === '/chart-of-accounts' ||
                         location.pathname === '/budget';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <WithuLogo size="md" variant="white" />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            if (item.hasSubmenu && item.submenu) {
              const isOpen = openSubmenu === item.name;
              
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setOpenSubmenu(isOpen ? null : item.name)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isFinanceActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.submenu.map((subItem) => {
                        const isActive = location.pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-3 text-sidebar-foreground/70">
            <User className="h-5 w-5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/50">{user?.role}</p>
            </div>
          </div>
          
          <Link
            to="/settings"
            className="flex items-center gap-3 px-4 py-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground rounded-lg transition-all duration-200"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
          
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start gap-3 px-4 py-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
