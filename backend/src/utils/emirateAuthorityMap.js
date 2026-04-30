'use strict';

const DEFAULT_EMIRATE_AUTHORITY_MAP = [
  { state: 'Dubai', attestationAuthority: 'Ejari', electricity: 'DEWA' },
  { state: 'Abu Dhabi', attestationAuthority: 'Tawtheeq', electricity: 'ADDC' },
  { state: 'Sharjah', attestationAuthority: 'SMTSystem', electricity: 'SEWA' },
  { state: 'Ajman', attestationAuthority: 'Tasdeeq', electricity: 'ASPCL' },
  { state: 'Ras Al Khaimah', attestationAuthority: 'RMTS', electricity: 'REWA' },
  { state: 'Fujairah', attestationAuthority: 'FMTS', electricity: 'EWE' },
  { state: 'Umm Al Quwain', attestationAuthority: 'UMTR', electricity: 'EWE' },
];

const SLUG_TO_DISPLAY = {
  dubai: 'Dubai',
  abu_dhabi: 'Abu Dhabi',
  sharjah: 'Sharjah',
  ajman: 'Ajman',
  ras_al_khaimah: 'Ras Al Khaimah',
  fujairah: 'Fujairah',
  umm_al_quwain: 'Umm Al Quwain',
};

const UAE_EMIRATE_DISPLAY_OPTIONS = DEFAULT_EMIRATE_AUTHORITY_MAP.map((r) => r.state);

function emirateSlugToDisplay(slug) {
  if (!slug || typeof slug !== 'string') return '';
  const key = slug.toLowerCase().trim().replace(/\s+/g, '_');
  return SLUG_TO_DISPLAY[key] || '';
}

function normalizeEmirateAuthorityMap(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_EMIRATE_AUTHORITY_MAP.map((r) => ({ ...r }));
  }
  const rows = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const state = String(item.state ?? item.State ?? '').trim();
    const attestationAuthority = String(
      item.attestationAuthority ?? item.attestation_authority ?? item['Attestation Authority'] ?? '',
    ).trim();
    const electricity = String(item.electricity ?? item.Electricity ?? '').trim();
    if (state) rows.push({ state, attestationAuthority, electricity });
  }
  if (rows.length === 0) return DEFAULT_EMIRATE_AUTHORITY_MAP.map((r) => ({ ...r }));
  return rows;
}

function mergeEmirateAuthorityMapFromSettings(raw) {
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

function resolvePropertyStateDisplay(property) {
  if (!property) return null;
  const fromSlug = emirateSlugToDisplay(property.emirate || '');
  if (fromSlug) return fromSlug;
  const loc = String(property.location || '').trim();
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

function getAuthorityLabelsForState(stateDisplay, mapRows, contractTerminology) {
  const rows = mergeEmirateAuthorityMapFromSettings(mapRows);
  const state = stateDisplay && String(stateDisplay).trim();
  const row = state
    ? rows.find((r) => r.state.toLowerCase() === state.toLowerCase())
    : undefined;
  if (row && row.attestationAuthority) {
    return {
      attestationAuthority: row.attestationAuthority,
      electricity: row.electricity || 'DEWA',
    };
  }
  return {
    attestationAuthority: contractTerminology || 'Ejari',
    electricity: 'DEWA',
  };
}

function getAuthorityLabelsForProperty(property, mapRows, contractTerminology) {
  const stateDisp = resolvePropertyStateDisplay(property);
  return getAuthorityLabelsForState(stateDisp, mapRows, contractTerminology);
}

module.exports = {
  mergeEmirateAuthorityMapFromSettings,
  resolvePropertyStateDisplay,
  getAuthorityLabelsForProperty,
  getAuthorityLabelsForState,
};
