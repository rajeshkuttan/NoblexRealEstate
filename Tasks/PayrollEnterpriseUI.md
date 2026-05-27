# Payroll Enterprise UI — QA checklist

## Prerequisites

- Backend restarted after workspace route changes
- User with payroll permissions (or role including `payroll.*` codes)
- Demo company with seeded payroll data (`npm run seed:payroll-full-cycle`)

## Manual QA flow

1. **Command center** — `/people/payroll`
   - [ ] KPI row and action queue load (not fallback-only)
   - [ ] Month/year selector updates URL

2. **Employee list** — `/people/payroll/employees`
   - [ ] Filters: department, designation, workforce, sponsor, WPS, document risk
   - [ ] Columns: WPS chip, document risk, salary total, actions menu

3. **Employee 360** — `/people/payroll/employees/:id`
   - [ ] All tabs: Overview, Employment, Salary, Attendance & leave, Payroll history, Loans, Documents, WPS, Settlement, Ledger
   - [ ] Salary certificate action (if permitted)
   - [ ] Edit → `/employees/:id/edit`

4. **Attendance control** — `/people/payroll/attendance-control`
   - [ ] Exceptions, timesheets/overtime links, monthly summary, lock period
   - [ ] `/people/payroll/operations` redirects here

5. **Run workspace** — `/people/payroll/runs/:id`
   - [ ] Tabs: Employees (row click → drawer), Components, Exceptions, Variance, WPS
   - [ ] Calculate / Approve / Lock / Reverse

6. **WPS batch** — `/people/payroll/wps/batches/:id`
   - [ ] Validate, Review, Approve, Export SIF tabs

7. **Settlement** — `/people/payroll/final-settlements/:id`
   - [ ] Calculation breakdown with line types and snapshot

8. **Documents hub** — `/people/payroll/documents-hub`
   - [ ] Payslips table, batch generate/publish, distribution queue

9. **Reports** — `/people/payroll/reports`
   - [ ] Catalog shows tables (not raw JSON)
   - [ ] Cost allocation by department / cost center / LABOUR

10. **Leave** — `/people/payroll/leave-dashboard` + applications
    - [ ] Approve / reject / cancel on applications

11. **Shell consistency**
    - [ ] All payroll routes use `PayrollPageShell` or `PayrollLegacyPage` (no bare container header)

## API aggregates

| Endpoint | Permission |
|----------|------------|
| `GET /payroll/dashboard/command-center` | `payroll.attendance.view` |
| `GET /payroll/employees/:id/360` | `payroll.employee.view` |
| `GET /payroll/attendance/exceptions` | `payroll.attendance.view` |
| `GET /payroll/runs/:id/detail` | `payroll.processing.view` |
| `GET /payroll/runs/:id/employees/:employeeId/line` | `payroll.processing.view` |
| `GET /payroll/wps/batches/:id/detail` | `payroll.wps.view` |
| `GET /payroll/settlements/:id/detail` | `payroll.settlement.view` |
| `GET /payroll/reports/cost-allocation` | `payroll.processing.view` |
| `GET /payroll/audit` | `payroll.processing.view` |

## Automated tests

```bash
cd emirates-lease-flow/backend
npm test -- src/tests/payroll/workspace/payroll-workspace.test.js
```

## Notes

- Employee list enrichment: WPS readiness from primary bank; document risk from expiry dates.
- Cost reports use workforce group code (not legacy `workforceType` field).
