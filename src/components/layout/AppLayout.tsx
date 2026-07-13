import { Fragment, ReactNode, useState, useCallback, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Buildings,
  ChartBar,
  ClockCounterClockwise,
  CurrencyCircleDollar,
  FileText,
  Gear,
  House,
  MagnifyingGlass,
  Megaphone,
  Scales,
  ShoppingCart,
  SquaresFour,
  Users,
  Wrench,
  CaretDown,
  CaretRight,
  SignOut,
  User,
  Bell,
  ArrowsLeftRight,
  ChartLineUp,
  Tag,
  ChatCircle,
  HandCoins,
} from "@phosphor-icons/react";
import { ChevronDown } from "lucide-react";
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
import { useCompany } from "@/contexts/CompanyContext";
import NobleXLogo from "@/components/ui/NobleXLogo";
import { NobleXCommandPalette } from "@/components/noblex/NobleXCommandPalette";
import { isRtl, setStoredLanguage } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NAV_PERMISSION_BY_HREF, canAccessPayrollNav } from "@/lib/permissions";
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
  nameKey?: string;
  href?: string;
  icon: React.ComponentType<{ className?: string; size?: number; weight?: "bold" | "regular" }>;
  hasSubmenu?: boolean;
  submenu?: {
    name: string;
    nameKey?: string;
    href: string;
    icon: React.ComponentType<{ className?: string; size?: number; weight?: "bold" | "regular" }>;
  }[];
}

const BREADCRUMB_MAP: Record<string, string> = {
  "/": "nav.dashboard",
  "/properties": "nav.assets",
  "/units": "nav.units",
  "/leases": "nav.leases",
  "/tenants": "nav.tenants",
  "/leads": "nav.leads",
  "/settings": "nav.settings",
  "/reports": "nav.reports",
};

const investmentSubmenu: NavigationItem = {
  name: "Investments",
  nameKey: "nav.investments",
  icon: ChartLineUp,
  hasSubmenu: true,
  submenu: [
    { name: "Dashboard", nameKey: "nav.investmentsDashboard", href: "/investments/dashboard", icon: SquaresFour },
    { name: "Portfolio", nameKey: "nav.investmentsPortfolio", href: "/investments/portfolio", icon: ChartBar },
    { name: "Transactions", nameKey: "nav.investmentsTransactions", href: "/investments/transactions", icon: ArrowsLeftRight },
    { name: "Dividends", nameKey: "nav.investmentsDividends", href: "/investments/dividends", icon: CurrencyCircleDollar },
    { name: "Distributions", nameKey: "nav.investmentsDistributions", href: "/investments/distributions", icon: HandCoins },
    { name: "Valuations", nameKey: "nav.investmentsValuations", href: "/investments/valuations", icon: ChartLineUp },
    { name: "Allocations", nameKey: "nav.investmentsAllocations", href: "/investments/partner-allocations", icon: Users },
    { name: "Reports", nameKey: "nav.investmentsReports", href: "/investments/reports", icon: FileText },
    { name: "Categories", nameKey: "nav.investmentsCategories", href: "/investments/categories", icon: Tag },
    { name: "Settings", nameKey: "nav.investmentsSettings", href: "/investments/settings", icon: Gear },
  ],
};

const financeSubmenu: NavigationItem = {
  name: "Finance",
  nameKey: "nav.finance",
  icon: CurrencyCircleDollar,
  hasSubmenu: true,
  submenu: [
    { name: "Payables", nameKey: "nav.financePayables", href: "/finance", icon: SquaresFour },
    { name: "PDC register", nameKey: "nav.financePdc", href: "/finance/pdc", icon: FileText },
    { name: "Supplier open invoices", nameKey: "nav.financeSupplierOpen", href: "/finance/supplier-open-invoices", icon: FileText },
    { name: "Direct purchase invoices", nameKey: "nav.financeDirectPurchase", href: "/finance/direct-purchase-invoices", icon: FileText },
    { name: "Tenant open invoices", nameKey: "nav.financeTenantOpen", href: "/finance/tenant-open-invoices", icon: FileText },
    { name: "VAT return", nameKey: "nav.financeVatReturn", href: "/finance/vat-return", icon: FileText },
    { name: "Receivables", nameKey: "nav.financeReceivables", href: "/receivables", icon: FileText },
    { name: "Vendors & AP", nameKey: "nav.financeVendors", href: "/vendors", icon: Buildings },
    { name: "Treasury", nameKey: "nav.financeTreasury", href: "/treasury", icon: CurrencyCircleDollar },
    { name: "Chart of Accounts", nameKey: "nav.financeCoa", href: "/chart-of-accounts", icon: FileText },
    { name: "Journal Voucher", nameKey: "nav.financeJournal", href: "/journal-vouchers", icon: FileText },
    { name: "Budget", nameKey: "nav.financeBudget", href: "/budget", icon: ChartBar },
    { name: "Ledger Setup", nameKey: "nav.financeLedgerSetup", href: "/ledger-setups", icon: Gear },
  ],
};

const navSections: { labelKey: string; items: NavigationItem[] }[] = [
  { labelKey: "nav.overview", items: [{ name: "Dashboard", nameKey: "nav.dashboard", href: "/", icon: SquaresFour }] },
  {
    labelKey: "nav.portfolio",
    items: [
      { name: "Assets", nameKey: "nav.assets", href: "/properties", icon: Buildings },
      { name: "Units", nameKey: "nav.units", href: "/units", icon: House },
    ],
  },
  {
    labelKey: "nav.operations",
    items: [
      { name: "Leases", nameKey: "nav.leases", href: "/leases", icon: FileText },
      { name: "Renewals", nameKey: "nav.renewals", href: "/leases", icon: FileText },
      { name: "Building Notices", nameKey: "nav.buildingAnnouncements", href: "/communications/building-announcements", icon: Megaphone },
      { name: "Legal", nameKey: "nav.legal", href: "/legal", icon: Scales },
      { name: "Procurement", nameKey: "nav.procurement", href: "/procurement", icon: ShoppingCart },
    ],
  },
  {
    labelKey: "nav.people",
    items: [
      { name: "Tenants", nameKey: "nav.tenants", href: "/tenants", icon: Users },
      { name: "Leads", nameKey: "nav.leads", href: "/leads", icon: Users },
      { name: "Payroll", nameKey: "nav.payroll", href: "/people/payroll", icon: Users },
    ],
  },
  { labelKey: "nav.finance", items: [financeSubmenu, investmentSubmenu] },
  {
    labelKey: "nav.platform",
    items: [
      { name: "Copilot", nameKey: "nav.copilot", href: "/copilot", icon: ChatCircle },
      { name: "Helpdesk", nameKey: "nav.helpdesk", href: "/helpdesk", icon: Wrench },
      { name: "Reports", nameKey: "nav.reports", href: "/reports", icon: ChartBar },
      { name: "Activity Log", nameKey: "nav.activityLog", href: "/utilities/activity-log", icon: ClockCounterClockwise },
      { name: "Settings", nameKey: "nav.settings", href: "/settings", icon: Gear },
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
  const { t, i18n } = useTranslation();
  const { user, logout, can } = useAuth();
  const { companyName, companyLogoPath } = useSettings();
  const { companies, activeCompany, activeCompanyId, switchCompany, isCompanyLoading, isSwitching } =
    useCompany();
  const displayCompanyName = activeCompany?.company_name || companyName;
  const [commandOpen, setCommandOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "ar">(i18n.language === "ar" ? "ar" : "en");
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const switchLang = (next: "en" | "ar") => {
    setLang(next);
    void i18n.changeLanguage(next);
    setStoredLanguage(next);
  };

  const breadcrumb = useMemo(() => {
    const exact = BREADCRUMB_MAP[location.pathname];
    if (exact) return t(exact);

    const investmentMatch = investmentSubmenu.submenu?.find(
      (sub) => location.pathname === sub.href || location.pathname.startsWith(`${sub.href}/`)
    );
    if (investmentMatch) {
      return investmentMatch.nameKey ? t(investmentMatch.nameKey) : investmentMatch.name;
    }
    if (location.pathname.startsWith("/investments/assets/")) {
      if (location.pathname.endsWith("/edit")) {
        return `${t("nav.investmentsPortfolio")} / ${t("common.editSuffix")}`;
      }
      return t("nav.investmentsPortfolio");
    }
    if (location.pathname.startsWith("/investments")) {
      return t("nav.investments");
    }

    return location.pathname.split("/").filter(Boolean).pop() || "";
  }, [location.pathname, t]);

  const renderNavItem = (item: NavigationItem) => {
    if (item.href) {
      const permissionCode = NAV_PERMISSION_BY_HREF[item.href];
      if (item.href === "/people/payroll") {
        if (!canAccessPayrollNav(can, user?.permissions)) return null;
      } else if (permissionCode && !can(permissionCode)) {
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
                title={item.nameKey ? t(item.nameKey) : item.name}
                className={cn(
                  "uiux-sidebar-nav-item w-full justify-center border-0 bg-transparent cursor-pointer",
                  isFinanceActive ? "uiux-sidebar-nav-item-active" : undefined,
                )}
              >
                <item.icon className="uiux-sidebar-icon" size={18} weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isRtl() ? "left" : "right"} align="start" sideOffset={10} className="min-w-[220px]">
              {filteredSubmenu.map((subItem) => (
                <DropdownMenuItem key={subItem.name} asChild>
                  <Link to={subItem.href} className="flex cursor-pointer items-center gap-2">
                    <subItem.icon className="h-4 w-4 shrink-0 opacity-80" size={16} weight="bold" />
                    {subItem.nameKey ? t(subItem.nameKey) : subItem.name}
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
              <item.icon className="uiux-sidebar-icon shrink-0" size={18} weight="bold" />
              <span className="uiux-sidebar-item-label truncate">{item.nameKey ? t(item.nameKey) : item.name}</span>
            </div>
            {isOpen ? (
              <CaretDown className="h-4 w-4 shrink-0 opacity-70" size={16} weight="bold" />
            ) : (
              <CaretRight className="h-4 w-4 shrink-0 opacity-70" size={16} weight="bold" />
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
                    <subItem.icon className="h-4 w-4 shrink-0 opacity-80" size={16} weight="bold" />
                    <span>{subItem.nameKey ? t(subItem.nameKey) : subItem.name}</span>
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
        <item.icon className="uiux-sidebar-icon" size={18} weight="bold" />
        <span className="uiux-sidebar-item-label">{item.nameKey ? t(item.nameKey) : item.name}</span>
      </Link>
    );
    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.name} delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side={isRtl() ? "left" : "right"} sideOffset={10} className="text-xs font-medium">
            {item.nameKey ? t(item.nameKey) : item.name}
          </TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <NobleXCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <div className="min-h-screen bg-noblex-obsidian">
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
            <NobleXLogo size="md" collapsed={sidebarCollapsed} />
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
              <div key={section.labelKey}>
                <div className="uiux-sidebar-section-label">{t(section.labelKey)}</div>
                <div className="space-y-px">{renderedItems}</div>
              </div>
            );
          })}
        </nav>
        <div className="mt-auto flex shrink-0 justify-center border-t border-noblex-border py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9 rounded-md text-noblex-slate hover:bg-noblex-border hover:text-noblex-platinum"
            aria-label={sidebarCollapsed ? t("common.expandSidebar") : t("common.collapseSidebar")}
          >
            <ArrowsLeftRight size={18} weight="bold" />
          </Button>
        </div>
      </aside>

      <div
        className={cn(
          "uiux-main-shell",
          sidebarCollapsed && "uiux-main-shell-sidebar-collapsed",
        )}
      >
        <header className="uiux-topbar">
          <nav className="uiux-breadcrumb" aria-label="Breadcrumb">
            <span>{t("common.brand")}</span>
            {breadcrumb && (
              <>
                <span className="text-noblex-border">›</span>
                <span className="uiux-breadcrumb-current">{breadcrumb}</span>
              </>
            )}
          </nav>
          <div className="uiux-topbar-actions">
            <button
              type="button"
              className="uiux-global-search-trigger"
              onClick={() => setCommandOpen(true)}
            >
              <MagnifyingGlass size={16} weight="bold" />
              <span className="hidden sm:inline">{t("topbar.search")}</span>
            </button>
            <div className="uiux-lang-toggle">
              <button type="button" className={lang === "en" ? "active" : ""} onClick={() => switchLang("en")}>
                EN
              </button>
              <button type="button" className={lang === "ar" ? "active" : ""} onClick={() => switchLang("ar")}>
                AR
              </button>
            </div>
            {!isCompanyLoading && companies.length > 1 && activeCompanyId ? (
              <Select
                value={String(activeCompanyId)}
                disabled={isSwitching}
                onValueChange={async (v) => {
                  const next = Number(v);
                  if (next === activeCompanyId) return;
                  await switchCompany(next);
                }}
              >
                <SelectTrigger className="w-[min(100%,12rem)] h-9 text-sm border-noblex-border bg-noblex-surface text-noblex-platinum">
                  <SelectValue placeholder={t("common.company")} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : displayCompanyName ? (
              <span className="text-sm text-noblex-silver truncate max-w-[12rem] hidden md:inline" title={displayCompanyName}>
                {displayCompanyName}
              </span>
            ) : null}
            <Button variant="ghost" size="icon" className="text-noblex-slate hover:text-noblex-platinum relative">
              <Bell size={18} weight="bold" />
            </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-3 py-1.5 h-auto rounded-[var(--radius-btn)] border border-noblex-border hover:bg-noblex-surface text-noblex-platinum"
              >
                <User size={18} weight="bold" className="text-noblex-silver" />
                <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-noblex-surface border-noblex-border">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-medium text-noblex-platinum">{user?.name}</p>
                  <p className="text-xs text-noblex-slate">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User size={16} weight="bold" />
                  <span>{t("topbar.profile")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Gear size={16} weight="bold" />
                  <span>{t("nav.settings")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 cursor-pointer text-noblex-rose focus:text-noblex-rose"
              >
                <SignOut size={16} weight="bold" />
                <span>{t("topbar.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        <div
          key={activeCompanyId ?? "no-company"}
          className={cn(
            "uiux-content-area uiux-page-enter",
            location.pathname.startsWith("/copilot") && "uiux-content-area-full"
          )}
        >
          {children}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
