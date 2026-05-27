const STORAGE_KEY = "active_company_id";

export function getActiveCompanyId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function setActiveCompanyId(companyId: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(companyId));
}

export function clearActiveCompanyId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
