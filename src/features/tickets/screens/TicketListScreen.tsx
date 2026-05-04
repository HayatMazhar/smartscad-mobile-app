import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useGetMyTicketsQuery } from '../services/ticketApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import TicketListSkeleton from '../../../shared/components/skeleton/TicketListSkeleton';

// Matches web TicketSearchParametersView enum
const VIEW_TABS = [
  { key: 2, label: 'My Requests',       icon: '📤' },
  { key: 3, label: 'Assigned To Me',    icon: '📥' },
  { key: 1, label: 'Took Action',       icon: '✅' },
  { key: 4, label: 'Awaiting Approval', icon: '⏳' },
];

// Matches web TicketSearchParametersFilter enum (the "Request Type" dropdown)
const REQUEST_TYPE_OPTIONS = [
  { id: 1, label: 'All Requests' },
  { id: 2, label: 'My Requests' },
  { id: 3, label: 'Assigned To Me' },
  { id: 4, label: 'Took An Action' },
];

// Matches web TicketSearchParametersStatus enum
const STATUS_CHIPS = [
  { id: '2', label: 'Not Closed' },
  { id: '1', label: 'All' },
  { id: '3', label: 'Closed' },
  { id: '4', label: 'Awaiting IT Desk' },
  { id: '5', label: 'Awaiting Feedback' },
  { id: '6', label: 'Awaiting Resolution' },
  { id: '7', label: 'Awaiting Approval' },
  { id: '8', label: 'Delayed' },
];

const fmtDateISO = (d: Date) => d.toISOString().slice(0, 10);

const TicketListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, shadows } = useTheme();

  const [viewId, setViewId] = useState(2);

  // Request Type (FilterID) — independent of view, defaults to match view
  const [requestType, setRequestType] = useState<number | null>(null);   // null = use viewId

  // Status can be multi-select (matches web CSV)
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(['2']));

  // Date range
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Search
  const [keywords, setKeywords] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(false);

  const statusIds = useMemo(
    () => Array.from(selectedStatuses).join(',') || '2',
    [selectedStatuses],
  );

  const { data, isFetching, isLoading, isError, refetch } = useGetMyTicketsQuery({
    viewId,
    statusIds,
    filterIds: requestType != null ? String(requestType) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    keywords: searchTerm || undefined,
  });

  const rows = useMemo(() => asArray<any>(data), [data]);

  const clearFilters = () => {
    setRequestType(null);
    setSelectedStatuses(new Set(['2']));
    setFromDate('');
    setToDate('');
    setKeywords('');
    setSearchTerm('');
  };

  const toggleStatus = (id: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (id === '1') {
        // "All" clears everything else
        return new Set(['1']);
      }
      next.delete('1');
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) next.add('2'); // default back to NotClosed
      return next;
    });
  };

  const onSearchSubmit = () => setSearchTerm(keywords.trim());

  const activeFilterCount =
    (requestType != null && requestType !== viewId ? 1 : 0) +
    (selectedStatuses.size > 1 || !selectedStatuses.has('2') ? 1 : 0) +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0);

  const statusColor = (item: any) => {
    if (item.closedDate) return { bg: `${colors.success}20`, fg: colors.success };
    if (item.isDelayed) return { bg: `${colors.danger}20`, fg: colors.danger };
    const t = item.currentStepTypeId;
    if (t === 3) return { bg: `${colors.warning}20`, fg: colors.warning };
    if (t === 2 || t === 4) return { bg: `${colors.primary}20`, fg: colors.primary };
    return { bg: `${colors.primary}20`, fg: colors.primary };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="screen.ticket_list">
      {/* Create button */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <TouchableOpacity style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('ServiceCatalog')} activeOpacity={0.7}
          testID="tickets.new_request">
          <Text style={styles.newBtnText}>+ New Request</Text>
        </TouchableOpacity>
      </View>

      {/* View tabs */}
      <View style={[styles.viewTabs, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        {VIEW_TABS.map((vt) => {
          const active = viewId === vt.key;
          return (
            <TouchableOpacity key={vt.key}
              style={[styles.viewTab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setViewId(vt.key)} activeOpacity={0.7}>
              <Text style={{ fontSize: 13 }}>{vt.icon}</Text>
              <Text style={[styles.viewTabText, { color: active ? colors.primary : colors.textMuted }]} numberOfLines={1}>
                {vt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search + Filter toggle */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Quick search..."
            placeholderTextColor={colors.textMuted}
            value={keywords}
            onChangeText={setKeywords}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
            autoCorrect={false}
          />
          {keywords.length > 0 && (
            <TouchableOpacity onPress={() => { setKeywords(''); setSearchTerm(''); }}>
              <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: showFilters || activeFilterCount > 0 ? colors.primary : colors.card, borderColor: colors.border }]}
          onPress={() => setShowFilters(!showFilters)} activeOpacity={0.7}>
          <Text style={{ fontSize: 14, color: showFilters || activeFilterCount > 0 ? '#fff' : colors.text }}>⚙</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: colors.card }]}>
          <View style={styles.filtersHeader}>
            <Text style={[styles.filtersLabel, { color: colors.text, fontWeight: '700' }]}>FILTERS</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={[styles.clearLink, { color: colors.primary }]}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {/* Request Type */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>REQUEST TYPE</Text>
          <View style={styles.chipsRow}>
            {REQUEST_TYPE_OPTIONS.map((opt) => {
              const active = (requestType ?? viewId) === opt.id;
              return (
                <TouchableOpacity key={opt.id}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => setRequestType(opt.id === viewId ? null : opt.id)} activeOpacity={0.7}>
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date Range */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>DATE RANGE</Text>
          <View style={styles.dateRow}>
            <View style={[styles.dateInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.datePrefix, { color: colors.textMuted }]}>From</Text>
              <TextInput
                style={[styles.dateInput, { color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={fromDate}
                onChangeText={setFromDate}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {fromDate ? (
                <TouchableOpacity onPress={() => setFromDate('')}>
                  <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={[styles.dateInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.datePrefix, { color: colors.textMuted }]}>To</Text>
              <TextInput
                style={[styles.dateInput, { color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={toDate}
                onChangeText={setToDate}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {toDate ? (
                <TouchableOpacity onPress={() => setToDate('')}>
                  <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <View style={styles.quickDateRow}>
            {[
              { label: 'This Month', days: -30 },
              { label: 'Last 3 Months', days: -90 },
              { label: 'This Year', days: -365 },
            ].map((q) => (
              <TouchableOpacity key={q.label}
                style={[styles.quickDateChip, { borderColor: colors.border }]}
                onPress={() => {
                  const from = new Date();
                  from.setDate(from.getDate() + q.days);
                  setFromDate(fmtDateISO(from));
                  setToDate(fmtDateISO(new Date()));
                }} activeOpacity={0.7}>
                <Text style={[styles.quickDateText, { color: colors.textSecondary }]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status - multi-select */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>STATUS (MULTI-SELECT)</Text>
          <View style={styles.chipsRow}>
            {STATUS_CHIPS.map((s) => {
              const active = selectedStatuses.has(s.id);
              return (
                <TouchableOpacity key={s.id}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => toggleStatus(s.id)} activeOpacity={0.7}>
                  {active && <Text style={{ color: '#fff', fontSize: 10, marginRight: 4 }}>✓</Text>}
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {isError && (
        <TouchableOpacity onPress={() => refetch()} activeOpacity={0.75}
          style={{ marginHorizontal: 16, marginTop: 6, backgroundColor: `${colors.danger}14`, borderRadius: 10, padding: 10 }}>
          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>Could not load. Tap to retry.</Text>
        </TouchableOpacity>
      )}

      <FlatList data={rows}
        keyExtractor={(item, i) => String(item.id ?? item.no ?? i)}
        contentContainerStyle={styles.list}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const sc = statusColor(item);
          return (
            <TouchableOpacity style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <View style={[styles.ticketNoBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.ticketNo, { color: colors.primary }]}>#{item.no ?? item.id}</Text>
                </View>
                {item.isDelayed ? (
                  <View style={[styles.delayedBadge, { backgroundColor: '#F7616120' }]}>
                    <Text style={{ color: '#F76161', fontSize: 10, fontWeight: '800' }}>DELAYED</Text>
                  </View>
                ) : null}
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.fg }]} numberOfLines={1}>
                    {item.statusName ?? item.currentStep ?? 'Open'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={2}>
                {item.serviceName ?? 'Service Request'}
              </Text>
              {item.categoryName ? (
                <Text style={[styles.ticketCategory, { color: colors.textMuted }]}>{item.categoryName}</Text>
              ) : null}
              {item.description ? (
                <Text style={[styles.ticketDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {item.createdDate ? new Date(item.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                  {viewId === 2
                    ? (item.assignedTo ? `→ ${item.assignedTo}` : (item.currentStep ?? ''))
                    : (item.createdBy ? `← ${item.createdBy}` : '')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isLoading || (isFetching && rows.length === 0) ? (
            <TicketListSkeleton />
          ) : !isFetching ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>{viewId === 3 ? '📥' : viewId === 4 ? '⏳' : '🎫'}</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {viewId === 1 ? 'No actions taken today'
                  : viewId === 3 ? 'No tickets assigned to you'
                  : viewId === 4 ? 'Nothing waiting for your approval'
                  : 'No requests found'}
              </Text>
              {viewId === 2 && (
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('ServiceCatalog')} activeOpacity={0.7}>
                  <Text style={styles.emptyBtnText}>+ Create New Request</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  newBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  viewTabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  viewTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 2 },
  viewTabText: { fontSize: 11, fontWeight: '700' },

  searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 38 },
  searchInput: { flex: 1, fontSize: 14, padding: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  clearIcon: { fontSize: 14, paddingHorizontal: 4 },
  filterBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#F76161', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1, borderColor: '#fff' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

  filtersPanel: { marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 14 },
  filtersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  filtersLabel: { fontSize: 12, letterSpacing: 0.8 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  clearLink: { fontSize: 12, fontWeight: '600' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },

  dateRow: { flexDirection: 'row', gap: 8 },
  dateInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 36 },
  datePrefix: { fontSize: 11, fontWeight: '600', marginRight: 6 },
  dateInput: { flex: 1, fontSize: 13, padding: 0, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  quickDateRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  quickDateChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  quickDateText: { fontSize: 11, fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 32, gap: 8 },
  card: { borderRadius: 14, padding: 14, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  ticketNoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ticketNo: { fontSize: 12, fontWeight: '800' },
  delayedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 'auto', maxWidth: 180 },
  statusText: { fontSize: 11, fontWeight: '700' },
  ticketTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 2 },
  ticketCategory: { fontSize: 11, marginBottom: 4 },
  ticketDesc: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 6 },
  meta: { fontSize: 11, flexShrink: 1 },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, marginBottom: 20, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default TicketListScreen;
