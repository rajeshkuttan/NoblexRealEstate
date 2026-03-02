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
  ShoppingCart,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      { name: "Receivables", href: "/receivables", icon: Receipt },
      { name: "Vendors & AP", href: "/vendors", icon: Building },
      { name: "Treasury", href: "/treasury", icon: Landmark },
      { name: "Chart of Accounts", href: "/chart-of-accounts", icon: BookOpen },
      { name: "Journal Voucher", href: "/journal-vouchers", icon: FileText },
      { name: "Budget", href: "/budget", icon: PieChart },
      { name: "Ledger Setup", href: "/ledger-setups", icon: Settings },
    ]
  },
  { name: "Procurement", href: "/procurement", icon: ShoppingCart },
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
                         location.pathname.startsWith('/receivables') ||
                         location.pathname === '/vendors' || 
                         location.pathname === '/treasury' ||
                         location.pathname === '/chart-of-accounts' ||
                         location.pathname === '/budget' ||
                         location.pathname === '/ledger-setups';

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

        {/* Spacer so nav scrolls but sidebar keeps its height */}
        <div className="p-4" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-10 flex items-center justify-end px-8 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3">
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">{user?.name}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="p-8 min-h-full flex-1">{children}</div>
      </main>
    </div>
  );
}
