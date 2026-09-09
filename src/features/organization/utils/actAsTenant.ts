/**
 * Multi-tenant header & tenant resolver adapter for master system
 */

export function actAsTenantHeaders(tenantId?: string | null): { headers?: Record<string, string> } {
  if (!tenantId) return {};
  return {
    headers: {
      'x-act-as-tenant': tenantId,
    },
  };
}

export function resolveActAsTenant(user?: any, _viewMode?: any): string | undefined {
  if (!user) return undefined;
  return user.tenantId || user.firm_id?.toString() || user.firmNameMatch || undefined;
}
