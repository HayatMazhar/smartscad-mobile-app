import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface TabSpec<T> {
  key: string;
  label: string;
  count?: number;
  data: T[];
}

interface Props<T> {
  title: string;
  tabs: TabSpec<T>[];
  pageSize?: number;
  /** Render a single row */
  renderRow: (item: T, index: number) => React.ReactNode;
  /** Stable key per row */
  keyExtractor: (item: T, index: number) => string;
  /** Optional empty state */
  emptyText?: string;
}

export function TabbedListCard<T>({
  title,
  tabs,
  pageSize = 5,
  renderRow,
  keyExtractor,
  emptyText,
}: Props<T>) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();

  const visibleTabs = useMemo(() => tabs.filter((tb) => (tb.data?.length ?? 0) > 0), [tabs]);
  const [active, setActive] = useState<string>(visibleTabs[0]?.key ?? tabs[0]?.key);
  const [page, setPage] = useState(0);

  const activeTab = visibleTabs.find((tb) => tb.key === active) ?? visibleTabs[0] ?? tabs[0];
  const data = activeTab?.data ?? [];
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const slice = data.slice(start, start + pageSize);

  const handleTab = (key: string) => {
    if (key === active) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActive(key);
    setPage(0);
  };

  const handlePage = (next: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPage(Math.max(0, Math.min(totalPages - 1, next)));
  };

  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {/* Tabs - segmented control
       * Each tab is hard-locked to an equal slice via flexBasis:0 / flexGrow:1
       * and minWidth:0 so labels of different lengths don't tilt the split.
       * The active state is signalled with a same-size background swap and
       * a thin accent underline. We deliberately avoid putting shadows or
       * elevation on the active tab because Android renders elevation as a
       * halo that bleeds outside the tab's box and visually inflates it,
       * which is what produced the "right tab is bigger" feel reported
       * during QA.
       */}
      {visibleTabs.length > 1 && (
        <View style={[styles.tabRow, { backgroundColor: colors.greyCard }]}>
          {visibleTabs.map((tb) => {
            const isActive = tb.key === activeTab?.key;
            return (
              <TouchableOpacity
                key={tb.key}
                onPress={() => handleTab(tb.key)}
                activeOpacity={0.85}
                style={styles.tab}
              >
                <View
                  style={[
                    styles.tabInner,
                    {
                      backgroundColor: isActive ? colors.card : 'transparent',
                      borderColor: isActive ? colors.divider : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textMuted }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {tb.label}
                  </Text>
                  {typeof tb.count === 'number' && (
                    <View
                      style={[
                        styles.countPill,
                        { backgroundColor: isActive ? colors.primary : colors.divider },
                      ]}
                    >
                      <Text
                        style={[styles.countPillText, { color: isActive ? '#FFF' : colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {tb.count}
                      </Text>
                    </View>
                  )}
                </View>
                {/* Bottom accent rail - 2px stripe, only visible on the
                    active tab. Reserves space (height) on every tab via
                    a transparent fill on the inactive ones so the row
                    height never jumps on tab switch. */}
                <View
                  style={[
                    styles.tabAccent,
                    { backgroundColor: isActive ? colors.primary : 'transparent' },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Rows */}
      {slice.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          {emptyText ?? t('dashboard.empty', 'No records to show.')}
        </Text>
      ) : (
        slice.map((item, idx) => (
          <View key={keyExtractor(item, start + idx)}>
            {renderRow(item, start + idx)}
          </View>
        ))
      )}

      {/* Pagination */}
      {data.length > pageSize && (
        <View style={[styles.pager, { borderTopColor: colors.divider }]}>
          <TouchableOpacity
            disabled={safePage === 0}
            onPress={() => handlePage(safePage - 1)}
            style={[
              styles.pagerBtn,
              { backgroundColor: colors.greyCard, opacity: safePage === 0 ? 0.4 : 1 },
            ]}
          >
            <Text style={[styles.pagerArrow, { color: colors.text }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.pagerCenter}>
            <Text style={[styles.pagerText, { color: colors.text }]}>
              {t('dashboard.pager.label', '{{from}}–{{to}} of {{total}}', {
                from: start + 1,
                to: Math.min(start + pageSize, data.length),
                total: data.length,
              })}
            </Text>
            <Text style={[styles.pagerPage, { color: colors.textMuted }]}>
              {t('dashboard.pager.page', 'Page {{page}} / {{total}}', {
                page: safePage + 1,
                total: totalPages,
              })}
            </Text>
          </View>
          <TouchableOpacity
            disabled={safePage >= totalPages - 1}
            onPress={() => handlePage(safePage + 1)}
            style={[
              styles.pagerBtn,
              { backgroundColor: colors.greyCard, opacity: safePage >= totalPages - 1 ? 0.4 : 1 },
            ]}
          >
            <Text style={[styles.pagerArrow, { color: colors.text }]}>›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
  },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 12 },

  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    alignItems: 'stretch',
  },
  tab: {
    // flex: 1 alone is unreliable for equal widths when the children differ
    // in intrinsic size (label + count pill). Pinning flexBasis:0 + flexGrow:1
    // forces every tab to occupy exactly an equal slice of the row,
    // independent of its content width.
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 0,
    alignItems: 'stretch',
  },
  tabInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
  },
  tabAccent: {
    height: 2,
    borderRadius: 2,
    marginTop: 4,
    marginHorizontal: 14,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  countPill: {
    minWidth: 22,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 6,
    flexShrink: 0,
  },
  countPillText: { fontSize: 10, fontWeight: '800', lineHeight: 12 },

  empty: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pagerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerArrow: { fontSize: 22, fontWeight: '800', marginTop: -2 },
  pagerCenter: { flex: 1, alignItems: 'center' },
  pagerText: { fontSize: 13, fontWeight: '700' },
  pagerPage: { fontSize: 11, marginTop: 2 },
});

export default TabbedListCard;
