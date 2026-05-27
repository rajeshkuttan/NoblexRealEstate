# Payroll Full-Cycle Demo (Concord Real Estate)

End-to-end payroll demo seed and validation for company names containing **Concord Real Estate** (fuzzy match). Covers P1–P7: masters → attendance → payroll → WPS → settlement → finance → documents.

## Prerequisites

```bash
cd backend
npm run migrate
npm run sync:rbac
```

Database must contain a `company_settings` row whose `company_name` includes `Concord Real Estate` (e.g. Concord Real Estate LLC).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run seed:payroll-full-cycle` | Idempotent seed (June 2026, `DEMO-CRE-*` tagging) |
| `npm run validate:payroll-full-cycle` | Automated checks; exit 1 on FAIL |
| `npm run test:payroll-full-cycle` | Jest integration (skips if company/DB missing) |
| `node src/scripts/cleanup-payroll-demo-data.js --confirm` | Remove demo data for resolved company only |

### Override company

```bash
node src/scripts/seed-payroll-full-cycle.js --company-id=42
node src/scripts/validate-payroll-full-cycle.js --company-id=42
```

## Safety

- Blocked when `NODE_ENV=production` unless `ALLOW_PAYROLL_DEMO_SEED=true`
- Never hardcodes numeric company IDs
- Demo employees: `employee_no` prefix `DEMO-CRE-`
- Fixed payroll month: **June 2026**

## Manual UI checklist

After seed + validate:

1. `/people/payroll` — period June 2026, run LOCKED
2. WPS — batch EXPORTED, SIF/export record
3. Final settlement — `DEMO-CRE-SEP`, LOCKED
4. Finance — run + settlement POSTED
5. `/people/payroll/documents-hub` — payslips PUBLISHED, exports

## Troubleshooting

| Issue | Action |
|-------|--------|
| Company not found | Create/link Concord company or pass `--company-id` |
| Ambiguous company match | Pass `--company-id` |
| WPS batch approve fails | Ensure demo employees have valid IBAN + MOL ID + labour card |
| Finance post fails | Re-run seed phase 0 (chart + `payroll_account_configurations`) |
| Validation FAIL after logic change | See bug protocol in `Tasks/PayrollSeeding.md` |

## Bugfixes discovered during full-cycle seed (2026-05-27)

| Area | Fix |
|------|-----|
| `payrollFinancePosting.service` | Balance GL when payroll has non-loan deductions (penalty, unpaid leave); map unmapped earning codes to allowance expense |
| `documentTemplateService` | Use `taxNumber` / `vatNumber` instead of non-existent `trn` column on `company_settings` |
| Seed | `generateWpsBatch({ companyId, payrollRunId, userId })` object signature; labour timesheet per department; idempotent attendance/run |

## Bug protocol

If validation fails due to application logic (not seed data):

1. Document here + inline comment in `payroll-full-cycle.test.js`
2. Add a focused failing test under `src/tests/payroll/full-cycle/` or phase suite
3. Minimal production fix only
4. Re-run `npm run validate:payroll-full-cycle` and `npm test -- --testPathPattern=payroll`
