/** UAE emirate display labels (Property.location + company settings State column). */
export const UAE_EMIRATE_DISPLAY_OPTIONS = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
] as const;

export type UaeEmirateDisplay = (typeof UAE_EMIRATE_DISPLAY_OPTIONS)[number];

export type EmirateAuthorityRow = {
  state: string;
  attestationAuthority: string;
  electricity: string;
};

/** Default rows per product spec (editable in Company Settings). */
export const DEFAULT_EMIRATE_AUTHORITY_MAP: EmirateAuthorityRow[] = [
  { state: "Dubai", attestationAuthority: "Ejari", electricity: "DEWA" },
  { state: "Abu Dhabi", attestationAuthority: "Tawtheeq", electricity: "ADDC" },
  { state: "Sharjah", attestationAuthority: "SMTSystem", electricity: "SEWA" },
  { state: "Ajman", attestationAuthority: "Tasdeeq", electricity: "ASPCL" },
  { state: "Ras Al Khaimah", attestationAuthority: "RMTS", electricity: "REWA" },
  { state: "Fujairah", attestationAuthority: "FMTS", electricity: "EWE" },
  { state: "Umm Al Quwain", attestationAuthority: "UMTR", electricity: "EWE" },
];

const SLUG_TO_DISPLAY: Record<string, UaeEmirateDisplay> = {
  dubai: "Dubai",
  abu_dhabi: "Abu Dhabi",
  sharjah: "Sharjah",
  ajman: "Ajman",
  ras_al_khaimah: "Ras Al Khaimah",
  fujairah: "Fujairah",
  umm_al_quwain: "Umm Al Quwain",
};

const DISPLAY_TO_SLUG: Record<string, string> = Object.fromEntries(
  (Object.entries(SLUG_TO_DISPLAY) as [string, string][]).map(([slug, disp]) => [
    disp.toLowerCase(),
    slug,
  ]),
);

export function emirateSlugToDisplay(slug: string | null | undefined): string {
  if (!slug || typeof slug !== "string") return "";
  const key = slug.toLowerCase().trim().replace(/\s+/g, "_");
  return SLUG_TO_DISPLAY[key] || "";
}

/** Resolve location Select value when editing a property (prefer DB emirate slug). */
export function resolveLocationForPropertyForm(initialData: {
  emirate?: string | null;
  location?: string | null;
} | null | undefined): string {
  if (!initialData) return "";
  const fromSlug = emirateSlugToDisplay(initialData.emirate || undefined);
  if (fromSlug) return fromSlug;
  const loc = (initialData.location || "").trim();
  const match = UAE_EMIRATE_DISPLAY_OPTIONS.find((o) => o.toLowerCase() === loc.toLowerCase());
  if (match) return match;
  return "";
}

/** Map Property UI location (display) to backend Property.emirate enum slug. */
export function displayLocationToPropertyEmirateSlug(display: string | null | undefined): string {
  if (!display || typeof display !== "string") return "dubai";
  const k = display.trim().toLowerCase();
  return DISPLAY_TO_SLUG[k] || "dubai";
}

export function normalizeEmirateAuthorityMap(raw: unknown): EmirateAuthorityRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_EMIRATE_AUTHORITY_MAP];
  const rows: EmirateAuthorityRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const state = String(o.state ?? o.State ?? "").trim();
    const attestationAuthority = String(
      o.attestationAuthority ?? o.attestation_authority ?? o["Attestation Authority"] ?? "",
    ).trim();
    const electricity = String(o.electricity ?? o.Electricity ?? "").trim();
    if (state) rows.push({ state, attestationAuthority, electricity });
  }
  if (rows.length === 0) return [...DEFAULT_EMIRATE_AUTHORITY_MAP];
  return rows;
}

/** Always 7 canonical rows; overlay saved values by state (case-insensitive). */
export function mergeEmirateAuthorityMapFromSettings(raw: unknown): EmirateAuthorityRow[] {
  const parsed = normalizeEmirateAuthorityMap(raw);
  const byState = new Map(parsed.map((r) => [r.state.toLowerCase(), r]));
  return DEFAULT_EMIRATE_AUTHORITY_MAP.map((def) => {
    const hit = byState.get(def.state.toLowerCase());
    if (!hit) return { ...def };
    return {
      state: def.state,
      attestationAuthority: hit.attestationAuthority || def.attestationAuthority,
      electricity: hit.electricity || def.electricity,
    };
  });
}

/** Resolve display state from unit.property for compliance captions. */
export function resolvePropertyStateDisplay(property: {
  emirate?: string | null;
  location?: string | null;
} | null): string | null {
  if (!property) return null;
  const fromSlug = emirateSlugToDisplay(property.emirate || undefined);
  if (fromSlug) return fromSlug;
  const loc = (property.location || "").trim();
  if (!loc) return null;
  const lower = loc.toLowerCase();
  for (const opt of UAE_EMIRATE_DISPLAY_OPTIONS) {
    if (opt.toLowerCase() === lower) return opt;
  }
  for (const opt of UAE_EMIRATE_DISPLAY_OPTIONS) {
    if (lower.includes(opt.toLowerCase())) return opt;
  }
  return null;
}

export function getComplianceCaptionsFromMap(
  mapRows: EmirateAuthorityRow[] | null | undefined,
  stateDisplay: string | null,
  contractTerminology: string,
): { registrationTitle: string; electricityTitle: string } {
  const rows = mergeEmirateAuthorityMapFromSettings(mapRows);
  const state = stateDisplay?.trim();
  const row = state
    ? rows.find((r) => r.state.toLowerCase() === state.toLowerCase())
    : undefined;
  if (row && row.attestationAuthority) {
    return {
      registrationTitle: `${row.attestationAuthority} Registration Status`,
      electricityTitle: `${row.electricity || "DEWA"} Connection`,
    };
  }
  return {
    registrationTitle: `${contractTerminology || "Ejari"} Registration Status`,
    electricityTitle: "DEWA Connection",
  };
}
