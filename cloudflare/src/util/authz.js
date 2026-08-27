import { error } from 'itty-router';
import { hasPermission } from '../../../scripts/auth/permissions.js';

/**
 * Backend authorization gate. Returns a 403 Response when denied, null when allowed.
 * Usage: const denied = assertPermission(request, PERMISSIONS.VIEW_AUDIT);
 *        if (denied) return denied;
 */
export function assertPermission(request, permission) {
  const ok = hasPermission(request.user, permission);
  if (!ok) {
    console.warn(
      JSON.stringify({
        evt: 'authz',
        decision: 'deny',
        permission,
        email: request.user?.email ?? null,
        path: new URL(request.url).pathname,
      }),
    );
  }
  return ok ? null : error(403, 'Forbidden');
}
