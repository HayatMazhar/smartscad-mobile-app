import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../../store/store';
import {
  useGetPersonalDashboardQuery,
  useGetManagerTeamDashboardQuery,
} from '../services/dashboardApi';

export function useMyDashboardScreen() {
  const { t, i18n } = useTranslation();
  const displayName = useAppSelector((s) => s.auth.user?.displayName) ?? '';
  const persona = useAppSelector((s) => s.auth.user?.persona);
  const isManager = persona === 'MANAGER';

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const personalQ = useGetPersonalDashboardQuery({ year }, { skip: isManager });
  const teamQ = useGetManagerTeamDashboardQuery({ year }, { skip: !isManager });

  const onRefresh = useCallback(() => {
    if (!isManager) void personalQ.refetch();
    if (isManager) void teamQ.refetch();
  }, [personalQ.refetch, teamQ.refetch, isManager]);

  /** Year filter: this year and last year only (badges outside header). */
  const yearChoices = useMemo(() => [currentYear, currentYear - 1] as const, [currentYear]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t('myDashboard.greetingMorning', 'Good morning');
    if (h < 17) return t('myDashboard.greetingAfternoon', 'Good afternoon');
    return t('myDashboard.greetingEvening', 'Good evening');
  }, [t]);

  const trend = personalQ.data?.monthlyTrend ?? [];

  const linePoints = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const found = trend.find((p) => p.month === m);
      const hasData = found && (found.assigned > 0 || found.completed > 0);
      return { month: m, value: hasData ? found!.performance : null };
    });
  }, [trend]);

  const barGroups = useMemo(() => {
    const labels = i18n.language?.startsWith('ar')
      ? ['ي', 'ف', 'م', 'أ', 'م', 'ي', 'ي', 'أ', 'س', 'أ', 'ن', 'د']
      : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const f = trend.find((p) => p.month === m);
      return { label: labels[i], a: f?.assigned ?? 0, b: f?.completed ?? 0 };
    });
  }, [trend, i18n.language]);

  const teamTrend = teamQ.data?.monthlyTeamTrend ?? [];

  const teamLinePoints = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const found = teamTrend.find((p) => p.month === m);
      const hasData = found && (found.assigned > 0 || found.completed > 0);
      return { month: m, value: hasData ? found!.performance : 0 };
    });
  }, [teamTrend]);

  const teamBarGroups = useMemo(() => {
    const labels = i18n.language?.startsWith('ar')
      ? ['ي', 'ف', 'م', 'أ', 'م', 'ي', 'ي', 'أ', 'س', 'أ', 'ن', 'د']
      : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const f = teamTrend.find((p) => p.month === m);
      return { label: labels[i], a: f?.assigned ?? 0, b: f?.completed ?? 0 };
    });
  }, [teamTrend, i18n.language]);

  const firstName = useMemo(
    () => displayName.split(' ')[0] || t('myDashboard.greetingFallback', 'there'),
    [displayName, t],
  );

  const loading = isManager ? teamQ.isLoading : personalQ.isLoading;
  const error = isManager ? teamQ.error : personalQ.error;
  const fetching = isManager ? teamQ.isFetching : personalQ.isFetching;

  return {
    t,
    i18n,
    displayName,
    persona,
    isManager,
    year,
    setYear,
    yearChoices,
    greeting,
    firstName,
    linePoints,
    barGroups,
    teamLinePoints,
    teamBarGroups,
    teamData: teamQ.data,
    data: personalQ.data,
    isLoading: loading,
    isFetching: fetching,
    error,
    onRefresh,
  };
}
