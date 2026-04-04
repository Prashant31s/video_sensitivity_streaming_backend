export const roles = ["viewer", "editor", "admin"];

const permissionMap = {
  "videos:read": roles,
  "videos:create": ["editor", "admin"],
  "videos:update": ["editor", "admin"],
  "users:manage": ["admin"]
};

export function hasPermission(role, permission) {
  return permissionMap[permission]?.includes(role) ?? false;
}
