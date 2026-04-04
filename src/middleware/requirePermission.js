import { AppError } from "../lib/AppError.js";
import { hasPermission } from "../utils/rbac.js";

export function requirePermission(permission) {
  return function permissionMiddleware(req, _res, next) {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      return next(new AppError(403, "You do not have permission for this action."));
    }

    next();
  };
}
