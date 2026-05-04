import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useAppSelector } from '../../../store/store';
import { setCredentials, type UserProfile } from '../services/authSlice';
import { useLazyGetMyPersonaQuery } from '../services/authApi';

/**
 * Floating debug pill that shows the persona the API derived for the
 * current user. Tap to refetch /auth/me/persona and merge the result
 * back into Redux so the layout switches without a re-login.
 *
 * Visible in __DEV__ builds only — no-op in release.
 *
 * Why this exists: the executive cockpit only renders when
 * `auth.user.isExecutive === true`. If a DG / ED user logs in but the
 * impersonate / windows-auth path forgot to enrich persona, the user
 * sees the worker home and has no way to tell *why*. This badge makes
 * that state observable and self-healing in one tap.
 */
export const PersonaDebugBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const [fetchPersona, { data, isFetching, error }] = useLazyGetMyPersonaQuery();

  const persona = data?.persona ?? user?.persona ?? '?';
  const isExecutive = data?.isExecutive ?? user?.isExecutive ?? false;
  const directs = data?.directReportsCount ?? user?.directReportsCount ?? 0;

  // Auto-refresh on mount when persona is missing — covers users who
  // logged in before the impersonate-enrichment fix shipped.
  useEffect(() => {
    if (!__DEV__) return;
    if (!user?.persona) {
      void fetchPersona();
    }
  }, [user?.persona, fetchPersona]);

  const onPress = useCallback(async () => {
    try {
      const fresh = await fetchPersona().unwrap();
      if (user && accessToken && refreshToken) {
        const merged: UserProfile = {
          ...user,
          persona: fresh.persona,
          isExecutive: fresh.isExecutive,
          isManager: fresh.isManager,
          hasDelegates: fresh.hasDelegates,
          directReportsCount: fresh.directReportsCount,
        };
        dispatch(setCredentials({ accessToken, refreshToken, user: merged }));
      }
    } catch {
      // swallowed — error is shown in the badge
    }
  }, [fetchPersona, user, accessToken, refreshToken, dispatch]);

  if (!__DEV__) return null;

  const tone = isExecutive ? '#16a34a' : persona === 'MANAGER' ? '#0ea5e9' : '#ef4444';
  const bg = isExecutive ? 'rgba(22,163,74,0.10)' : persona === 'MANAGER' ? 'rgba(14,165,233,0.10)' : 'rgba(239,68,68,0.10)';
  const label = isFetching ? 'fetching...' : error ? 'persona err' : `${persona}${isExecutive ? ' EXEC' : ''}${directs ? ` ${directs} reports` : ''}`;

  if (compact) {
    return (
      <Pressable onPress={onPress} style={[styles.compactPill, { backgroundColor: bg, borderColor: tone }]}>
        <View style={[styles.dot, { backgroundColor: tone }]} />
        <Text style={[styles.compactText, { color: tone }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.banner, { backgroundColor: bg, borderColor: tone }]}>
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: tone }]}>DEV - Persona: {label}</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
          {user?.userId ?? 'no user'} — tap to refetch
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
  },
  sub: {
    fontSize: 11,
    marginTop: 1,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default PersonaDebugBadge;
