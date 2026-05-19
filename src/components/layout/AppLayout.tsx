import { Fragment, ReactNode, useState, useCallback, useEffect } from "react";
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
  FileSpreadsheet,
  ClipboardList,
  Percent,
  History,
  Megaphone,
  Scale,
  FileCheck,
  PanelLeftClose,
  PanelRightOpen,
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
import { NAV_PERMISSION_BY_HREF } from "@/lib/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    { name: "PDC register", href: "/finance/pdc", icon: FileCheck },
    {
      name: "Supplier open invoices",
      href: "/finance/supplier-open-invoices",
      icon: FileSpreadsheet,
    },
    {
      name: "Tenant open invoices",
      href: "/finance/tenant-open-invoices",
      icon: ClipboardList,
    },
    { name: "VAT return", href: "/finance/vat-return", icon: Percent },
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
      {
        name: "Building announcements",
        href: "/communications/building-announcements",
        icon: Megaphone,
      },
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
      { name: "Activity log", href: "/utilities/activity-log", icon: History },
    ],
  },
];

/** Icon-only narrow rail (width); separate from submenu expand/collapse. */
const SIDEBAR_RAIL_KEY = "sidebar-icon-rail";
const LEGACY_SIDEBAR_EXPANDED_KEY = "sidebar-expanded";

function readInitialIconRail(): boolean {
  if (typeof window === "undefined") return false;
  const rail = localStorage.getItem(SIDEBAR_RAIL_KEY);
  if (rail === "1") return true;
  if (rail === "0") return false;
  // Migrate old key: "1" meant full labels, "0" or absent meant icon rail
  const legacy = localStorage.getItem(LEGACY_SIDEBAR_EXPANDED_KEY);
  if (legacy === "0") return true;
  return false;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user, logout, can } = useAuth();
  const { companyName, companyLogoPath } = useSettings();
  /** True = narrow icon-only sidebar. Default false = full labels; "collapse" for submenus is `openSubmenu`. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readInitialIconRail);
  /** null = all nested submenus (e.g. Finance) closed — main menu only. */
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_RAIL_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const isFinanceActive =
    location.pathname.startsWith("/finance") ||
    location.pathname.startsWith("/receivables") ||
    location.pathname === "/vendors" ||
    location.pathname === "/treasury" ||
    location.pathname === "/chart-of-accounts" ||
    location.pathname === "/budget" ||
    location.pathname === "/ledger-setups" ||
    location.pathname.startsWith("/journal-vouchers");

  // Collapse Finance submenu when leaving finance routes — do not depend on `openSubmenu`
  // or clicking Finance on Dashboard would open then immediately close (flash).
  useEffect(() => {
    if (!isFinanceActive) {
      setOpenSubmenu((prev) => (prev === "Finance" ? null : prev));
    }
  }, [location.pathname, isFinanceActive]);

  const renderNavItem = (item: NavigationItem) => {
    if (item.href) {
      const permissionCode = NAV_PERMISSION_BY_HREF[item.href];
      if (permissionCode && !can(permissionCode)) {
        return null;
      }
    }

    if (item.hasSubmenu && item.submenu) {
      const filteredSubmenu = item.submenu.filter((subItem) => {
        const permissionCode = NAV_PERMISSION_BY_HREF[subItem.href];
        return !permissionCode || can(permissionCode);
      });
      if (filteredSubmenu.length === 0) {
        return null;
      }
      const isOpen = openSubmenu === item.name;

      if (sidebarCollapsed) {
        return (
          <DropdownMenu key={item.name}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={item.name}
                className={cn(
                  "uiux-sidebar-nav-item w-full justify-center border-0 bg-transparent cursor-pointer",
                  isFinanceActive ? "uiux-sidebar-nav-item-active" : undefined,
                )}
              >
                <item.icon className="uiux-sidebar-icon" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={10} className="min-w-[220px]">
              {filteredSubmenu.map((subItem) => (
                <DropdownMenuItem key={subItem.name} asChild>
                  <Link to={subItem.href} className="flex cursor-pointer items-center gap-2">
                    <subItem.icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} />
                    {subItem.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

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
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <item.icon className="uiux-sidebar-icon shrink-0" strokeWidth={1.5} />
              <span className="uiux-sidebar-item-label truncate">{item.name}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
            )}
          </button>
          {isOpen && (
            <div className="mt-0.5 space-y-px">
              {filteredSubmenu.map((subItem) => {
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
    const link = (
      <Link
        to={item.href!}
        className={cn("uiux-sidebar-nav-item", isActive ? "uiux-sidebar-nav-item-active" : undefined)}
      >
        <item.icon className="uiux-sidebar-icon" strokeWidth={1.5} />
        <span className="uiux-sidebar-item-label">{item.name}</span>
      </Link>
    );
    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.name} delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-[var(--color-bg-base)]">
        <aside className={cn("uiux-sidebar flex flex-col", sidebarCollapsed && "uiux-sidebar-collapsed")}>
        <div className="uiux-sidebar-logo">
          {companyLogoPath ? (
            <img
              src={resolveImageUrl(companyLogoPath)}
              alt={companyName || "Company logo"}
              className={cn(
                "max-h-10 w-auto object-contain",
                sidebarCollapsed ? "mx-auto max-w-[40px] object-center" : "max-w-[168px] object-left",
              )}
            />
          ) : (
            <WithuLogo size="md" variant="white" />
          )}
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-0 pb-1">
          {navSections.map((section) => {
            const renderedItems = section.items
              .map((item) => {
                const node = renderNavItem(item);
                if (!node) return null;
                return <Fragment key={item.name}>{node}</Fragment>;
              })
              .filter(Boolean);
            if (renderedItems.length === 0) return null;
            return (
              <div key={section.label}>
                <div className="uiux-sidebar-section-label">{section.label}</div>
                <div className="space-y-px">{renderedItems}</div>
              </div>
            );
          })}
        </nav>
        <div className="mt-auto flex shrink-0 justify-center border-t border-[rgba(201,146,43,0.12)] py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9 rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            aria-label={sidebarCollapsed ? "Show full navigation with labels" : "Icon-only sidebar"}
            title={sidebarCollapsed ? "Show full navigation with labels" : "Icon-only sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelRightOpen className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="h-5 w-5" strokeWidth={1.5} />
            )}
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "uiux-main-shell",
          sidebarCollapsed && "uiux-main-shell-sidebar-collapsed",
        )}
      >
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
    </TooltipProvider>
  );
}
