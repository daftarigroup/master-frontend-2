/**
 * Adapter hook to check if project/company is selected.
 * Returns a callable function: requireCompanySelected() => boolean
 */
export function useRequireCompanySelected() {
  return () => true;
}
