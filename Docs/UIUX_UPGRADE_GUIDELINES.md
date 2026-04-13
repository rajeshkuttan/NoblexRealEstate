# 🏙️ WithU Real Estate — UI/UX Upgrade Guidelines
> **For Cursor AI**: Apply these design changes across all pages. Do NOT modify any business logic, API calls, data fetching, state management, or component props/interfaces. Only touch styling, layout, typography, color, spacing, and visual presentation.

---

## 🎯 Design Philosophy

**Direction**: Luxury PropTech — refined, confident, and data-forward.
**Tone**: Premium financial dashboard meets architectural precision. Think Bloomberg Terminal meets a five-star hotel concierge portal.
**North Star**: Every screen should feel like it belongs in a UAE real estate boardroom — authoritative, elegant, and instantly readable.

---

## 🎨 1. Design Tokens (CSS Variables)

Replace all current hardcoded colors with this token system. Add to your global CSS file (e.g., `globals.css` or `theme.css`):

```css
:root {
  /* === BRAND PALETTE === */
  --color-navy-950:   #0A0F1E;   /* deepest backgrounds */
  --color-navy-900:   #0D1526;   /* sidebar */
  --color-navy-800:   #112040;   /* card hover states */
  --color-navy-700:   #1A3260;   /* borders on dark */
  --color-navy-600:   #1E3A72;   /* active nav items */
  --color-navy-500:   #1B4F8A;   /* primary action (buttons) */
  --color-navy-400:   #2563B0;   /* links */
  --color-navy-300:   #4A8FD4;   /* icon accents */

  --color-gold-500:   #C9922B;   /* UAE-inspired accent */
  --color-gold-400:   #E2A83E;   /* hover gold */
  --color-gold-300:   #F0C76A;   /* subtle gold highlight */
  --color-gold-100:   #FDF4E3;   /* gold tint background */

  /* === SURFACE & BACKGROUND === */
  --color-bg-base:    #F4F6F9;   /* main page background */
  --color-bg-surface: #FFFFFF;   /* card/panel background */
  --color-bg-subtle:  #EEF1F6;   /* zebra rows, tags */
  --color-bg-overlay: rgba(10,15,30,0.04); /* hover overlays */

  /* === TEXT === */
  --color-text-primary:   #0D1526;  /* headings */
  --color-text-secondary: #4A5568;  /* labels, sublabels */
  --color-text-tertiary:  #8A95A3;  /* placeholders, hints */
  --color-text-inverse:   #FFFFFF;  /* text on dark backgrounds */
  --color-text-gold:      #C9922B;

  /* === STATUS COLORS === */
  --color-success:   #16A34A;
  --color-success-bg:#DCFCE7;
  --color-warning:   #D97706;
  --color-warning-bg:#FEF3C7;
  --color-danger:    #DC2626;
  --color-danger-bg: #FEE2E2;
  --color-info:      #2563B0;
  --color-info-bg:   #DBEAFE;

  /* === TYPOGRAPHY === */
  --font-display: 'Cormorant Garamond', Georgia, serif;  /* headings, hero numbers */
  --font-body:    'DM Sans', 'Helvetica Neue', sans-serif; /* UI text, labels */
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace; /* IDs, amounts */

  /* === SPACING SCALE === */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* === BORDER RADIUS === */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-pill: 999px;

  /* === ELEVATION / SHADOWS === */
  --shadow-sm:   0 1px 3px rgba(13,21,38,0.08), 0 1px 2px rgba(13,21,38,0.04);
  --shadow-md:   0 4px 12px rgba(13,21,38,0.10), 0 2px 4px rgba(13,21,38,0.06);
  --shadow-lg:   0 12px 32px rgba(13,21,38,0.12), 0 4px 8px rgba(13,21,38,0.06);
  --shadow-xl:   0 24px 48px rgba(13,21,38,0.14), 0 8px 16px rgba(13,21,38,0.08);
  --shadow-gold: 0 4px 20px rgba(201,146,43,0.25);

  /* === TRANSITIONS === */
  --transition-fast:   150ms cubic-bezier(0.4,0,0.2,1);
  --transition-normal: 250ms cubic-bezier(0.4,0,0.2,1);
  --transition-slow:   400ms cubic-bezier(0.4,0,0.2,1);

  /* === BORDERS === */
  --border-light:  1px solid rgba(13,21,38,0.08);
  --border-medium: 1px solid rgba(13,21,38,0.14);
  --border-gold:   1px solid rgba(201,146,43,0.30);
}
```

---

## 🔤 2. Typography System

Add to your `<head>` or font loader:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale

| Token | Font | Size | Weight | Use Case |
|---|---|---|---|---|
| `.text-hero` | Cormorant Garamond | 48px/1.0 | 700 | Stat numbers (AED 349,083) |
| `.text-h1` | Cormorant Garamond | 32px/1.1 | 600 | Page titles (Dashboard, Properties) |
| `.text-h2` | DM Sans | 20px/1.2 | 600 | Section headers, Card titles |
| `.text-h3` | DM Sans | 16px/1.3 | 600 | Sub-section, table headers |
| `.text-body` | DM Sans | 14px/1.6 | 400 | Body text, descriptions |
| `.text-label` | DM Sans | 12px/1.4 | 500 | Form labels, tags (UPPERCASE + letter-spacing: 0.06em) |
| `.text-caption` | DM Sans | 11px/1.4 | 400 | Timestamps, hints |
| `.text-mono` | JetBrains Mono | 14px/1.4 | 500 | IDs (LES-2026-0103), AED amounts |

**Rule**: All monetary amounts (AED values) use `--font-mono` for tabular alignment. Page title text uses `--font-display`.

---

## 🗂️ 3. Layout System

### Global Shell
```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (240px)  │  TOPBAR (64px)                  │
│  fixed, dark navy │─────────────────────────────────│
│                   │  CONTENT AREA                   │
│                   │  padding: 32px 40px             │
│                   │  max-width: 1440px              │
│                   │  background: var(--color-bg-base)│
└─────────────────────────────────────────────────────┘
```

### Content Regions
- **Page header**: title + subtitle + action buttons — `margin-bottom: 32px`
- **Stats row**: KPI cards in a grid — `gap: 20px`, `margin-bottom: 28px`
- **Main content**: cards, tables, lists — `gap: 24px`
- **Page max-width**: `1440px`, centered

---

## 🧭 4. Sidebar Redesign

**Current problem**: Flat nav list, no visual hierarchy, basic icons.

**Upgrade**:

```css
/* Sidebar container */
.sidebar {
  width: 240px;
  background: var(--color-navy-900);
  border-right: var(--border-gold);  /* subtle gold accent line */
  padding: 0;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Logo area */
.sidebar-logo {
  padding: 28px 24px 24px;
  border-bottom: 1px solid rgba(201,146,43,0.15);
  margin-bottom: 8px;
}

/* Nav section labels */
.sidebar-section-label {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  padding: 16px 24px 6px;
  margin-top: 8px;
}

/* Nav items */
.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  margin: 2px 12px;
  border-radius: var(--radius-md);
  color: rgba(255,255,255,0.62);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.sidebar-nav-item:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.90);
}

.sidebar-nav-item.active {
  background: linear-gradient(135deg, var(--color-navy-600), var(--color-navy-500));
  color: #FFFFFF;
  font-weight: 500;
  box-shadow: 0 2px 12px rgba(26,50,96,0.5);
}

.sidebar-nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--color-gold-400);
  border-radius: 0 2px 2px 0;
}

/* Sidebar icons: size 18px, strokeWidth 1.5 */
.sidebar-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.75;
}
.sidebar-nav-item.active .sidebar-icon { opacity: 1; }

/* Finance sub-items */
.sidebar-sub-item {
  padding: 8px 20px 8px 44px;
  font-size: 13px;
}
```

**Add sidebar section groupings** (labels, not just items):
```
OVERVIEW
  → Dashboard

PORTFOLIO
  → Properties
  → Units

CRM
  → Leads
  → Tenants

OPERATIONS
  → Leases
  → Legal

FINANCE
  → Payables
  → Receivables
  → Vendors & AP
  → Treasury
  → Chart of Accounts
  → Journal Voucher
  → Budget
  → Ledger Setup

MORE
  → Procurement
  → Helpdesk
```

---

## 📊 5. KPI Stat Cards

**Current problem**: Plain white boxes, colored icons look clip-art-y, no visual emphasis on the numbers.

**Upgrade**:

```css
.stat-card {
  background: var(--color-bg-surface);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  padding: 24px 24px 20px;
  position: relative;
  overflow: hidden;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  cursor: default;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Subtle gradient wash in top-right corner */
.stat-card::before {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--card-accent-color, rgba(37,99,176,0.06)) 0%, transparent 70%);
  pointer-events: none;
}

/* Label */
.stat-card-label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  margin-bottom: 10px;
}

/* Hero number */
.stat-card-value {
  font-family: var(--font-display);
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

/* AED amounts */
.stat-card-value.is-currency {
  font-family: var(--font-mono);
  font-size: 32px;
  letter-spacing: -0.02em;
}

/* Sub-label / trend */
.stat-card-sub {
  font-size: 12px;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
}
.stat-card-sub.positive { color: var(--color-success); }
.stat-card-sub.negative { color: var(--color-danger); }
.stat-card-sub.warning  { color: var(--color-warning); }

/* Icon in top right */
.stat-card-icon {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-accent-bg, var(--color-bg-subtle));
  color: var(--card-accent-color, var(--color-navy-500));
}

/* Bottom accent bar */
.stat-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--card-accent-color, var(--color-navy-400)), transparent);
  opacity: 0.4;
}
```

**Icon accent color per card type** (apply as inline CSS vars):
- Properties → `--card-accent-color: #1E3A72; --card-accent-bg: #DBEAFE`
- Active Leases → `--card-accent-color: #16A34A; --card-accent-bg: #DCFCE7`
- Revenue → `--card-accent-color: #C9922B; --card-accent-bg: #FEF3C7`
- Alerts/Overdue → `--card-accent-color: #DC2626; --card-accent-bg: #FEE2E2`
- Occupied → `--card-accent-color: #7C3AED; --card-accent-bg: #EDE9FE`

---

## 🧩 6. Content Cards

```css
.content-card {
  background: var(--color-bg-surface);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: box-shadow var(--transition-fast), transform var(--transition-fast);
}

.content-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.content-card-header {
  padding: 20px 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.content-card-title {
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.content-card-body {
  padding: 0 24px 24px;
}
```

---

## 🏢 7. Property Cards (Grid View)

**Current problem**: Property photos are fine but cards have no polish, cluttered bottom sections with raw data.

```css
.property-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: var(--border-light);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
  cursor: pointer;
}

.property-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-3px);
}

/* Image area */
.property-card-image-wrap {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.property-card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.property-card:hover .property-card-image-wrap img {
  transform: scale(1.04);
}

/* Status badge — top-left */
.property-badge-status {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  backdrop-filter: blur(8px);
  background: rgba(255,255,255,0.88);
  color: var(--color-navy-900);
  border: 1px solid rgba(255,255,255,0.6);
}

/* Type badge — top-right */
.property-badge-type {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
  background: rgba(10,15,30,0.60);
  color: rgba(255,255,255,0.90);
  backdrop-filter: blur(8px);
}

/* Card body */
.property-card-body {
  padding: 18px 20px 20px;
}

.property-card-name {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  line-height: 1.2;
}

.property-card-location {
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
}

/* Divider */
.property-card-divider {
  height: 1px;
  background: var(--color-bg-subtle);
  margin: 14px 0;
}

/* Stats row */
.property-card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.property-stat-item-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  margin-bottom: 3px;
}

.property-stat-item-value {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* Revenue bar */
.property-revenue-bar {
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.property-revenue-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
}

.property-revenue-value {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-gold-500);
}
```

---

## 🏠 8. Unit Cards (Grid View)

```css
/* Occupancy pill on image */
.unit-card-status-pill {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.unit-card-status-pill.occupied {
  background: var(--color-navy-900);
  color: var(--color-gold-300);
  border: 1px solid var(--color-gold-500);
}

.unit-card-status-pill.available {
  background: var(--color-success);
  color: #fff;
}

.unit-card-status-pill.disputed {
  background: var(--color-danger);
  color: #fff;
}

/* Photo count badge */
.unit-photo-count {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0,0,0,0.55);
  color: white;
  backdrop-filter: blur(4px);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
}
```

---

## 📋 9. Lease & Tenant Cards (List-style)

```css
.record-card {
  background: var(--color-bg-surface);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: start;
  transition: box-shadow var(--transition-fast);
}

.record-card:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(37,99,176,0.15);
}

/* Document icon area */
.record-card-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-info-bg);
  color: var(--color-info);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.active    { background: var(--color-success-bg); color: var(--color-success); }
.status-badge.draft     { background: var(--color-bg-subtle);  color: var(--color-text-secondary); }
.status-badge.terminated{ background: var(--color-danger-bg);  color: var(--color-danger); }
.status-badge.pending   { background: var(--color-warning-bg); color: var(--color-warning); }
.status-badge.registered{ background: var(--color-info-bg);    color: var(--color-info); }

/* Lease ID */
.lease-id {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

/* Ejari badge */
.ejari-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--color-info-bg);
  border: var(--border-gold);
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-gold-500);
}

/* Compliance row */
.compliance-row {
  margin-top: 14px;
  padding-top: 14px;
  border-top: var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.compliance-complete {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-success);
  font-weight: 600;
}
```

---

## 🔘 10. Buttons

```css
/* Primary button */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--color-navy-900);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.btn-primary:hover {
  background: var(--color-navy-700);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: none;
}

/* CTA / Gold accent button */
.btn-cta {
  background: linear-gradient(135deg, var(--color-gold-500), var(--color-gold-400));
  color: white;
  box-shadow: var(--shadow-gold);
}

.btn-cta:hover {
  box-shadow: 0 6px 24px rgba(201,146,43,0.40);
}

/* Secondary / Ghost button */
.btn-secondary {
  background: transparent;
  color: var(--color-text-primary);
  border: var(--border-medium);
  padding: 9px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary:hover {
  background: var(--color-bg-subtle);
  border-color: rgba(13,21,38,0.20);
}

/* Icon-only button */
.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: var(--border-light);
  background: var(--color-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
}

.btn-icon:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

/* Active toggle (grid/list view) */
.btn-icon.active {
  background: var(--color-navy-900);
  color: white;
  border-color: transparent;
}
```

---

## 🔍 11. Search & Filter Bar

```css
.search-bar-wrap {
  position: relative;
  flex: 1;
}

.search-bar-wrap .search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  width: 16px;
  height: 16px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 14px 0 40px;
  background: var(--color-bg-surface);
  border: var(--border-medium);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-input:focus {
  border-color: var(--color-navy-400);
  box-shadow: 0 0 0 3px rgba(37,99,176,0.10);
}

/* Filter/Sort controls row */
.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-select {
  height: 40px;
  padding: 0 32px 0 12px;
  background: var(--color-bg-surface);
  border: var(--border-medium);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A95A3' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: border-color var(--transition-fast);
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-navy-400);
  box-shadow: 0 0 0 3px rgba(37,99,176,0.10);
}
```

---

## 👤 12. Tenant Avatars

```css
/* Avatar circle with initials */
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  color: white;
}

/* Assign background colors deterministically from initials */
/* Use a small utility: hash initials → pick from palette */
.avatar-palette-1 { background: linear-gradient(135deg, #1E3A72, #2563B0); }
.avatar-palette-2 { background: linear-gradient(135deg, #16A34A, #15803D); }
.avatar-palette-3 { background: linear-gradient(135deg, #C9922B, #D97706); }
.avatar-palette-4 { background: linear-gradient(135deg, #7C3AED, #6D28D9); }
.avatar-palette-5 { background: linear-gradient(135deg, #DC2626, #B91C1C); }
.avatar-palette-6 { background: linear-gradient(135deg, #0891B2, #0E7490); }
```

---

## 📊 13. Page Headers

```css
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-6);
  border-bottom: var(--border-light);
}

.page-title {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}

.page-subtitle {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
```

---

## 🔝 14. Topbar

```css
.topbar {
  height: 64px;
  background: var(--color-bg-surface);
  border-bottom: var(--border-light);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 12px;
}

/* User profile button */
.topbar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: var(--border-light);
  transition: background var(--transition-fast);
}

.topbar-user:hover {
  background: var(--color-bg-subtle);
}

.topbar-user-name {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* Notification bell */
.topbar-notif {
  position: relative;
}

.topbar-notif-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: var(--color-danger);
  border-radius: 50%;
  border: 2px solid var(--color-bg-surface);
}
```

---

## 🔐 15. Login Page

```css
/* Full page */
.login-page {
  min-height: 100vh;
  background: var(--color-navy-950);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* Background texture */
.login-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,50,96,0.6) 0%, transparent 70%),
    radial-gradient(ellipse 40% 40% at 80% 80%, rgba(201,146,43,0.08) 0%, transparent 60%);
  pointer-events: none;
}

/* Card */
.login-card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: var(--radius-xl);
  padding: 48px 44px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 32px 64px rgba(0,0,0,0.40);
  position: relative;
}

/* Gold top accent on card */
.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 40px;
  right: 40px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-gold-400), transparent);
  border-radius: 0 0 2px 2px;
}

.login-title {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  color: white;
  text-align: center;
  margin-bottom: 6px;
}

.login-subtitle {
  font-family: var(--font-body);
  font-size: 14px;
  color: rgba(255,255,255,0.50);
  text-align: center;
  margin-bottom: 36px;
}

/* Form inputs on dark */
.login-input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  color: white;
  outline: none;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.login-input::placeholder { color: rgba(255,255,255,0.30); }

.login-input:focus {
  border-color: var(--color-gold-400);
  background: rgba(255,255,255,0.09);
  box-shadow: 0 0 0 3px rgba(201,146,43,0.15);
}

/* Submit button */
.login-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, var(--color-navy-600), var(--color-navy-500));
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: 0.02em;
  margin-top: 8px;
  box-shadow: 0 4px 16px rgba(26,50,96,0.4);
}

.login-btn:hover {
  background: linear-gradient(135deg, var(--color-navy-700), var(--color-navy-600));
  box-shadow: 0 6px 24px rgba(26,50,96,0.6);
  transform: translateY(-1px);
}
```

---

## 💳 16. Finance / Payment Records

```css
.payment-record {
  background: var(--color-bg-surface);
  border: var(--border-light);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: box-shadow var(--transition-fast);
}

.payment-record:hover {
  box-shadow: var(--shadow-md);
}

.payment-icon {
  width: 44px;
  height: 44px;
  background: var(--color-info-bg);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-info);
  flex-shrink: 0;
}

.payment-id {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.payment-tenant {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.payment-amount {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-left: auto;
}

.payment-date {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.paid-badge {
  padding: 4px 10px;
  background: var(--color-success-bg);
  color: var(--color-success);
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.posted-badge {
  padding: 3px 8px;
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
```

---

## ⚡ 17. Micro-interactions & Animations

Add these CSS animations globally:

```css
/* Page entry */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-enter {
  animation: fadeSlideUp 0.3s cubic-bezier(0.4,0,0.2,1) both;
}

/* Staggered card grid */
.card-grid > *:nth-child(1) { animation-delay: 0ms; }
.card-grid > *:nth-child(2) { animation-delay: 60ms; }
.card-grid > *:nth-child(3) { animation-delay: 120ms; }
.card-grid > *:nth-child(4) { animation-delay: 180ms; }
.card-grid > * { animation: fadeSlideUp 0.3s cubic-bezier(0.4,0,0.2,1) both; }

/* Number count-up: use a JS counter utility on .stat-card-value elements */
/* trigger on page load, count from 0 to target value over 800ms */

/* Skeleton loading */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--color-bg-subtle) 25%, #e8ecf2 50%, var(--color-bg-subtle) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
```

---

## 📐 18. Spacing Rules

Apply consistently:

| Context | Value |
|---|---|
| Main content padding | `40px` horizontal, `32px` vertical |
| Card internal padding | `24px` |
| Between stat cards | `20px` gap |
| Between section blocks | `28px` gap |
| Between cards in grid | `20px` gap |
| Label to value spacing | `6px` |
| Section title margin-bottom | `16px` |
| Form field gap | `20px` |

---

## 🧹 19. What to Remove / Clean Up

- ❌ Remove all `background-color: #X` hardcoded hex values — replace with tokens
- ❌ Remove all colored square icon containers (the current blue/green pill-shaped icon boxes in stat cards) — replace with the refined icon approach above
- ❌ Remove all `font-family: -apple-system, BlinkMacSystemFont, 'Inter'` references
- ❌ Remove box shadows like `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` — replace with shadow tokens
- ❌ Remove any `border-radius: 8px` or `border-radius: 4px` hardcoded — use radius tokens
- ❌ Remove bottom colored bars on current stat cards (the green/teal gradient line) — replace with the `::after` approach above

---

## ✅ 20. Quick Wins — Priority Order for Cursor

Implement in this order for maximum visual impact:

1. **CSS variables** — add the full token system to globals
2. **Font import** — swap to Cormorant Garamond + DM Sans
3. **Sidebar** — dark navy, section labels, gold left-border on active
4. **Stat cards** — new typography, remove garish icon boxes, subtle corner gradient
5. **Page headers** — display font, proper hierarchy
6. **Buttons** — unified btn-primary, btn-secondary, btn-cta system
7. **Status badges** — replace all text labels with styled `.status-badge`
8. **Property/Unit cards** — image hover zoom, polished body layout
9. **Search & filters** — consistent height, clean focus states
10. **Login page** — dark luxury treatment
11. **Micro-animations** — fadeSlideUp on page entry, card stagger
12. **AED amounts** — switch all to JetBrains Mono

---

> **Reminder for Cursor**: Zero business logic changes. Only modify CSS classes, styling props, className values, and presentational HTML structure (wrappers for layout). All data fetching, API calls, event handlers, state, and routing remain completely untouched.
