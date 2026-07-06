import { useTranslation } from "react-i18next";

/** App-wide translation hook — keys use dot notation: t('nav.dashboard'), t('properties.title') */
export function useAppTranslation() {
  return useTranslation();
}

export function useNsTranslation(ns: string) {
  return useTranslation("translation", { keyPrefix: ns });
}
