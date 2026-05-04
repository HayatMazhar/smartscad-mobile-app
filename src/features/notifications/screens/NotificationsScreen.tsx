import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '../services/notificationApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import {
  resolveNotificationRoute, iconForNotif, moduleLabel, NotificationLike,
} from '../utils/notifRouting';

const timeAgo = (dateStr?: string): string => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (!Number.isFinite(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const dateGroup = (dateStr?: string): string => {
  if (!dateStr) return 'Earlier';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (itemDate.getTime() === today.getTime()) return 'Today';
  if (itemDate.getTime() === yesterday.getTime()) return 'Yesterday';
  const diffDays = Math.floor((today.getTime() - itemDate.getTime()) / 86400000);
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
};

const isItemRead = (item: NotificationLike) => Boolean(item?.isRead ?? item?.isSeen);

const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const { data, isFetching, isLoading, isError, refetch } = useGetNotificationsQuery();
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead, { isLoading: markingAll }] = useMarkAllAsReadMutation();

  const notifications = asArray<NotificationLike>(data);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !isItemRead(n)).length,
    [notifications],
  );

  // Group by date bucket in the order: Today → Yesterday → This Week → Earlier
  const flatData = useMemo<(NotificationLike & { _type?: 'header'; id?: any })[]>(() => {
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    const buckets: Record<string, NotificationLike[]> = {};
    for (const n of notifications) {
      const key = dateGroup(n.createdAt ?? n.date);
      (buckets[key] ??= []).push(n);
    }
    const result: any[] = [];
    for (const key of order) {
      const rows = buckets[key];
      if (rows && rows.length) {
        result.push({ _type: 'header', title: key, id: `header-${key}` });
        for (const r of rows) result.push(r);
      }
    }
    return result;
  }, [notifications]);

  const handleTap = async (item: NotificationLike) => {
    // Optimistically mark as read (RTK Query will refetch via invalidation).
    if (!isItemRead(item)) {
      const key =
        typeof item.notificationKey === 'string' && item.notificationKey.length > 0
          ? item.notificationKey
          : item.id != null && String(item.id).length > 0
            ? String(item.id)
            : '';
      if (key) markAsRead(key).unwrap().catch(() => {});
    }
    const route = resolveNotificationRoute(item);
    if (!route) return;
    try {
      if (route.params) {
        navigation.navigate(route.stack as any, { screen: route.screen, params: route.params } as any);
      } else {
        navigation.navigate(route.stack as any, { screen: route.screen } as any);
      }
    } catch {
      // If we are inside a stack that doesn't know this sibling tab (edge case),
      // fall back to navigating within the current stack.
      try { navigation.navigate(route.screen as any, route.params as any); } catch {}
    }
  };

  const renderItem = (item: NotificationLike) => {
    const icon = iconForNotif(item);
    const read = isItemRead(item);
    const label = moduleLabel(item);

    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          shadows.card,
          {
            backgroundColor: colors.card,
            borderColor: read ? colors.borderLight ?? colors.border : colors.primary,
          },
        ]}
        onPress={() => handleTap(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconCircle, { backgroundColor: read ? (colors.cardTint ?? colors.background) : colors.primaryLight ?? `${colors.primary}22` }]}>
          <Text style={styles.iconEmoji}>{icon}</Text>
        </View>

        <View style={styles.notifContent}>
          <View style={styles.rowTopLine}>
            <Text
              style={[
                styles.notifTitle,
                { color: colors.text, fontWeight: read ? '600' : '800' },
              ]}
              numberOfLines={1}
            >
              {item.title ?? 'Notification'}
            </Text>
            {!read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>

          <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.body ?? item.message ?? ''}
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.modulePill, { backgroundColor: (colors.cardTint ?? colors.background), borderColor: colors.border }]}>
              <Text style={[styles.modulePillText, { color: colors.textSecondary }]}>{label}</Text>
            </View>
            <Text style={[styles.notifTime, { color: colors.textMuted }]}>
              {timeAgo(item.createdAt ?? item.date)}
            </Text>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {notifications.length > 0 && (
        <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary, flex: 1 }]}>
            {unreadCount > 0
              ? t('notifications.counts', {
                  defaultValue: '{{unread}} unread · {{total}} total',
                  unread: unreadCount,
                  total: notifications.length,
                })
              : t('notifications.totalOnly', {
                  defaultValue: '{{total}} total',
                  total: notifications.length,
                })}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={() => markAllAsRead()}
              activeOpacity={0.7}
              disabled={markingAll}
              style={[styles.markAllBtn, { borderColor: colors.primary, opacity: markingAll ? 0.5 : 1 }]}
            >
              <Text style={[styles.markAllText, { color: colors.primary }]}>
                ✓ {t('notifications.markAllRead', 'Mark all read')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isError && (
        <TouchableOpacity
          onPress={() => refetch()}
          activeOpacity={0.75}
          style={[styles.errorBanner, { backgroundColor: `${colors.danger}14` }]}
        >
          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>
            {t('common.loadError', 'Could not load data. Tap to retry.')}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={flatData}
        keyExtractor={(item, index) =>
          item._type === 'header'
            ? String(item.id)
            : String(
                (item as NotificationLike).notificationKey
                  ?? (item as NotificationLike).id
                  ?? `row-${index}`,
              )}
        renderItem={({ item }) => {
          if ((item as any)._type === 'header') {
            return renderSectionHeader((item as any).title);
          }
          return renderItem(item);
        }}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isError
                ? t('common.loadError', 'Could not load data')
                : t('notifications.empty', 'You\u2019re all caught up')}
            </Text>
            {!isError && (
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                New notifications will appear here as they arrive.
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 32, paddingTop: 4 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  screenSubtitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 8,
  },
  markAllText: { fontSize: 12, fontWeight: '800' },

  errorBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    padding: 12,
  },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    borderWidth: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconEmoji: { fontSize: 20 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },

  notifContent: { flex: 1 },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifTitle: { fontSize: 14, flex: 1 },
  notifBody: { fontSize: 13, lineHeight: 18, marginTop: 2, marginBottom: 8 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modulePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  modulePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  notifTime: { fontSize: 11, fontWeight: '600', flex: 1 },
  chevron: { fontSize: 20, fontWeight: '600', marginLeft: 4, opacity: 0.7 },

  emptyWrap: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 12, opacity: 0.85 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});

export default NotificationsScreen;
