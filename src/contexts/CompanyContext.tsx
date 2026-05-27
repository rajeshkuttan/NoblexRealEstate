import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { companySettingsAPI } from "@/services/api";
import { cacheService } from "@/services/cache";
import { useAuth } from "@/contexts/AuthContext";
import {
  getActiveCompanyId,
  setActiveCompanyId as persistActiveCompanyId,
  clearActiveCompanyId,
} from "@/lib/activeCompanyStorage";

export interface UserCompany {
  id: number;
  company_name: string;
  company_name_arabic?: string | null;
  logo?: string | null;
  is_default: boolean;
  is_active: boolean;
  currency?: string;
  timezone?: string;
  vat_number?: string | null;
  role_in_company?: string | null;
}

interface CompanyContextType {
  companies: UserCompany[];
  activeCompany: UserCompany | null;
  activeCompanyId: number | null;
  isCompanyLoading: boolean;
  isSwitching: boolean;
  switchCompany: (companyId: number) => Promise<boolean>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<number | null>(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  const pickInitialCompany = useCallback((list: UserCompany[]) => {
    if (!list.length) return null;
    const stored = getActiveCompanyId();
    if (stored && list.some((c) => c.id === stored)) return stored;
    const def = list.find((c) => c.is_default);
    if (def) return def.id;
    return list[0].id;
  }, []);

  const resolveActiveId = useCallback(
    (list: UserCompany[], stateId: number | null) => {
      for (const id of [stateId, getActiveCompanyId()]) {
        if (id && list.some((c) => c.id === id)) return id;
      }
      return pickInitialCompany(list);
    },
    [pickInitialCompany],
  );

  const refreshCompanies = useCallback(async () => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setCompanies([]);
      setActiveCompanyIdState(null);
      clearActiveCompanyId();
      cacheService.clear();
      setIsCompanyLoading(false);
      return;
    }

    setIsCompanyLoading(true);
    try {
      const res = await companySettingsAPI.getMyCompanies();
      const list: UserCompany[] = res.data?.data ?? [];
      setCompanies(list);
      setActiveCompanyIdState((prev) => {
        const nextId = resolveActiveId(list, prev);
        if (nextId) {
          if (getActiveCompanyId() !== nextId) persistActiveCompanyId(nextId);
          return nextId;
        }
        clearActiveCompanyId();
        return null;
      });
    } catch (e) {
      console.error("Failed to load companies:", e);
      setCompanies([]);
      setActiveCompanyIdState(null);
    } finally {
      setIsCompanyLoading(false);
    }
  }, [authLoading, isAuthenticated, resolveActiveId]);

  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  const switchCompany = useCallback(
    async (companyId: number): Promise<boolean> => {
      if (!companies.some((c) => c.id === companyId)) return false;
      setIsSwitching(true);
      try {
        await companySettingsAPI.switchCompany(companyId);
        persistActiveCompanyId(companyId);
        setActiveCompanyIdState(companyId);
        cacheService.clear();
        queryClient.invalidateQueries();
        return true;
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to switch company";
        toast.error(msg);
        return false;
      } finally {
        setIsSwitching(false);
      }
    },
    [companies, queryClient],
  );

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompany,
        activeCompanyId,
        isCompanyLoading,
        isSwitching,
        switchCompany,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
