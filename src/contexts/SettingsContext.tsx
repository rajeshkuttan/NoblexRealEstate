import React, { createContext, useContext, useState, useEffect } from 'react';
import { companySettingsAPI } from '@/services/api';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  contractTerminology: string;
  setContractTerminology: (value: string) => void;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [contractTerminology, setContractTerminology] = useState<string>('Ejari');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await companySettingsAPI.getSettings();
      const settings = response.data?.data;
      if (settings?.contractTerminology) { 
        setContractTerminology(settings.contractTerminology);
      }
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

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
        refreshSettings: fetchSettings 
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
