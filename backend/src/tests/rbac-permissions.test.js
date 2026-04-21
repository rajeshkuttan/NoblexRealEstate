const { PERMISSION_DEFINITIONS, SYSTEM_ROLE_PERMISSIONS } = require("../config/permissions");

describe("RBAC permission catalog", () => {
  test("permission codes are unique", () => {
    const codes = PERMISSION_DEFINITIONS.map((item) => item.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  test("system role permissions only reference declared codes", () => {
    const declared = new Set(PERMISSION_DEFINITIONS.map((item) => item.code));
    Object.values(SYSTEM_ROLE_PERMISSIONS).forEach((rolePermissions) => {
      rolePermissions.forEach((permissionCode) => {
        expect(declared.has(permissionCode)).toBe(true);
      });
    });
  });

  test("admin role gets full permission set", () => {
    const declared = new Set(PERMISSION_DEFINITIONS.map((item) => item.code));
    const adminPermissions = new Set(SYSTEM_ROLE_PERMISSIONS.admin || []);
    expect(adminPermissions.size).toBe(declared.size);
  });
});

