# Roles & Permissions Migration Runbook

This runbook is for deploying RBAC schema and seed data across multiple databases/environments.

## Scope

Migration adds:
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

and seeds:
- system roles (`admin`, `manager`, `agent`, `finance_manager`, `finance_executive`, `operations_executive`, `maintenance_contractor`, `tenant`, `viewer`)
- permission catalog (`module:<module>:<action>`)
- default role-permission mappings
- backfill from legacy `users.role` into `user_roles`

## Pre-checks (for each database)

1. Confirm application version includes RBAC migration:
   - `backend/src/migrations/20260422000000-create-rbac-core-tables.js`
2. Confirm DB backup is completed.
3. Confirm maintenance window or low-traffic period.
4. Confirm DB user has DDL + DML privileges.

## Backup

Use your standard MySQL backup process before migration.

Example:

```bash
mysqldump -h <host> -u <user> -p <database_name> > backup_<database_name>_<yyyymmdd_hhmm>.sql
```

## Migration Commands

Run from `backend` folder:

```bash
npm run migrate
```

To verify migration status:

```bash
node src/scripts/runMigrations.js status
```

Rollback last migration (if needed):

```bash
node src/scripts/runMigrations.js down 1
```

## Validation SQL

Run after migration:

```sql
SELECT COUNT(*) AS roles_count FROM roles;
SELECT COUNT(*) AS permissions_count FROM permissions;
SELECT COUNT(*) AS role_permissions_count FROM role_permissions;
SELECT COUNT(*) AS user_roles_count FROM user_roles;
```

Check user-role backfill coverage:

```sql
SELECT u.role, COUNT(*) AS users_with_legacy_role
FROM users u
GROUP BY u.role
ORDER BY u.role;

SELECT r.key AS role_key, COUNT(ur.user_id) AS mapped_users
FROM roles r
LEFT JOIN user_roles ur ON ur.role_id = r.id
GROUP BY r.key
ORDER BY r.key;
```

## Post-migration Application Checks

1. Login as Admin.
2. Open `Settings -> Roles` and verify role + permission matrix loads.
3. Create a custom role and assign limited permissions.
4. Assign that role to a user.
5. Login as that user and verify:
   - only permitted modules/pages are visible
   - restricted pages show access denied
   - restricted API actions return `403`

## Multi-database Execution Checklist

Execute the same sequence for each DB in order:

1. Development databases
2. QA / UAT databases
3. Staging databases
4. Production databases (one-by-one or canary-first)

For each DB:

1. Backup
2. Run migration
3. Run validation SQL
4. Smoke test login + roles page
5. Record outcome in rollout tracker

## Rollback Plan

If migration fails before application cutover:

1. Run:
   ```bash
   node src/scripts/runMigrations.js down 1
   ```
2. Restore from backup if rollback is incomplete.
3. Re-deploy previous application version.

If migration succeeded but app behavior is incorrect:

1. Keep schema.
2. Temporarily route users to admin/system roles only.
3. Patch role-permission seed mappings.
4. Re-run seed sync script (if prepared) or execute SQL patch.

## Notes

- Legacy `users.role` remains in place for backward compatibility during transition.
- Final cleanup migration to remove legacy role column should be scheduled only after confirming all environments use RBAC tables and APIs.

