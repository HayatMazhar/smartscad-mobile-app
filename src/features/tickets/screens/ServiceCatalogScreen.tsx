import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetServiceGroupsQuery, useGetServiceCategoriesQuery, useGetCatalogServicesQuery } from '../services/ticketApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import QueryStates from '../../../shared/components/QueryStates';

const GROUP_ICONS: Record<string, string> = {
  IT: '💻', HR: '👥', FIN: '💰', GS: '🏢', PCT: '🛒', STG: '📊',
  CMN: '📢', STI: '🎓', LS: '⚖️', RS: '🔬', DSS: '📈', DS: '🗄️',
  HS: '🏥', IS: '🔒', AS: '📋', YC: '🧑‍🤝‍🧑', STA: '📉', MS: '⚙️',
};

type ViewLevel = 'groups' | 'categories' | 'services';

const ServiceCatalogScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();

  const [level, setLevel] = useState<ViewLevel>('groups');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [search, setSearch] = useState('');

  const {
    data: groupsData,
    isFetching: fGroups,
    isLoading: lGroups,
    refetch: rGroups,
    isError: eGroups,
    error: groupsLoadError,
  } = useGetServiceGroupsQuery();
  const { data: catsData, isFetching: fCats, isLoading: lCats, refetch: rCats } = useGetServiceCategoriesQuery(
    selectedGroup?.id, { skip: level === 'groups' },
  );
  const { data: svcsData, isFetching: fSvcs, isLoading: lSvcs, refetch: rSvcs } = useGetCatalogServicesQuery(
    { categoryId: selectedCategory?.id, groupId: selectedGroup?.id },
    { skip: level !== 'services' },
  );

  const groups = useMemo(() => asArray<any>(groupsData), [groupsData]);
  const categories = useMemo(() => asArray<any>(catsData), [catsData]);
  const services = useMemo(() => asArray<any>(svcsData), [svcsData]);

  const handleGroupTap = (group: any) => {
    setSelectedGroup(group);
    setSelectedCategory(null);
    setLevel('categories');
    setSearch('');
  };

  const handleCategoryTap = (cat: any) => {
    setSelectedCategory(cat);
    setLevel('services');
    setSearch('');
  };

  const handleServiceTap = (svc: any) => {
    navigation.navigate('SubmitTicket', { serviceId: svc.id, serviceName: svc.name });
  };

  const handleBack = () => {
    if (level === 'services') { setLevel('categories'); setSelectedCategory(null); }
    else if (level === 'categories') { setLevel('groups'); setSelectedGroup(null); }
  };

  const filterBySearch = (items: any[], keys: string[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => keys.some((k) => (item[k] ?? '').toLowerCase().includes(q)));
  };

  const isFetching = level === 'groups' ? fGroups : level === 'categories' ? fCats : fSvcs;
  const onRefresh = level === 'groups' ? rGroups : level === 'categories' ? rCats : rSvcs;

  const title = level === 'groups' ? 'Service Groups'
    : level === 'categories' ? (selectedGroup?.name ?? 'Categories')
    : (selectedCategory?.name ?? 'Services');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Breadcrumb / Back */}
      {level !== 'groups' && (
        <TouchableOpacity style={styles.backRow} onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          <Text style={[styles.backText, { color: colors.primary }]}>{level === 'services' ? selectedGroup?.name : 'All Groups'}</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, shadows.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={[styles.searchInput, { color: colors.text }]}
            placeholder={`Search ${level}...`} placeholderTextColor={colors.textMuted}
            value={search} onChangeText={setSearch} autoCorrect={false} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={[styles.clearBtn, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {level === 'groups' && (
        <QueryStates
          errorGateOnly
          loading={false}
          apiError={eGroups}
          error={groupsLoadError}
          onRetry={rGroups}
          isRefreshing={fGroups}
          style={{ flex: 1 }}
        >
        <FlatList data={filterBySearch(groups, ['name', 'nameAr', 'code'])}
          keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list}
          refreshControl={<ThemedRefreshControl isFetching={fGroups} isLoading={lGroups} onRefresh={rGroups} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.groupCard, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => handleGroupTap(item)} activeOpacity={0.7}>
              <Text style={styles.groupIcon}>{GROUP_ICONS[item.code] ?? '📁'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
                {item.nameAr ? <Text style={[styles.groupNameAr, { color: colors.textMuted }]}>{item.nameAr}</Text> : null}
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>▸</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !fGroups
              ? <EmptyState colors={colors} />
              : <ThemedActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          }
        />
        </QueryStates>
      )}

      {level === 'categories' && (
        <FlatList data={filterBySearch(categories, ['name', 'nameAr'])}
          keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list}
          refreshControl={<ThemedRefreshControl isFetching={fCats} isLoading={lCats} onRefresh={rCats} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.catCard, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => handleCategoryTap(item)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.catName, { color: colors.text }]}>{item.name}</Text>
                {item.nameAr ? <Text style={[styles.catNameAr, { color: colors.textMuted }]}>{item.nameAr}</Text> : null}
              </View>
              <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>{item.serviceCount ?? 0}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>▸</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!isFetching ? <EmptyState colors={colors} /> : <ThemedActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}
        />
      )}

      {level === 'services' && (
        <FlatList data={filterBySearch(services, ['name', 'nameAr', 'description'])}
          keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list}
          refreshControl={<ThemedRefreshControl isFetching={fSvcs} isLoading={lSvcs} onRefresh={rSvcs} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.svcCard, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => handleServiceTap(item)} activeOpacity={0.7}>
              <View style={[styles.svcDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.svcName, { color: colors.text }]}>{item.name}</Text>
                {item.nameAr && item.nameAr !== item.name ? (
                  <Text style={[styles.svcNameAr, { color: colors.textMuted }]}>{item.nameAr}</Text>
                ) : null}
              </View>
              <Text style={[styles.submitLabel, { color: colors.primary }]}>Submit →</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!isFetching ? <EmptyState colors={colors} /> : <ThemedActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}
        />
      )}
    </View>
  );
};

const EmptyState = ({ colors }: { colors: any }) => (
  <View style={styles.emptyWrap}>
    <Text style={styles.emptyIcon}>📂</Text>
    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No items found</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  backArrow: { fontSize: 18, fontWeight: '700' },
  backText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, height: 44 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  clearBtn: { fontSize: 14, paddingLeft: 8 },
  groupCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, gap: 12 },
  groupIcon: { fontSize: 28 },
  groupName: { fontSize: 15, fontWeight: '700' },
  groupNameAr: { fontSize: 12, marginTop: 2 },
  catCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10 },
  catName: { fontSize: 14, fontWeight: '600' },
  catNameAr: { fontSize: 12, marginTop: 2 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '800' },
  chevron: { fontSize: 16, fontWeight: '600' },
  svcCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10 },
  svcDot: { width: 8, height: 8, borderRadius: 4 },
  svcName: { fontSize: 14, fontWeight: '600' },
  svcNameAr: { fontSize: 12, marginTop: 2 },
  submitLabel: { fontSize: 12, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15 },
});

export default ServiceCatalogScreen;
