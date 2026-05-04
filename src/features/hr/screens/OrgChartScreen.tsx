import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, LayoutAnimation, Platform, UIManager, TextInput, I18nManager, Dimensions } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetFullOrgChartQuery } from '../services/hrApi';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import ProfileAvatar from '../../../shared/components/ProfileAvatar';
import ScreenHeroBackButton, {
  ScreenHeroHeaderIconButton,
  screenHeroHeaderActionText,
} from '../../../shared/components/ScreenHeroBackButton';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const SCAD_ENTITY_ID = 1;

type LevelKey = 'dg' | 'sector' | 'department' | 'section';

const LEVEL: Record<LevelKey, {
  color: string; ring: string; label: string; icon: string;
}> = {
  dg:         { color: '#4F46E5', ring: '#A5B4FC', label: 'DG',         icon: '👑' },
  sector:     { color: '#2563EB', ring: '#93C5FD', label: 'Sector',     icon: '🏢' },
  department: { color: '#0EA5A4', ring: '#5EEAD4', label: 'Department', icon: '🏛️' },
  section:    { color: '#F59E0B', ring: '#FCD34D', label: 'Section',    icon: '📂' },
};

/* ─── Types (mirror SP result sets) ─────────────────────────────────── */
interface EntityRow {
  id: number;
  name: string; nameAr: string; abbreviation?: string;
  dgManagerId?: string | null;
  dgManagerName?: string;   dgManagerNameAr?: string;
  dgTitle?: string;         dgTitleAr?: string;
  dgEmail?: string;         dgMobile?: string;
  sectorCount: number; departmentCount: number; sectionCount: number; employeeCount: number;
}
interface SectorRow    { id: number; entityId: number;     name: string; nameAr: string; managerId?: string|null; managerName?: string; managerNameAr?: string; managerTitle?: string; managerTitleAr?: string; departmentCount: number; employeeCount: number; }
interface DeptRow      { id: number; sectorId: number;     name: string; nameAr: string; managerId?: string|null; managerName?: string; managerNameAr?: string; managerTitle?: string; managerTitleAr?: string; sectionCount: number; employeeCount: number; }
interface SectionRow   { id: number; departmentId: number; name: string; nameAr: string; managerId?: string|null; managerName?: string; managerNameAr?: string; managerTitle?: string; managerTitleAr?: string; employeeCount: number; }

interface TreeNode {
  key: string;
  level: LevelKey;
  userId?: string | null;
  unitName: string;
  personName: string;
  personTitle?: string;
  employeeCount?: number;
  childCount?: number;
  children: TreeNode[];
}

type ViewMode = 'indented' | 'horizontal';

/* ════════════════════════════════════════════════════════════════════
 * INDENTED (file-explorer) LAYOUT
 * ══════════════════════════════════════════════════════════════════ */

const INDENT_STEP = 22;
const ROW_HEIGHT  = 64;

const IndentedRow: React.FC<{
  node: TreeNode;
  depth: number;
  expanded: boolean;
  isLast: boolean;
  ancestorsLast: boolean[];
  onToggle?: () => void;
  onPressAvatar?: () => void;
  highlight: boolean;
  colors: any;
}> = ({ node, depth, expanded, isLast, ancestorsLast, onToggle, onPressAvatar, highlight, colors }) => {
  const cfg = LEVEL[node.level];
  const hasChildren = node.children.length > 0;

  return (
    <View>
      <View style={styles.indentRow}>
        {/* Connector tracks for ancestor levels */}
        {ancestorsLast.map((wasLast, i) => (
          <View key={`a-${i}`} style={[styles.indentCell, { width: INDENT_STEP }]}>
            {!wasLast ? (
              <View style={[styles.vline, { backgroundColor: colors.borderLight }]} />
            ) : null}
          </View>
        ))}

        {/* Connector for THIS node (L or T shape) */}
        {depth > 0 ? (
          <View style={[styles.indentCell, { width: INDENT_STEP }]}>
            <View style={[
              styles.vline,
              { backgroundColor: colors.borderLight, height: isLast ? ROW_HEIGHT / 2 : ROW_HEIGHT, top: 0 },
            ]} />
            <View style={[styles.hline, { backgroundColor: colors.borderLight }]} />
          </View>
        ) : null}

        {/* Row body */}
        <TouchableOpacity
          activeOpacity={hasChildren ? 0.7 : 1}
          onPress={hasChildren ? onToggle : onPressAvatar}
          style={[
            styles.indentBody,
            {
              backgroundColor: highlight ? `${cfg.color}14` : colors.card,
              borderColor: highlight ? cfg.color : colors.borderLight,
            },
          ]}
        >
          {/* Expand chevron */}
          <View style={[
            styles.chev,
            {
              backgroundColor: hasChildren ? `${cfg.color}1A` : 'transparent',
              borderColor:     hasChildren ? `${cfg.color}33` : 'transparent',
            },
          ]}>
            <Text style={[styles.chevTxt, { color: hasChildren ? cfg.color : 'transparent' }]}>
              {expanded ? '▾' : '▸'}
            </Text>
          </View>

          {/* Avatar */}
          <TouchableOpacity
            activeOpacity={node.userId ? 0.7 : 1}
            onPress={onPressAvatar}
            disabled={!node.userId}
            style={[styles.avatarRing, { borderColor: cfg.ring, width: 44, height: 44, borderRadius: 22 }]}
          >
            <ProfileAvatar
              userId={node.userId ?? undefined}
              name={node.personName || node.unitName}
              size={38}
              borderRadius={19}
              backgroundColor={cfg.color}
              fontSize={14}
            />
          </TouchableOpacity>

          {/* Texts */}
          <View style={styles.indentText}>
            <View style={styles.indentTopLine}>
              <View style={[styles.levelChip, { backgroundColor: `${cfg.color}1A`, borderColor: `${cfg.color}33` }]}>
                <Text style={[styles.levelChipText, { color: cfg.color }]}>
                  {cfg.icon} {cfg.label}
                </Text>
              </View>
              {node.employeeCount ? (
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  👥 {node.employeeCount}
                </Text>
              ) : null}
              {hasChildren ? (
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  • {node.children.length}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.indentUnit, { color: colors.text }]} numberOfLines={1}>
              {node.unitName}
            </Text>
            <Text style={[styles.indentPerson, { color: colors.textSecondary }]} numberOfLines={1}>
              {node.personName || '—'}
              {node.personTitle ? ` · ${node.personTitle}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Children */}
      {expanded && hasChildren ? (
        <View>
          {node.children.map((c, idx) => (
            <IndentedRowConnected
              key={c.key}
              node={c}
              depth={depth + 1}
              isLast={idx === node.children.length - 1}
              ancestorsLast={[...ancestorsLast, isLast]}
              colors={colors}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

/* Wrapper that manages its own expand from context — keeps the public API simple */
const IndentedTreeContext = React.createContext<{
  expanded: Set<string>;
  toggle: (k: string) => void;
  goToEmployee: (n: TreeNode) => void;
  query: string;
}>({ expanded: new Set(), toggle: () => {}, goToEmployee: () => {}, query: '' });

const IndentedRowConnected: React.FC<{
  node: TreeNode;
  depth: number;
  isLast: boolean;
  ancestorsLast: boolean[];
  colors: any;
}> = ({ node, depth, isLast, ancestorsLast, colors }) => {
  const ctx = React.useContext(IndentedTreeContext);
  const isExpanded = ctx.expanded.has(node.key);
  const q = ctx.query;
  const highlight = !!q && (
    node.unitName.toLowerCase().includes(q) ||
    (node.personName || '').toLowerCase().includes(q) ||
    (node.personTitle || '').toLowerCase().includes(q)
  );
  return (
    <IndentedRow
      node={node}
      depth={depth}
      expanded={isExpanded}
      isLast={isLast}
      ancestorsLast={ancestorsLast}
      onToggle={() => ctx.toggle(node.key)}
      onPressAvatar={() => ctx.goToEmployee(node)}
      highlight={highlight}
      colors={colors}
    />
  );
};

/* ════════════════════════════════════════════════════════════════════
 * HORIZONTAL (classic) LAYOUT
 * ══════════════════════════════════════════════════════════════════ */

const COL_WIDTH = 156;
const COL_GAP   = 12;
const TRUNK_HEIGHT = 18;

const SIZE_BY_LEVEL: Record<LevelKey, number> = {
  dg: 88, sector: 64, department: 56, section: 48,
};

const HNodeCard: React.FC<{
  node: TreeNode; expanded: boolean; onPress?: () => void; onPressAvatar?: () => void;
  colors: any; shadows: any;
}> = ({ node, expanded, onPress, onPressAvatar, colors, shadows }) => {
  const cfg = LEVEL[node.level];
  const sz = SIZE_BY_LEVEL[node.level];
  const hasChildren = node.children.length > 0;

  return (
    <TouchableOpacity
      activeOpacity={hasChildren ? 0.75 : 1}
      onPress={onPress}
      style={[
        styles.hCard,
        shadows.card,
        {
          backgroundColor: colors.card,
          borderColor: expanded ? cfg.color : colors.borderLight,
          borderWidth: expanded ? 2 : 1,
          width: COL_WIDTH - COL_GAP,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={node.userId ? 0.7 : 1}
        onPress={onPressAvatar}
        disabled={!node.userId}
        style={[
          styles.avatarRing,
          { width: sz + 10, height: sz + 10, borderRadius: (sz + 10) / 2, borderColor: cfg.ring },
        ]}
      >
        <ProfileAvatar
          userId={node.userId ?? undefined}
          name={node.personName || node.unitName}
          size={sz}
          borderRadius={sz / 2}
          backgroundColor={cfg.color}
          fontSize={Math.round(sz * 0.36)}
        />
        <View style={[styles.levelTag, { backgroundColor: cfg.color }]}>
          <Text style={styles.levelTagText}>{cfg.icon}</Text>
        </View>
      </TouchableOpacity>

      <Text
        style={[styles.hPerson, { color: colors.text, fontSize: node.level === 'dg' ? 13.5 : 12 }]}
        numberOfLines={2}
      >
        {node.personName || '—'}
      </Text>
      {node.personTitle ? (
        <Text style={[styles.hTitle, { color: colors.textSecondary }]} numberOfLines={2}>
          {node.personTitle}
        </Text>
      ) : null}

      <View style={[styles.hUnitPill, { backgroundColor: `${cfg.color}14` }]}>
        <Text style={[styles.hUnitText, { color: cfg.color }]} numberOfLines={2}>
          {node.unitName}
        </Text>
      </View>

      {(node.childCount || node.employeeCount) ? (
        <View style={styles.hCounts}>
          {node.childCount ? (
            <Text style={[styles.hCountTxt, { color: colors.textMuted }]}>
              {node.childCount} ▾
            </Text>
          ) : null}
          {node.employeeCount ? (
            <Text style={[styles.hCountTxt, { color: colors.textMuted }]}>
              👥 {node.employeeCount}
            </Text>
          ) : null}
        </View>
      ) : null}

      {hasChildren ? (
        <View style={[styles.expandBadge, { backgroundColor: expanded ? cfg.color : `${cfg.color}22` }]}>
          <Text style={[styles.expandBadgeText, { color: expanded ? '#fff' : cfg.color }]}>
            {expanded ? '−' : '+'}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const HBranch: React.FC<{
  node: TreeNode;
  expanded: Set<string>;
  toggle: (key: string) => void;
  goToEmployee: (n: TreeNode) => void;
  colors: any; shadows: any;
}> = ({ node, expanded, toggle, goToEmployee, colors, shadows }) => {
  const isOpen = expanded.has(node.key);
  const children = node.children;
  const cfg = LEVEL[node.level];

  return (
    <View style={styles.hBranch}>
      <HNodeCard
        node={node}
        expanded={isOpen}
        onPress={children.length > 0 ? () => toggle(node.key) : undefined}
        onPressAvatar={() => goToEmployee(node)}
        colors={colors}
        shadows={shadows}
      />

      {isOpen && children.length > 0 ? (
        <>
          <View style={[styles.hTrunk, { backgroundColor: cfg.color, height: TRUNK_HEIGHT }]} />

          <View style={styles.hChildrenWrap}>
            {children.length > 1 ? (
              <View style={[styles.hBus, { backgroundColor: cfg.color }]} />
            ) : null}

            <View style={styles.hChildrenRow}>
              {children.map((child) => (
                <View key={child.key} style={styles.hChildCol}>
                  <View style={[styles.hStub, { backgroundColor: cfg.color, height: TRUNK_HEIGHT }]} />
                  <HBranch
                    node={child}
                    expanded={expanded}
                    toggle={toggle}
                    goToEmployee={goToEmployee}
                    colors={colors}
                    shadows={shadows}
                  />
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * SCREEN
 * ══════════════════════════════════════════════════════════════════ */

const OrgChartScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const headerSubColor = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.72)';
  const isArabic = (i18n.language || '').toLowerCase().startsWith('ar') || I18nManager.isRTL;

  const { data, isLoading, isFetching, refetch, isError } =
    useGetFullOrgChartQuery(SCAD_ENTITY_ID);

  const pick = useCallback(
    (en?: string, ar?: string) => (isArabic ? (ar || en || '') : (en || ar || '')),
    [isArabic],
  );

  /* ── Build tree ───────────────────────────────────────────────── */
  const { tree, entity } = useMemo(() => {
    const envelope = asObject<any>(data) ?? {};
    const payload  = asObject<any>(envelope.data) ?? envelope;

    // The API multi-result handler collapses the first single-row result
    // set into a plain object, so `entity` may arrive as either an object
    // or a 1-element array. Handle both shapes.
    const entityRaw = payload.entity;
    const entityRow: EntityRow | null =
      (asObject<EntityRow>(entityRaw) ?? asArray<EntityRow>(entityRaw)[0]) ?? null;
    const sectors  = asArray<SectorRow>(payload.sectors);
    const depts    = asArray<DeptRow>(payload.departments);
    const sections = asArray<SectionRow>(payload.sections);

    if (!entityRow) return { tree: null as TreeNode | null, entity: null };

    const sectionsByDept: Record<number, SectionRow[]> = {};
    for (const s of sections) (sectionsByDept[s.departmentId] ??= []).push(s);

    const deptsBySector: Record<number, DeptRow[]> = {};
    for (const d of depts) (deptsBySector[d.sectorId] ??= []).push(d);

    const buildSection = (s: SectionRow): TreeNode => ({
      key: `section-${s.id}`,
      level: 'section',
      userId: s.managerId ?? null,
      unitName: pick(s.name, s.nameAr),
      personName: pick(s.managerName, s.managerNameAr),
      personTitle: pick(s.managerTitle, s.managerTitleAr),
      employeeCount: s.employeeCount,
      children: [],
    });

    const buildDept = (d: DeptRow): TreeNode => ({
      key: `dept-${d.id}`,
      level: 'department',
      userId: d.managerId ?? null,
      unitName: pick(d.name, d.nameAr),
      personName: pick(d.managerName, d.managerNameAr),
      personTitle: pick(d.managerTitle, d.managerTitleAr),
      employeeCount: d.employeeCount,
      childCount: d.sectionCount,
      children: (sectionsByDept[d.id] ?? []).map(buildSection),
    });

    const buildSector = (s: SectorRow): TreeNode => ({
      key: `sector-${s.id}`,
      level: 'sector',
      userId: s.managerId ?? null,
      unitName: pick(s.name, s.nameAr),
      personName: pick(s.managerName, s.managerNameAr),
      personTitle: pick(s.managerTitle, s.managerTitleAr),
      employeeCount: s.employeeCount,
      childCount: s.departmentCount,
      children: (deptsBySector[s.id] ?? []).map(buildDept),
    });

    const dgNode: TreeNode = {
      key: 'dg',
      level: 'dg',
      userId: entityRow.dgManagerId ?? null,
      unitName: pick(entityRow.name, entityRow.nameAr),
      personName: pick(entityRow.dgManagerName, entityRow.dgManagerNameAr),
      personTitle: pick(entityRow.dgTitle, entityRow.dgTitleAr) || t('hr.directorGeneral', 'Director General'),
      employeeCount: entityRow.employeeCount,
      childCount: entityRow.sectorCount,
      children: sectors.map(buildSector),
    };

    return { tree: dgNode, entity: entityRow };
  }, [data, pick, t]);

  /* ── State ────────────────────────────────────────────────────── */
  const [mode, setMode] = useState<ViewMode>('indented');
  // Indented view: DG opened by default so users see sectors immediately.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['dg']));

  const toggle = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!tree) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const all = new Set<string>();
    const walk = (n: TreeNode) => {
      if (n.children.length > 0) {
        all.add(n.key);
        n.children.forEach(walk);
      }
    };
    walk(tree);
    setExpanded(all);
  }, [tree]);

  const collapseAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(mode === 'indented' ? new Set(['dg']) : new Set());
  }, [mode]);

  const switchMode = useCallback((next: ViewMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(next);
    // When switching to horizontal, start collapsed (DG only).
    // When switching to indented, keep DG open.
    setExpanded(next === 'indented' ? new Set(['dg']) : new Set());
  }, []);

  /* ── Search ────────────────────────────────────────────────────── */
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const searchExpanded = useMemo(() => {
    if (!q || !tree) return null;
    const hit = (s?: string) => !!s && s.toLowerCase().includes(q);
    const result = new Set<string>();
    const walk = (n: TreeNode): boolean => {
      const selfMatch = hit(n.unitName) || hit(n.personName) || hit(n.personTitle);
      const childMatch = n.children.some(walk);
      if (childMatch) result.add(n.key);
      return selfMatch || childMatch;
    };
    walk(tree);
    return result;
  }, [q, tree]);

  const effectiveExpanded = searchExpanded ?? expanded;

  const goToEmployee = useCallback((n: TreeNode) => {
    if (!n.userId) return;
    navigation.navigate('EmployeeDetail', {
      userId: n.userId, name: n.personName, jobTitle: n.personTitle,
    });
  }, [navigation]);

  /* ── Loading ──────────────────────────────────────────────────── */
  if (isLoading && !tree) {
    return (
      <View style={[styles.root, styles.centerRoot, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.stackStatusBar} backgroundColor={colors.stackHeaderBackground} />
        <ScreenHeroBackButton layout="fullscreen" onPress={() => navigation.goBack()} style={{ zIndex: 10 }} />
        <ThemedActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const entityName = entity ? pick(entity.name, entity.nameAr) : '';

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.stackStatusBar} backgroundColor={colors.stackHeaderBackground} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.stackHeaderBackground }]}>
        <ScreenHeroBackButton layout="inline" onPress={() => navigation.goBack()} />

        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.stackHeaderText }]} numberOfLines={1}>
            {t('hr.orgChart', 'Organization Chart')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: headerSubColor }]} numberOfLines={1}>
            {entityName} {entity?.abbreviation ? `• ${entity.abbreviation}` : ''}
          </Text>
        </View>

        <ScreenHeroHeaderIconButton
          onPress={effectiveExpanded.size > (mode === 'indented' ? 1 : 0) ? collapseAll : expandAll}
          accessibilityLabel={
            effectiveExpanded.size > (mode === 'indented' ? 1 : 0)
              ? t('hr.orgChartCollapseAll', 'Collapse all')
              : t('hr.orgChartExpandAll', 'Expand all')
          }
        >
          <Text style={screenHeroHeaderActionText(colors.stackHeaderTint)}>
            {effectiveExpanded.size > (mode === 'indented' ? 1 : 0) ? '⊟' : '⊞'}
          </Text>
        </ScreenHeroHeaderIconButton>
      </View>

      {/* Stats strip */}
      {entity ? (
        <View style={styles.statsStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsStrip}
          >
            <StatPill icon="🏢" label={t('hr.sectors',     'Sectors')}     value={entity.sectorCount}     color="#2563EB" />
            <StatPill icon="🏛️" label={t('hr.departments', 'Departments')} value={entity.departmentCount} color="#0EA5A4" />
            <StatPill icon="📂" label={t('hr.sections',    'Sections')}    value={entity.sectionCount}    color="#F59E0B" />
            <StatPill icon="👥" label={t('hr.employees',   'Employees')}   value={entity.employeeCount}   color="#4F46E5" />
          </ScrollView>
        </View>
      ) : null}

      {/* Search + view toggle */}
      <View style={styles.toolbar}>
        <View style={[styles.searchBar, shadows.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('hr.orgSearch', 'Search unit or manager…')}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <View style={[styles.clearDot, { backgroundColor: colors.textMuted }]}>
                <Text style={styles.clearDotText}>✕</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* View mode segmented control */}
        <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <TouchableOpacity
            onPress={() => switchMode('indented')}
            style={[
              styles.segmentBtn,
              mode === 'indented' ? { backgroundColor: colors.primary } : null,
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentTxt, { color: mode === 'indented' ? '#fff' : colors.textSecondary }]}>
              ☰
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchMode('horizontal')}
            style={[
              styles.segmentBtn,
              mode === 'horizontal' ? { backgroundColor: colors.primary } : null,
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentTxt, { color: mode === 'horizontal' ? '#fff' : colors.textSecondary }]}>
              ⌬
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error pill */}
      {isError ? (
        <View style={[styles.errorPill, { backgroundColor: `${colors.danger}14` }]}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>
            {t('common.loadError', 'Could not load the org chart. Pull to refresh.')}
          </Text>
        </View>
      ) : null}

      {/* Body */}
      {mode === 'indented' ? (
        /* ─── INDENTED VIEW ─── */
        <ScrollView
          style={styles.indentedV}
          contentContainerStyle={styles.indentedContent}
          refreshControl={
            <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
          }
        >
          {tree ? (
            <IndentedTreeContext.Provider
              value={{ expanded: effectiveExpanded, toggle, goToEmployee, query: q }}
            >
              <IndentedRowConnected
                node={tree}
                depth={0}
                isLast={true}
                ancestorsLast={[]}
                colors={colors}
              />
            </IndentedTreeContext.Provider>
          ) : (
            <EmptyTree colors={colors} t={t} />
          )}
        </ScrollView>
      ) : (
        /* ─── HORIZONTAL VIEW ─── */
        <ScrollView
          style={styles.canvasV}
          contentContainerStyle={styles.canvasVContent}
          refreshControl={
            <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
          }
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.canvasH}
          >
            {tree ? (
              <HBranch
                node={tree}
                expanded={effectiveExpanded}
                toggle={toggle}
                goToEmployee={goToEmployee}
                colors={colors}
                shadows={shadows}
              />
            ) : (
              <EmptyTree colors={colors} t={t} />
            )}
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
};

/* ─── Bits ──────────────────────────────────────────────────────── */
const StatPill: React.FC<{ icon: string; label: string; value: number; color: string }> = ({
  icon, label, value, color,
}) => (
  <View style={[styles.statPill, { borderColor: `${color}33`, backgroundColor: `${color}0D` }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
  </View>
);

const EmptyTree: React.FC<{ colors: any; t: any }> = ({ colors, t }) => (
  <View style={styles.empty}>
    <Text style={styles.emptyIcon}>🏗️</Text>
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      {t('hr.noOrgData', 'No organization data available')}
    </Text>
  </View>
);

/* ─── Styles ────────────────────────────────────────────────────── */
const screenW = Dimensions.get('window').width;

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerRoot: { justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : 18,
    paddingBottom: 12, paddingHorizontal: 14,
  },
  headerTitle:    { fontSize: 15, fontWeight: '800' },
  headerSubtitle: { fontSize: 11.5, fontWeight: '600', marginTop: 1 },

  /* Stats strip — fixed height so the horizontal ScrollView can't stretch
     vertically and blow the pills up into giant cards. */
  statsStripWrap: { height: 44, marginTop: 10 },
  statsStrip: {
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, marginRight: 8,
    height: 30,
  },
  statIcon:  { fontSize: 12, marginRight: 5 },
  statValue: { fontSize: 12.5, fontWeight: '900', marginRight: 4 },
  statLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },

  /* Toolbar (search + segment) */
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, marginTop: 8, marginBottom: 4,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 14, height: 42,
    borderWidth: 1, marginRight: 8,
  },
  searchIcon: { fontSize: 14, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 13.5, fontWeight: '500', paddingVertical: 0 },
  clearDot: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  clearDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  segment: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden',
    height: 42,
  },
  segmentBtn: {
    paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
    minWidth: 42, height: '100%',
  },
  segmentTxt: { fontSize: 16, fontWeight: '900' },

  errorPill: {
    marginHorizontal: 14, marginTop: 8,
    borderRadius: 10, padding: 12,
  },

  /* ── Indented tree ── */
  indentedV: { flex: 1 },
  indentedContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 32 },
  indentRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: ROW_HEIGHT },
  indentCell: { position: 'relative', height: ROW_HEIGHT },
  vline: {
    position: 'absolute', left: '50%', width: 1.5, top: 0, bottom: 0,
    transform: [{ translateX: -0.75 }],
  },
  hline: {
    position: 'absolute', top: ROW_HEIGHT / 2, left: '50%', right: 0, height: 1.5,
  },
  indentBody: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, marginVertical: 4,
    gap: 10,
  },
  chev: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chevTxt: { fontSize: 11, fontWeight: '900' },
  avatarRing: {
    borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  indentText: { flex: 1, minWidth: 0 },
  indentTopLine: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap',
  },
  levelChip: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  levelChipText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.3 },
  metaText: { fontSize: 10.5, fontWeight: '700' },
  indentUnit:   { fontSize: 13, fontWeight: '800' },
  indentPerson: { fontSize: 11.5, fontWeight: '500', marginTop: 1 },

  /* ── Horizontal tree ── */
  canvasV:        { flex: 1 },
  canvasVContent: { paddingBottom: 40, paddingTop: 16, minWidth: screenW },
  canvasH:        { minWidth: screenW, paddingHorizontal: 20, paddingVertical: 4, alignItems: 'flex-start' },
  hBranch:        { alignItems: 'center' },
  hTrunk:         { width: 2, alignSelf: 'center' },
  hChildrenWrap:  { alignItems: 'center' },
  hBus: {
    position: 'absolute', top: 0,
    left: COL_WIDTH / 2, right: COL_WIDTH / 2, height: 2,
  },
  hChildrenRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hChildCol: {
    width: COL_WIDTH, alignItems: 'center', paddingHorizontal: COL_GAP / 2,
  },
  hStub: { width: 2, alignSelf: 'center' },

  hCard: {
    borderRadius: 16, padding: 10, alignItems: 'center', marginBottom: 4,
  },
  levelTag: {
    position: 'absolute', bottom: -4, right: -4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 10, borderWidth: 2, borderColor: '#fff',
  },
  levelTagText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  hPerson: { fontWeight: '800', textAlign: 'center', marginBottom: 2, marginTop: 8 },
  hTitle:  { fontSize: 10.5, fontWeight: '500', textAlign: 'center', marginBottom: 6, paddingHorizontal: 2 },
  hUnitPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'stretch',
  },
  hUnitText: { fontSize: 10.5, fontWeight: '800', textAlign: 'center' },
  hCounts: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
  hCountTxt: { fontSize: 10, fontWeight: '700' },
  expandBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  expandBadgeText: { fontSize: 14, fontWeight: '900', marginTop: -1 },

  /* Empty */
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32, width: screenW - 40 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});

export default OrgChartScreen;
