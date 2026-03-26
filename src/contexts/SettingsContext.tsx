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
