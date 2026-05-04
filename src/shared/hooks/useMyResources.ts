import { useMemo } from 'react';
import { useGetTaskAssignmentOptionsQuery } from '../../features/tasks/services/taskApi';
import { useAppSelector } from '../../store/store';
import { asArray, asObject } from '../utils/apiNormalize';

/**
 * Shape of a row returned by [Mobile].[spMobile_Tasks_GetAssignmentOptions]
 * (result set 3 – reportees / explicit bypass / delegate owners).
 */
export type MyResource = {
  userId: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  managerId?: string | null;
};

export type OnBehalfOwner = {
  userId: string;
  displayName: string;
  isSelf?: boolean;
};

export type ResourcePermissions = {
  /** true if this user can target someone other than themselves */
  canAssign: boolean;
  /** user has at least one person reporting to them */
  isManager: boolean;
  /** user is in ByPassAssignmentTeam.FromUserID */
  isBypass: boolean;
  /** user has an active DelegateProfile with CanAssignTaskOnBehalf=1 */
  isDelegate: boolean;
};

export type UseMyResourcesResult = {
  /** Raw permission flags mirrored 1-to-1 from the UAT web portal gate */
  permissions: ResourcePermissions;
  /** Reportees (direct + hierarchy + bypass + delegated owners), excludes self */
  reportees: MyResource[];
  /** Owners the caller can act "on behalf of" – always includes self when allowed */
  onBehalfOf: OnBehalfOwner[];
  /** Current user's own login id */
  selfId: string;
  /** Current user's display name (falls back to login id) */
  selfName: string;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
};

const EMPTY_PERMS: ResourcePermissions = {
  canAssign: false,
  isManager: false,
  isBypass: false,
  isDelegate: false,
};

/**
 * `useMyResources` — single source of truth for "who can I assign work to".
 *
 * Backed by `/api/v1/tasks/assignment-options`, which in turn executes
 * `[Mobile].[spMobile_Tasks_GetAssignmentOptions]` and mirrors the UAT web
 * portal rule stack (UserInfo.ValidTaskAssignor OR
 * DelegateProfile.CanAssignTaskOnBehalf).  Safe to call from any screen — the
 * RTK Query layer caches and dedupes.
 */
export function useMyResources(lang?: string): UseMyResourcesResult {
  const user = useAppSelector((s) => s.auth.user);
  const selfId   = user?.userId || '';
  const selfName = (user as any)?.displayName || (user as any)?.name || selfId;

  const { data, isLoading, isFetching, refetch } = useGetTaskAssignmentOptionsQuery(lang);

  return useMemo(() => {
    const d = asObject<any>(data) ?? {};
    const perms = asObject<ResourcePermissions>(d.permissions) ?? EMPTY_PERMS;
    const onBehalfOfRaw = asArray<any>(d.onBehalfOf);
    const reporteesRaw  = asArray<any>(d.reportees);

    return {
      permissions: {
        canAssign: !!perms.canAssign,
        isManager: !!perms.isManager,
        isBypass:  !!perms.isBypass,
        isDelegate: !!perms.isDelegate,
      },
      reportees: reporteesRaw
        .filter((r) => r && r.userId && r.userId !== selfId)
        .map<MyResource>((r) => ({
          userId: String(r.userId),
          displayName: r.displayName || r.userId,
          jobTitle: r.jobTitle ?? undefined,
          department: r.department ?? undefined,
          managerId: r.managerId ?? null,
        })),
      onBehalfOf: onBehalfOfRaw
        .filter((r) => r && r.userId)
        .map<OnBehalfOwner>((r) => ({
          userId: String(r.userId),
          displayName: r.displayName || r.userId,
          isSelf: Boolean(r.isSelf),
        })),
      selfId,
      selfName,
      isLoading,
      isFetching,
      refetch,
    };
  }, [data, selfId, selfName, isLoading, isFetching, refetch]);
}
