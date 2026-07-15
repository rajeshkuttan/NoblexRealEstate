import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonEn from "./locales/en/common.json";
import navEn from "./locales/en/nav.json";
import topbarEn from "./locales/en/topbar.json";
import authEn from "./locales/en/auth.json";
import commandPaletteEn from "./locales/en/commandPalette.json";
import dashboardEn from "./locales/en/dashboard.json";
import propertiesEn from "./locales/en/properties.json";
import unitsEn from "./locales/en/units.json";
import leasesEn from "./locales/en/leases.json";
import tenantsEn from "./locales/en/tenants.json";
import leadsEn from "./locales/en/leads.json";
import legalEn from "./locales/en/legal.json";
import procurementEn from "./locales/en/procurement.json";
import financeEn from "./locales/en/finance.json";
import investmentsEn from "./locales/en/investments.json";
import payrollEn from "./locales/en/payroll.json";
import platformEn from "./locales/en/platform.json";
import copilotEn from "./locales/en/copilot.json";
import prepaidEn from "./locales/en/prepaid.json";
import leaseRevenueEn from "./locales/en/leaseRevenue.json";

import commonAr from "./locales/ar/common.json";
import navAr from "./locales/ar/nav.json";
import topbarAr from "./locales/ar/topbar.json";
import authAr from "./locales/ar/auth.json";
import commandPaletteAr from "./locales/ar/commandPalette.json";
import dashboardAr from "./locales/ar/dashboard.json";
import propertiesAr from "./locales/ar/properties.json";
import unitsAr from "./locales/ar/units.json";
import leasesAr from "./locales/ar/leases.json";
import tenantsAr from "./locales/ar/tenants.json";
import leadsAr from "./locales/ar/leads.json";
import legalAr from "./locales/ar/legal.json";
import procurementAr from "./locales/ar/procurement.json";
import financeAr from "./locales/ar/finance.json";
import investmentsAr from "./locales/ar/investments.json";
import payrollAr from "./locales/ar/payroll.json";
import platformAr from "./locales/ar/platform.json";
import copilotAr from "./locales/ar/copilot.json";
import prepaidAr from "./locales/ar/prepaid.json";
import leaseRevenueAr from "./locales/ar/leaseRevenue.json";

const LANG_KEY = "noblex-lang";

export const I18N_NAMESPACES = [
  "common",
  "nav",
  "topbar",
  "auth",
  "commandPalette",
  "dashboard",
  "properties",
  "units",
  "leases",
  "tenants",
  "leads",
  "legal",
  "procurement",
  "finance",
  "investments",
  "payroll",
  "platform",
  "copilot",
  "prepaid",
  "leaseRevenue",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

function buildTranslation(
  common: Record<string, unknown>,
  nav: Record<string, unknown>,
  topbar: Record<string, unknown>,
  auth: Record<string, unknown>,
  commandPalette: Record<string, unknown>,
  dashboard: Record<string, unknown>,
  properties: Record<string, unknown>,
  units: Record<string, unknown>,
  leases: Record<string, unknown>,
  tenants: Record<string, unknown>,
  leads: Record<string, unknown>,
  legal: Record<string, unknown>,
  procurement: Record<string, unknown>,
  finance: Record<string, unknown>,
  investments: Record<string, unknown>,
  payroll: Record<string, unknown>,
  platform: Record<string, unknown>,
  copilot: Record<string, unknown>,
  prepaid: Record<string, unknown>,
  leaseRevenue: Record<string, unknown>,
) {
  return {
    common,
    nav,
    topbar,
    auth,
    commandPalette,
    dashboard,
    properties,
    units,
    leases,
    tenants,
    leads,
    legal,
    procurement,
    finance,
    investments,
    payroll,
    platform,
    copilot,
    prepaid,
    leaseRevenue,
  };
}

const enTranslation = buildTranslation(
  commonEn,
  navEn,
  topbarEn,
  authEn,
  commandPaletteEn,
  dashboardEn,
  propertiesEn,
  unitsEn,
  leasesEn,
  tenantsEn,
  leadsEn,
  legalEn,
  procurementEn,
  financeEn,
  investmentsEn,
  payrollEn,
  platformEn,
  copilotEn,
  prepaidEn,
  leaseRevenueEn,
);

const arTranslation = buildTranslation(
  commonAr,
  navAr,
  topbarAr,
  authAr,
  commandPaletteAr,
  dashboardAr,
  propertiesAr,
  unitsAr,
  leasesAr,
  tenantsAr,
  leadsAr,
  legalAr,
  procurementAr,
  financeAr,
  investmentsAr,
  payrollAr,
  platformAr,
  copilotAr,
  prepaidAr,
  leaseRevenueAr,
);

export function getStoredLanguage(): "en" | "ar" {
  const stored = localStorage.getItem(LANG_KEY);
  return stored === "ar" ? "ar" : "en";
}

export function setStoredLanguage(lang: "en" | "ar") {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export function isRtl(): boolean {
  return document.documentElement.dir === "rtl";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation, prepaid: prepaidEn, leaseRevenue: leaseRevenueEn },
    ar: { translation: arTranslation, prepaid: prepaidAr, leaseRevenue: leaseRevenueAr },
  },
  lng: getStoredLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  ns: ["translation", "prepaid", "leaseRevenue"],
  defaultNS: "translation",
});

setStoredLanguage(getStoredLanguage());

export default i18n;
