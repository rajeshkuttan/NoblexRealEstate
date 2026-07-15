import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Buildings,
  ChartLineUp,
  FileText,
  House,
  MagnifyingGlass,
  Users,
} from "@phosphor-icons/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { propertiesAPI, tenantsAPI, unitsAPI, leasesAPI, investmentsAPI } from "@/services/api";

const RECENTS_KEY = "noblex-command-recents";

type RecentItem = { type: string; label: string; href: string };

function loadRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushRecent(item: RecentItem) {
  const list = loadRecents().filter((r) => r.href !== item.href);
  list.unshift(item);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 5)));
}

interface NobleXCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NobleXCommandPalette({ open, onOpenChange }: NobleXCommandPaletteProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const recents = loadRecents();

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [propsRes, tenantsRes, unitsRes, leasesRes, invRes] = await Promise.allSettled([
        propertiesAPI.getAll({ search: term, limit: 5 }),
        tenantsAPI.getAll({ search: term, limit: 5 }),
        unitsAPI.getAll({ search: term, limit: 5 }),
        leasesAPI.getAll({ search: term, limit: 5 }),
        investmentsAPI.getPortfolio({ search: term, limit: 5 }),
      ]);
      const items: RecentItem[] = [];
      if (propsRes.status === "fulfilled") {
        const list = propsRes.value?.data?.data?.properties || propsRes.value?.data?.data || [];
        (Array.isArray(list) ? list : []).slice(0, 5).forEach((p: any) => {
          items.push({
            type: "property",
            label: p.name || p.propertyName || `Property #${p.id}`,
            href: "/properties",
          });
        });
      }
      if (tenantsRes.status === "fulfilled") {
        const list = tenantsRes.value?.data?.data?.tenants || tenantsRes.value?.data?.data || [];
        (Array.isArray(list) ? list : []).slice(0, 5).forEach((t: any) => {
          items.push({
            type: "tenant",
            label: t.name || t.tenantName || `Tenant #${t.id}`,
            href: "/tenants",
          });
        });
      }
      if (unitsRes.status === "fulfilled") {
        const list = unitsRes.value?.data?.data?.units || unitsRes.value?.data?.data || [];
        (Array.isArray(list) ? list : []).slice(0, 5).forEach((u: any) => {
          items.push({
            type: "unit",
            label: u.unitNumber || u.name || `Unit #${u.id}`,
            href: "/units",
          });
        });
      }
      if (leasesRes.status === "fulfilled") {
        const list = leasesRes.value?.data?.data?.leases || leasesRes.value?.data?.data || [];
        (Array.isArray(list) ? list : []).slice(0, 5).forEach((l: any) => {
          items.push({
            type: "lease",
            label: l.leaseNumber || l.reference || `Lease #${l.id}`,
            href: "/leases",
          });
        });
      }
      if (invRes.status === "fulfilled") {
        const list = invRes.value?.data?.data?.assets || [];
        (Array.isArray(list) ? list : []).slice(0, 5).forEach((a: any) => {
          items.push({
            type: "investment",
            label: `${a.investmentCode} — ${a.investmentName}`,
            href: `/investments/assets/${a.id}`,
          });
        });
      }
      setResults(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const select = (item: RecentItem) => {
    pushRecent(item);
    onOpenChange(false);
    navigate(item.href);
  };

  const iconFor = (type: string) => {
    switch (type) {
      case "property":
        return <Buildings size={16} weight="bold" />;
      case "tenant":
        return <Users size={16} weight="bold" />;
      case "unit":
        return <House size={16} weight="bold" />;
      case "lease":
        return <FileText size={16} weight="bold" />;
      case "investment":
        return <ChartLineUp size={16} weight="bold" />;
      default:
        return <MagnifyingGlass size={16} weight="bold" />;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t("commandPalette.placeholder")}
        value={query}
        onValueChange={setQuery}
        className="text-noblex-platinum"
      />
      <CommandList>
        <CommandEmpty>{loading ? t("commandPalette.searching") : t("common.noResults")}</CommandEmpty>
        {query.length < 2 && recents.length > 0 && (
          <CommandGroup heading={t("commandPalette.recent")}>
            {recents.map((item) => (
              <CommandItem key={item.href + item.label} onSelect={() => select(item)}>
                {iconFor(item.type)}
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.length > 0 && (
          <>
            {recents.length > 0 && query.length >= 2 && <CommandSeparator />}
            <CommandGroup heading={t("commandPalette.results")}>
              {results.map((item, i) => (
                <CommandItem key={`${item.type}-${i}`} onSelect={() => select(item)}>
                  {iconFor(item.type)}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading={t("commandPalette.quickActions")}>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/leases?action=new"); }}>
            <FileText size={16} weight="bold" />
            {t("commandPalette.newLease")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/properties"); }}>
            <Buildings size={16} weight="bold" />
            {t("commandPalette.portfolio")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/investments"); }}>
            <ChartLineUp size={16} weight="bold" />
            {t("commandPalette.investments")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/investments/portfolio"); }}>
            <ChartLineUp size={16} weight="bold" />
            {t("commandPalette.investmentPortfolio")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/investments/valuations"); }}>
            <ChartLineUp size={16} weight="bold" />
            {t("commandPalette.investmentValuations")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/investments/reports"); }}>
            <FileText size={16} weight="bold" />
            {t("commandPalette.investmentReports")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/investments/transactions"); }}>
            <FileText size={16} weight="bold" />
            {t("commandPalette.investmentTransactions")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/finance/prepaid-expenses"); }}>
            <FileText size={16} weight="bold" />
            {t("commandPalette.prepaidExpenses")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/finance/prepaid-expenses/dashboard"); }}>
            <FileText size={16} weight="bold" />
            {t("commandPalette.prepaidDashboard")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/finance/lease-revenue"); }}>
            <FileText size={16} weight="bold" />
            {t("commandPalette.leaseRevenue")}
          </CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); navigate("/finance/lease-revenue/dashboard"); }}>
            <FileText size={16} weight="bold" />
            {t("commandPalette.leaseRevenueDashboard")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
