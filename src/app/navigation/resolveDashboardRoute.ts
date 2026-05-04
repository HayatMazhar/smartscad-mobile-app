import type { UserProfile } from '../../features/auth/services/authSlice';

export type DashboardStackRouteName = 'MyDashboard' | 'ExecutiveDashboard';

/**
 * MANAGER with nobody in AD reporting to them (`directReportsCount === 0`): no team rollup and
 * we omit the Dashboard tab — task home is enough. (Persona SP sets `directReportsCount`.)
 */
export function shouldOmitDashboardTab(user: UserProfile | null): boolean {
  if (!user || user.persona !== 'MANAGER') return false;
  return (user.directReportsCount ?? 0) <= 0;
}

/**
 * Default screen inside the Dashboard tab stack.
 *
 * Executive dashboard (organisation-wide KPIs / finance) is for DG / ED / Director personas.
 * WORKER + MANAGER use the personal SPA dashboard (`GET /dashboard/personal`) rendered as MyDashboard — managers are not routed through the legacy executive dashboard SP gate.
 *
 * Fallback when persona is absent: honour `user.isExecutive` (cockpit cohort); otherwise personal.
 */
export function resolveDashboardRoute(user: UserProfile | null): DashboardStackRouteName {
  if (!user) return 'MyDashboard';
  const p = user.persona;
  if (p === 'WORKER' || p === 'MANAGER') return 'MyDashboard';
  if (p === 'DG' || p === 'ED' || p === 'DIRECTOR') return 'ExecutiveDashboard';
  if (user.isExecutive === true) return 'ExecutiveDashboard';
  return 'MyDashboard';
}
