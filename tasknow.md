# Task plan (product QA + UIUX shells)

## Code status — QA items 1–7

| # | Item | Status |
|---|------|--------|
| 1 | Settings → General: company save / load | Done — `companySettingsAPI` + General tab |
| 2 | Logo upload | Done — `POST /company-settings/logo` (save company first if 404) |
| 3 | Branding | Done — `socialMedia.branding`, CSS vars, API + `localStorage` in `SettingsContext` |
| 4 | Tenants search focus | Done — full-page spinner only on `initialLoad` |
| 5 | Tenant modal lease deposit | Done — `leaseDepositDisplayAmount` |
| 6 | Tenant modal Payments tab | Done — `paymentsAPI.getAll({ tenantId })` + fallback |
| 7 | Invoice company block | Done — `InvoiceDetails` merges `getSettings()` |

**Manual QA:** Run app + API and spot-check the above (especially logo after first save, and any invoice view that does not use `InvoiceDetails`).

## UIUX page shell (`Docs/UIUX_UPGRADE_GUIDELINES.md`)

Applied `uiux-page-enter`, `uiux-page-header`, `uiux-page-title`, `uiux-page-subtitle` to **all main app routes** except:

- **Marketing** — intentional hero/landing layout (unchanged)
- **ForgotPassword / ResetPassword / NotFound** — auth or special layouts

**Pages updated in this execution:** Reports, Receivables, Profile, Treasury, Chart of Accounts, Ledger Setups, Journal Vouchers, Vendors, Procurement, Budget, Purchase Order, Purchase Invoice, Record Payment, Record Receipt; Dashboard gets `uiux-page-enter` only.

**Already aligned earlier:** Dashboard (header), Properties, Units, Leases, Tenants, Leads, Helpdesk, Legal, Finance, Settings.

## Next (optional)

- Full guideline audit: tokens, cards, tables, remaining hardcoded colors outside shells.
- Invoice print/PDF: ensure other surfaces use the same company merge as `InvoiceDetails`.
