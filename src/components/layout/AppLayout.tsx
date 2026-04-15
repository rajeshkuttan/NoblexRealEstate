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
  Scale,
} from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
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

const financeSubmenu: NavigationItem = {
  name: "Finance",
  icon: DollarSign,
  hasSubmenu: true,
  submenu: [
    { name: "Payables", href: "/finance", icon: LayoutDashboard },
    { name: "Receivables", href: "/receivables", icon: Receipt },
    { name: "Vendors & AP", href: "/vendors", icon: Building },
    { name: "Treasury", href: "/treasury", icon: Landmark },
    { name: "Chart of Accounts", href: "/chart-of-accounts", icon: BookOpen },
    { name: "Journal Voucher", href: "/journal-vouchers", icon: FileText },
    { name: "Budget", href: "/budget", icon: PieChart },
    { name: "Ledger Setup", href: "/ledger-setups", icon: Settings },
  ],
};

const navSections: { label: string; items: NavigationItem[] }[] = [
  { label: "OVERVIEW", items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }] },
  {
    label: "PORTFOLIO",
    items: [
      { name: "Properties", href: "/properties", icon: Building2 },
      { name: "Units", href: "/units", icon: Home },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Leads", href: "/leads", icon: Target },
      { name: "Tenants", href: "/tenants", icon: Users },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { name: "Leases", href: "/leases", icon: FileText },
      { name: "Legal", href: "/legal", icon: Scale },
    ],
  },
  { label: "FINANCE", items: [financeSubmenu] },
  {
    label: "MORE",
    items: [
      { name: "Procurement", href: "/procurement", icon: ShoppingCart },
      { name: "Helpdesk", href: "/helpdesk", icon: Wrench },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Marketing", href: "/marketing", icon: Globe },
    ],
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { companyName, companyLogoPath } = useSettings();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>("Finance");

  const isFinanceActive =
    location.pathname.startsWith("/finance") ||
    location.pathname.startsWith("/receivables") ||
    location.pathname === "/vendors" ||
    location.pathname === "/treasury" ||
    location.pathname === "/chart-of-accounts" ||
    location.pathname === "/budget" ||
    location.pathname === "/ledger-setups" ||
    location.pathname.startsWith("/journal-vouchers");

  const renderNavItem = (item: NavigationItem) => {
    if (item.hasSubmenu && item.submenu) {
      const isOpen = openSubmenu === item.name;
      return (
        <div key={item.name}>
          <button
            type="button"
            onClick={() => setOpenSubmenu(isOpen ? null : item.name)}
            className={cn(
              "uiux-sidebar-nav-item w-full justify-between border-0 bg-transparent cursor-pointer",
              isFinanceActive ? "uiux-sidebar-nav-item-active" : undefined,
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="uiux-sidebar-icon" strokeWidth={1.5} />
              <span>{item.name}</span>
            </div>
            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 opacity-70" /> : <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />}
          </button>
          {isOpen && (
            <div className="mt-1 space-y-0.5">
              {item.submenu.map((subItem) => {
                const isActive = location.pathname === subItem.href;
                return (
                  <Link
                    key={subItem.name}
                    to={subItem.href}
                    className={cn(
                      "uiux-sidebar-sub-item",
                      isActive ? "uiux-sidebar-sub-item-active" : undefined,
                    )}
                  >
                    <subItem.icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} />
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
        to={item.href!}
        className={cn("uiux-sidebar-nav-item", isActive ? "uiux-sidebar-nav-item-active" : undefined)}
      >
        <item.icon className="uiux-sidebar-icon" strokeWidth={1.5} />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <aside className="uiux-sidebar">
        <div className="uiux-sidebar-logo">
          {companyLogoPath ? (
            <img
              src={resolveImageUrl(companyLogoPath)}
              alt={companyName || "Company logo"}
              className="max-h-10 w-auto max-w-[168px] object-contain object-left"
            />
          ) : (
            <WithuLogo size="md" variant="white" />
          )}
        </div>
        <nav className="flex-1 pb-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="uiux-sidebar-section-label">{section.label}</div>
              <div className="space-y-0.5">{section.items.map((item) => renderNavItem(item))}</div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="uiux-main-shell">
        <header className={cn("uiux-topbar", "!justify-between")}>
          <div className="min-w-0 flex-1 pr-4 flex items-center">
            {companyName ? (
              <span
                className="text-sm font-semibold text-[var(--color-text-primary)] truncate max-w-[min(100%,28rem)]"
                title={companyName}
              >
                {companyName}
              </span>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2.5 px-3 py-1.5 h-auto rounded-[var(--radius-md)] border border-[rgba(13,21,38,0.08)] hover:bg-[var(--color-bg-subtle)]"
              >
                <User className="h-5 w-5 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{user?.name}</span>
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
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="uiux-content-area uiux-page-enter">{children}</div>
      </div>
    </div>
  );
}
