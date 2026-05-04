import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/store';
import { useGetMyRightsQuery } from '../../features/auth/services/authApi';
import { setRights } from '../../features/auth/services/authSlice';
import type { AssetId, RoleId, RightsMap } from './enums';

/**
 * Loads the user's rights on login and keeps them in Redux.
 * Call once from the root of the authenticated app (e.g. MainTabNavigator).
 * Auto-refreshes every 30 minutes.
 */
export function useLoadRights() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data, isSuccess } = useGetMyRightsQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30 * 60 * 1000, // 30 min refresh
  });

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(setRights({ assets: data.assets ?? {}, loadedAt: data.loadedAt }));
    }
  }, [isSuccess, data, dispatch]);
}

/**
 * Returns true if the user has ANY of the given roles on the specified asset.
 * Mirrors the legacy `Helper.IsGroupMember(assetId, ...roles)` pattern.
 *
 * @example
 *   const canCreateKPI = useHasRole(Asset.PMS, PMSRole.Admin, PMSRole.StrategyTeam);
 *
 * @param asset  the asset ID from `Asset` enum
 * @param roles  one or more role IDs; if omitted, checks for ANY role on the asset
 */
export function useHasRole(asset: AssetId | number, ...roles: RoleId[]): boolean {
  const userRoles = useAppSelector((s) => s.auth.rights?.assets?.[asset] ?? []);
  if (roles.length === 0) return userRoles.length > 0;
  return roles.some((r) => userRoles.includes(r));
}

/**
 * Check multiple asset/role pairs with OR logic.
 * Useful when a button should appear for several combinations.
 *
 * @example
 *   const canApprove = useHasAnyRole([
 *     [Asset.HR, HRRole.LeaveApprover],
 *     [Asset.HR, HRRole.Admin],
 *   ]);
 */
export function useHasAnyRole(pairs: Array<[AssetId | number, RoleId]>): boolean {
  const rights = useAppSelector((s) => s.auth.rights?.assets ?? {});
  return pairs.some(([a, r]) => (rights[a] ?? []).includes(r));
}

/**
 * Returns the raw list of roles for a given asset.
 * Useful when you need the full set rather than a yes/no.
 */
export function useRolesFor(asset: AssetId | number): number[] {
  return useAppSelector((s) => s.auth.rights?.assets?.[asset] ?? []);
}

/**
 * True when rights have finished loading (even if the user has no roles).
 */
export function useRightsLoaded(): boolean {
  return useAppSelector((s) => s.auth.rights !== null);
}

/**
 * Returns the full rights map for debugging / admin screens.
 */
export function useAllRights(): RightsMap | null {
  return useAppSelector((s) => s.auth.rights);
}
