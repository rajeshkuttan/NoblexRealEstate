import { ReactNode } from "react";

interface ArabicSupportProps {
  children: ReactNode;
  /** @deprecated Use global EN/AR toggle in AppLayout top bar */
  currentLanguage?: string;
  /** @deprecated Use global EN/AR toggle in AppLayout top bar */
  onLanguageChange?: (language: string) => void;
}

/** Passthrough wrapper — language is controlled globally via react-i18next in AppLayout. */
export default function ArabicSupport({ children }: ArabicSupportProps) {
  return <>{children}</>;
}

/** @deprecated Use useTranslation from react-i18next instead */
export const useTranslation = (_currentLanguage: string) => {
  return (key: string) => key;
};

/** @deprecated Use locale files in src/i18n/locales instead */
export const getTranslation = (_currentLanguage: string, key: string) => key;
