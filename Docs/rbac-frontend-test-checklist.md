# RBAC Frontend Test Checklist

Use this checklist to validate route/nav visibility and action gating after RBAC rollout.

## Test Accounts

Prepare at least:
- Admin user
- Manager user
- Finance Executive user
- Custom role user with limited permissions

## Navigation Visibility

For each user:

1. Login and verify only permitted sidebar items appear.
2. Verify Finance submenu items appear only when corresponding permission exists.
3. Verify hidden menu items do not appear after full page reload.

## Route Guarding

For each disallowed module:

1. Manually enter URL in browser.
2. Verify Access Denied page is shown.
3. Verify allowed routes still load correctly.

## Settings Role Management

1. Open `Settings -> Roles`.
2. Create a role with selected permissions.
3. Edit role and update permission matrix.
4. Delete non-system role.
5. Verify system roles cannot be deleted.

## User Assignment

1. Open `Settings -> Users`.
2. Add user and assign role.
3. Edit user and change role.
4. Verify role persists after save and reload.

## Session Permission Refresh

1. Login as non-admin user.
2. Change that user role/permissions from admin account.
3. Refresh user session and verify UI reflects updated permissions.

## API Response Handling

1. Attempt forbidden action via UI.
2. Verify graceful error handling for `403`.
3. Verify UI does not crash and remains responsive.

