import React, { createContext, useContext, useState, useEffect } from 'react';
import { companySettingsAPI } from '@/services/api';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';
import type { EmirateAuthorityRow } from '@/lib/emirateAuthorityMap';
import { DEFAULT_EMIRATE_AUTHORITY_MAP, mergeEmirateAuthorityMapFromSettings } from '@/lib/emirateAuthorityMap';

interface SettingsContextType {
  contractTerminology: string;
  setContractTerminology: (value: string) => void;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  /** Display name from company settings (for header / shell). */
  companyName: string;
  /** Stored path e.g. /uploads/company/logo-xxx.png — use resolveImageUrl() when rendering <img>. */
  companyLogoPath: string | null;
  /** Per-emirate attestation + electricity labels (company settings). */
  emirateAuthorityMap: EmirateAuthorityRow[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { activeCompanyId, isCompanyLoading: isCompanyContextLoading } = useCompany();
  const [contractTerminology, setContractTerminology] = useState<string>('Ejari');
  const [loading, setLoading] = useState<boolean>(true);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLogoPath, setCompanyLogoPath] = useState<string | null>(null);
  const [emirateAuthorityMap, setEmirateAuthorityMap] = useState<EmirateAuthorityRow[]>(() =>
    DEFAULT_EMIRATE_AUTHORITY_MAP.map((r) => ({ ...r })),
  );

  const fetchSettings = async () => {
    if (!isAuthenticated || isCompanyContextLoading) return;
    
    try {
      const response = activeCompanyId
        ? await companySettingsAPI.getCurrent()
        : await companySettingsAPI.getSettings();
      const settings = response.data?.data;
      if (settings?.contractTerminology) { 
        setContractTerminology(settings.contractTerminology);
      }
      if (settings && typeof (settings as { companyName?: string }).companyName === 'string') {
        setCompanyName((settings as { companyName: string }).companyName || '');
      } else {
        setCompanyName('');
      }
      const logoRaw = settings && (settings as { logo?: string | null }).logo;
      setCompanyLogoPath(typeof logoRaw === 'string' && logoRaw.trim() ? logoRaw.trim() : null);
      const mapRaw =
        (settings as { emirateAuthorityMap?: unknown; emirate_authority_map?: unknown })
          ?.emirateAuthorityMap ??
        (settings as { emirate_authority_map?: unknown }).emirate_authority_map;
      setEmirateAuthorityMap(mergeEmirateAuthorityMapFromSettings(mapRaw));
      const sm = settings?.socialMedia;
      const branding =
        sm && typeof sm === 'object' && !Array.isArray(sm)
          ? (sm as { branding?: Record<string, string> }).branding
          : undefined;
      if (branding?.primaryColor) {
        document.documentElement.style.setProperty('--branding-primary', branding.primaryColor);
      }
      if (branding?.secondaryColor) {
        document.documentElement.style.setProperty('--branding-secondary', branding.secondaryColor);
      }
      if (branding?.accentColor) {
        document.documentElement.style.setProperty('--branding-accent', branding.accentColor);
      }
      if (branding && (branding.primaryColor || branding.secondaryColor || branding.accentColor)) {
        try {
          localStorage.setItem(
            'uiux-branding',
            JSON.stringify({
              theme: branding.theme,
              primaryColor: branding.primaryColor,
              secondaryColor: branding.secondaryColor,
              accentColor: branding.accentColor,
            })
          );
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
      setCompanyName('');
      setCompanyLogoPath(null);
      setEmirateAuthorityMap(mergeEmirateAuthorityMapFromSettings(null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isCompanyContextLoading) {
      fetchSettings();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, activeCompanyId, isCompanyContextLoading]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('uiux-branding');
      if (!raw) return;
      const b = JSON.parse(raw) as Record<string, string>;
      if (b.primaryColor) document.documentElement.style.setProperty('--branding-primary', b.primaryColor);
      if (b.secondaryColor) document.documentElement.style.setProperty('--branding-secondary', b.secondaryColor);
      if (b.accentColor) document.documentElement.style.setProperty('--branding-accent', b.accentColor);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SettingsContext.Provider 
      value={{ 
        contractTerminology, 
        setContractTerminology, 
        loading, 
        refreshSettings: fetchSettings,
        companyName,
        companyLogoPath,
        emirateAuthorityMap,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
