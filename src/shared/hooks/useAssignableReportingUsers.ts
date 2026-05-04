import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetTaskAssignmentOptionsQuery } from '../../features/tasks/services/taskApi';
import { useGetProjectTeamQuery } from '../../features/epm/services/epmApi';
import { useAppSelector } from '../../store/store';
import { asArray, asObject } from '../utils/apiNormalize';
import {
  loadReportingAssignableSnapshot,
  saveReportingAssignableSnapshot,
  type PersistedAssignablePerson,
} from '../storage/reportingUsersStorage';

export type AssignablePerson = PersistedAssignablePerson;

function mergeDedupe(entries: PersistedAssignablePerson[]): PersistedAssignablePerson[] {
  const m = new Map<string, PersistedAssignablePerson>();
  entries.forEach((e) => {
    if (!e?.userId) return;
    const k = String(e.userId).toLowerCase();
    if (!m.has(k)) m.set(k, { ...e, userId: e.userId });
  });
  return [...m.values()].sort((a, b) =>
    (a.displayName || a.userId).localeCompare(b.displayName || b.userId, undefined, { sensitivity: 'base' }),
  );
}

function unwrapTeamPayload(raw: unknown): any[] {
  const d = raw as Record<string, unknown> | unknown[] | null | undefined;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  const o = d as Record<string, unknown>;
  if (Array.isArray(o?.data)) return o.data as any[];
  if (Array.isArray((o?.data as any)?.data)) return (o.data as any).data;
  return asArray(raw);
}

function buildPeopleList(
  aoData: unknown,
  teamData: unknown,
  lang: string | undefined,
  stale: PersistedAssignablePerson[],
): PersistedAssignablePerson[] {
  const d = asObject<any>((aoData as any)?.data ?? aoData) ?? {};
  const reportees = asArray<any>(d.reportees);
  const onBehalfOf = asArray<any>(d.onBehalfOf);
  const fromAo: PersistedAssignablePerson[] = [];

  onBehalfOf.forEach((r) => {
    if (r?.userId) fromAo.push({ userId: String(r.userId), displayName: r.displayName || String(r.userId) });
  });
  reportees.forEach((r) => {
    if (r?.userId) {
      fromAo.push({
        userId: String(r.userId),
        displayName: r.displayName || String(r.userId),
        jobTitle: r.jobTitle ?? undefined,
        department: r.department ?? undefined,
      });
    }
  });

  const teamRows = unwrapTeamPayload(teamData);
  const isAr = !!lang?.startsWith('ar');
  const fromTeam: PersistedAssignablePerson[] = teamRows.map((row: any) => ({
    userId: String(row.userId ?? ''),
    displayName: isAr && row.userNameAr ? row.userNameAr : (row.userName || row.userId || ''),
    jobTitle: row.positionInProject || row.mainResponsibility || undefined,
  })).filter((x) => x.userId.length > 0);

  const merged = mergeDedupe([...fromAo, ...fromTeam]);
  if (merged.length > 0) return merged;
  return stale;
}

/**
 * Assigned-to list for EPM/tasks: `/tasks/assignment-options` plus optional
 * EPM team members — persisted per login (MMKV / localStorage).
 */
export function useAssignableReportingUsers(projectId?: number | null) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const selfId = useAppSelector((s) => s.auth.user?.userId) ?? '';

  const stale = useMemo(
    () => (selfId ? loadReportingAssignableSnapshot(selfId) : []),
    [selfId],
  );

  const aq = useGetTaskAssignmentOptionsQuery(lang, { skip: !selfId });
  const teamQ = useGetProjectTeamQuery(projectId ?? 0, { skip: !projectId || projectId <= 0 });

  const people = useMemo(
    () => buildPeopleList(aq.data, teamQ.data, lang, stale),
    [aq.data, teamQ.data, lang, stale],
  );

  useEffect(() => {
    if (!selfId || !aq.isSuccess) return;
    const d = asObject<any>((aq.data as any)?.data ?? aq.data) ?? {};
    const reportees = asArray<any>(d.reportees);
    const onBehalfOf = asArray<any>(d.onBehalfOf);
    if (reportees.length === 0 && onBehalfOf.length === 0) return;
    const merged = buildPeopleList(aq.data, teamQ.data, lang, stale);
    if (merged.length > 0) saveReportingAssignableSnapshot(selfId, merged);
  }, [selfId, aq.isSuccess, aq.data, teamQ.data, lang, stale]);

  const perms = useMemo(() => {
    const d = asObject<any>((aq.data as any)?.data ?? aq.data) ?? {};
    const p = asObject<{ canAssign?: boolean }>(d.permissions) ?? {};
    return { canAssign: !!p.canAssign };
  }, [aq.data]);

  return {
    people,
    ...perms,
    isLoading: aq.isLoading && stale.length === 0,
    isFetching: aq.isFetching,
    refetch: aq.refetch,
  };
}
