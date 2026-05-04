import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useGetExecutiveDashboardQuery,
  type DashboardOperationalSector,
  type DashboardCRMService,
  type DashboardProject,
  type DashboardFinanceChapter,
  type DashboardFinanceProject,
  type DashboardDeliverable,
  type DashboardKpiObjective,
} from '../services/dashboardApi';
import Donut from '../components/Donut';
import ProgressBar from '../components/ProgressBar';
import { TabbedListCard } from '../components/TabbedListCard';
import QueryStates from '../../../shared/components/QueryStates';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import ExecutiveDashboardSkeleton from '../components/ExecutiveDashboardSkeleton';

// ── Helpers ─────────────────────────────────────────────────────────────

const fmtPct = (n: number | null | undefined, digits = 2) =>
  n == null ? '—' : `${Number(n).toFixed(digits)}%`;

const fmtMoney = (n: number | null | undefined) => {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

// ── Main screen ─────────────────────────────────────────────────────────

const ExecutiveDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const navigation = useNavigation();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [yearOpen, setYearOpen] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error,
    isError,
  } = useGetExecutiveDashboardQuery({ year });

  const onRefresh = () => { void refetch(); };

  const yearOptions = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4],
    [currentYear],
  );

  useEffect(() => {
    if (data?.redirectTo !== 'personal') return;
    (navigation as { navigate: (name: string, params?: { screen: string }) => void }).navigate('Dashboard', {
      screen: 'MyDashboard',
    });
  }, [data?.redirectTo, navigation]);

  /** Backend failures return `{ success: false, message }` (HTTP 200). Some proxies omit `success`; treat explicit error text + missing dashboard fields as failure so we never show the executive lock. */
  const raw = data as Record<string, unknown> | undefined;
  const apiEnvelopeFailed =
    raw != null &&
    (raw.success === false ||
      (typeof raw.message === 'string' &&
        raw.message.length > 0 &&
        raw.year === undefined &&
        raw.hasAccess === undefined &&
        raw.success !== true));
  const noAccess = !!(data && !apiEnvelopeFailed && data.hasAccess === false);

  return (
    <QueryStates
      loading={isLoading}
      error={error}
      apiError={isError}
      isRefreshing={isFetching}
      onRetry={onRefresh}
      errorTitle={t('dashboard.error.title', 'Could not load dashboard')}
      loadingTestID="screen.executive_dashboard_loading"
      loadingFallback={<ExecutiveDashboardSkeleton />}
    >
      {apiEnvelopeFailed ? (
        <View style={[styles.center, { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 }]}>
          <ApiErrorState
            onRetry={onRefresh}
            isRetrying={isFetching}
            title={t('dashboard.error.title', 'Could not load dashboard')}
            message={data?.message ?? t('dashboard.error.body', 'Something went wrong. Please try again.')}
          />
        </View>
      ) : noAccess ? (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.center, { paddingVertical: 60 }]}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={onRefresh} />}
      >
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🔒</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t('dashboard.noAccess.title', 'Executive view only')}
        </Text>
        <Text style={[styles.emptyText, { color: colors.textMuted, paddingHorizontal: 30 }]}>
          {t(
            'dashboard.noAccess.body',
            'This dashboard is reserved for the Director General, Executive Directors and Directors. Contact your administrator if you need access.',
          )}
        </Text>
      </ScrollView>
      ) : (
    (() => {
  const sp = data?.strategicPerformance;
  const stat = data?.statisticalProduction;
  const sv = data?.svProduction;
  const ops = data?.operationalSectors ?? [];
  const crm = data?.crmServices ?? [];
  const gov = data?.governance;
  const finance = data?.finance ?? [];
  const strategicProjects = data?.strategicProjects ?? [];
  const nonStrategicProjects = data?.nonStrategicProjects ?? [];
  const cashFlowProjects = data?.cashFlowProjects ?? [];
  const strategicBudgetProjects = data?.strategicBudgetProjects ?? [];
  const deliverables = data?.deliverables ?? [];
  const kpiObjectives = data?.kpiObjectives ?? [];

  const hideOrgWide = data?.hideOrgWideModules === true;
  const scopeSummary = data?.scopeSummary;
  const scopeFilterActive = data?.scopeFilterActive === true;

  const heroChipLine = [scopeSummary, data?.persona, data?.scope?.sectorName ?? data?.scope?.departmentName]
    .filter((x) => !!x && String(x).trim().length > 0)
    .join(' · ');

  return (
    <ScrollView
      testID="screen.executive_dashboard"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={onRefresh} />}
    >
      {/* Hero header */}
      <LinearGradient
        colors={[colors.secondary, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroEyebrow, { color: 'rgba(255,255,255,0.75)' }]}>
              {t('dashboard.eyebrow', 'Executive Dashboard').toUpperCase()}
            </Text>
            <Text style={[styles.heroTitle, { color: '#FFF' }]} numberOfLines={2}>
              {t('dashboard.title', 'Management Overview')}
            </Text>
            <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.88)' }]}>
              {hideOrgWide
                ? t('dashboard.subtitle.scoped', 'Performance and delivery for your sectors and departments only.')
                : t('dashboard.subtitle', 'Strategic performance, finance and operations at a glance.')}
            </Text>
            {!!heroChipLine && (
              <View style={styles.heroScopeChip}>
                <Text style={styles.heroScopeText} numberOfLines={2}>
                  {heroChipLine}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setYearOpen(true)}
            style={[styles.yearChip, { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.32)' }]}
            accessibilityRole="button"
          >
            <Text style={[styles.yearChipLabel, { color: 'rgba(255,255,255,0.75)' }]}>
              {t('dashboard.year', 'Year')}
            </Text>
            <Text style={[styles.yearChipValue, { color: '#FFF' }]}>{year} ▾</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* KPI Performance gauges card */}
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card, marginTop: -22 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('dashboard.sections.strategic', 'Strategic Performance')}
        </Text>
        {scopeFilterActive && (
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 10, marginTop: -4 }}>
            {t(
              'dashboard.strategicScopedHint',
              'Figures below reflect your allowed sectors after blending operational performance.',
            )}
          </Text>
        )}
        <View style={styles.gaugeRow}>
          <DonutCell
            label={t('dashboard.gauges.projects', 'Projects')}
            value={sp?.strategicProjectsPerformance ?? 0}
            color={colors.primary}
            trackColor={colors.greyCard}
            bg={colors.card}
            textColor={colors.text}
          />
          <DonutCell
            label={t('dashboard.gauges.kpi', 'Strategic KPI')}
            value={sp?.strategicKpiPerformance ?? 0}
            color={colors.success}
            trackColor={colors.greyCard}
            bg={colors.card}
            textColor={colors.text}
          />
          <DonutCell
            label={t('dashboard.gauges.operationalKpi', 'Operational KPI')}
            value={sp?.operationalKpiPerformance ?? 0}
            color={colors.warning}
            trackColor={colors.greyCard}
            bg={colors.card}
            textColor={colors.text}
          />
        </View>
        {(sp?.commonKpiPerformance ?? null) !== null && (sp?.commonKpiPerformance ?? 0) > 0 && (
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <Text style={[styles.commonKpiText, { color: colors.textMuted }]}>
              {t('dashboard.gauges.commonKpi', 'Common KPI')}: {' '}
              <Text style={{ color: colors.text, fontWeight: '800' }}>{fmtPct(sp?.commonKpiPerformance, 2)}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Financial Performance — full breakdown */}
      {!hideOrgWide && sp && ((sp.approvedBudget ?? 0) > 0 || (sp.plannedBudget ?? 0) > 0 || (sp.consumedBudget ?? 0) > 0) && (
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <View style={styles.finHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              {t('dashboard.sections.financial', 'Financial Performance')}
            </Text>
            {sp.budgetReadingMonth != null && sp.budgetReadingYear != null && (
              <Text style={[styles.finAsOf, { color: colors.textMuted }]}>
                {t('dashboard.fin.asOf', 'As of {{m}}/{{y}}', { m: sp.budgetReadingMonth, y: sp.budgetReadingYear })}
              </Text>
            )}
          </View>

          {/* Top: vital performance */}
          <View style={[styles.vitalCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.vitalLabel, { color: colors.textMuted }]}>
                {t('dashboard.fin.vital', 'Vital Performance')}
              </Text>
              <Text style={[styles.vitalValue, { color: colors.primary }]}>{fmtPct(sp.budgetPercentage, 1)}</Text>
              <Text style={[styles.vitalFoot, { color: colors.textMuted }]} numberOfLines={1}>
                {fmtMoney(sp.consumedBudget)} {t('dashboard.fin.of', 'of')} {fmtMoney(sp.plannedBudget)}
              </Text>
            </View>
            <View style={styles.vitalDonutWrap}>
              <Donut
                value={sp.budgetPercentage}
                size={86}
                thickness={10}
                color={colors.primary}
                trackColor={colors.greyCard}
                bg={colors.card}
                textColor={colors.text}
              />
            </View>
          </View>

          {/* Strategic + Operational side by side */}
          <View style={styles.budgetSplitRow}>
            <BudgetCard
              title={t('dashboard.fin.strategic', 'Strategic')}
              approved={sp.strategicBudget ?? 0}
              planned={sp.strategicPlannedBudget}
              consumed={sp.strategicConsumedBudget}
              variance={sp.strategicVariance}
              tint={colors.success}
            />
            <BudgetCard
              title={t('dashboard.fin.operational', 'Operational')}
              approved={sp.operationalBudget ?? 0}
              planned={sp.operationalPlannedBudget}
              consumed={sp.operationalConsumedBudget}
              variance={sp.operationalVariance}
              tint={colors.warning}
            />
          </View>
        </View>
      )}

      {/* Strategic + Non-Strategic Projects with tabs + paging */}
      {(strategicProjects.length > 0 || nonStrategicProjects.length > 0) && (
        <TabbedListCard<DashboardProject>
          title={t('dashboard.sections.projectsHub', 'Projects')}
          tabs={[
            {
              key: 'strategic',
              label: t('dashboard.sections.projects', 'Strategic Projects'),
              count: strategicProjects.length,
              data: strategicProjects,
            },
            {
              key: 'nonStrategic',
              label: t('dashboard.sections.nonStrategicProjects', 'Non-Strategic Projects'),
              count: nonStrategicProjects.length,
              data: nonStrategicProjects,
            },
          ]}
          pageSize={8}
          keyExtractor={(p) => `proj-${p.id}`}
          renderRow={(p) => <ProjectRow project={p} />}
        />
      )}

      {/* KPI Objectives */}
      {kpiObjectives.length > 0 && (
        <SectionCard title={t('dashboard.sections.kpiObjectives', 'KPI Objectives')}>
          {kpiObjectives.map((o) => (
            <KpiObjectiveRow key={o.id} objective={o} />
          ))}
        </SectionCard>
      )}

      {/* Statistical Production Performance */}
      {!hideOrgWide && (stat || sv) && (
        <SectionCard title={t('dashboard.sections.statistical', 'Statistical Production Performance')}>
          <View style={styles.tilesRow}>
            <KpiTile
              icon="📚"
              label={t('dashboard.stat.publications', 'Publications')}
              value={fmtPct(stat?.performance, 0)}
              foot={`${stat?.totalCount ?? 0} ${t('dashboard.stat.total', 'total')}`}
              tint={colors.primary}
            />
            <KpiTile
              icon="📊"
              label={t('dashboard.stat.svProduction', 'Statistical Vars')}
              value={fmtPct(sv?.statisticalVarsPerformance, 0)}
              foot={`${sv?.statisticalVarsTotal ?? 0} ${t('dashboard.stat.total', 'total')}`}
              tint={colors.success}
            />
            <KpiTile
              icon="🌍"
              label={t('dashboard.stat.opos', 'OPOS')}
              value={fmtPct(sv?.oposPerformance, 0)}
              foot={`${sv?.oposTotal ?? 0} ${t('dashboard.stat.total', 'total')}`}
              tint={colors.warning}
            />
          </View>
        </SectionCard>
      )}

      {/* Operational Performance — sectors */}
      {ops.length > 0 && (
        <SectionCard
          title={
            scopeFilterActive
              ? t('dashboard.sections.operationalScoped', 'Your sectors')
              : t('dashboard.sections.operational', 'Operational Performance')
          }
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opScroll}>
            {ops.map((s) => (
              <OperationalSectorTile key={s.sectorId} sector={s} />
            ))}
          </ScrollView>
        </SectionCard>
      )}

      {/* CRM Services */}
      {!hideOrgWide && crm.length > 0 && (
        <SectionCard title={t('dashboard.sections.crm', 'CRM Services')}>
          {crm.slice(0, 6).map((s) => (
            <CrmServiceRow key={s.id} svc={s} />
          ))}
        </SectionCard>
      )}

      {/* Governance — Audits, Observations & Action Plans */}
      {!hideOrgWide && gov && (
        <SectionCard title={t('dashboard.sections.governance', 'Governance')}>
          <View style={styles.govRow}>
            <BigStat icon="🛡️" label={t('dashboard.gov.audits', 'Audits')} value={gov.totalAudits} tint={colors.primary} />
            <BigStat icon="🔍" label={t('dashboard.gov.observations', 'Observations')} value={gov.observationsTotal} tint={colors.warning} />
            <BigStat icon="✅" label={t('dashboard.gov.actionPlans', 'Action Plans')} value={gov.actionPlansTotal} tint={colors.success} />
          </View>
          {gov.auditsByType.length > 0 && (
            <View style={[styles.auditList, { borderTopColor: colors.divider }]}>
              {gov.auditsByType.map((a) => (
                <View key={a.auditTypeID} style={styles.auditRow}>
                  <Text style={[styles.auditDot, { color: colors.primary }]}>●</Text>
                  <Text style={[styles.auditName, { color: colors.text }]} numberOfLines={1}>{a.auditTypeName}</Text>
                  <Text style={[styles.auditCount, { color: colors.textMuted }]}>{a.auditsCount}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      )}

      {/* Risks */}
      {!hideOrgWide && gov?.risks && gov.risks.count > 0 && (
        <SectionCard title={t('dashboard.sections.risks', 'Risks')}>
          <View style={[styles.riskHeader, { backgroundColor: `${colors.danger}15` }]}>
            <Text style={[styles.riskBig, { color: colors.danger }]}>{gov.risks.count}</Text>
            <Text style={[styles.riskBigLabel, { color: colors.text }]}>
              {t('dashboard.risk.totalRisks', 'Total identified risks')}
            </Text>
          </View>
          <RiskBar label={t('dashboard.risk.noMajor', 'No Major')} value={gov.risks.noMajor} total={gov.risks.count} color={colors.success} trackColor={colors.greyCard} textColor={colors.text} />
          <RiskBar label={t('dashboard.risk.periodic', 'Periodic Monitoring')} value={gov.risks.periodicMonitoring} total={gov.risks.count} color={colors.primary} trackColor={colors.greyCard} textColor={colors.text} />
          <RiskBar label={t('dashboard.risk.continuous', 'Continuous Review')} value={gov.risks.continousReview} total={gov.risks.count} color={colors.warning} trackColor={colors.greyCard} textColor={colors.text} />
          <RiskBar label={t('dashboard.risk.active', 'Active Management')} value={gov.risks.activeManagement} total={gov.risks.count} color={colors.danger} trackColor={colors.greyCard} textColor={colors.text} />
        </SectionCard>
      )}

      {/* Finance chapters */}
      {!hideOrgWide && finance.length > 0 && (
        <SectionCard title={t('dashboard.sections.finance', 'Budget by Chapter')}>
          {finance.map((c) => (
            <FinanceChapterRow key={c.chapterId} chapter={c} />
          ))}
        </SectionCard>
      )}

      {/* Strategic Budget + Cash Flow Projects with tabs + paging */}
      {!hideOrgWide && (strategicBudgetProjects.length > 0 || cashFlowProjects.length > 0) && (
        <TabbedListCard<DashboardFinanceProject>
          title={t('dashboard.sections.budgetProjects', 'Budget Projects')}
          tabs={[
            {
              key: 'strategicBudget',
              label: t('dashboard.sections.strategicBudget', 'Strategic Budget'),
              count: strategicBudgetProjects.length,
              data: strategicBudgetProjects,
            },
            {
              key: 'cashFlow',
              label: t('dashboard.sections.cashFlow', 'Cash Flow'),
              count: cashFlowProjects.length,
              data: cashFlowProjects,
            },
          ]}
          pageSize={8}
          keyExtractor={(p) => `bp-${p.cashFlowId}`}
          renderRow={(p) => <FinanceProjectRow project={p} />}
        />
      )}

      {/* Operational Plan deliverables (paginated) */}
      {deliverables.length > 0 && (
        <TabbedListCard<DashboardDeliverable>
          title={t('dashboard.sections.deliverables', 'Operational Plan')}
          tabs={[
            {
              key: 'all',
              label: t('dashboard.sections.allDeliverables', 'All Deliverables'),
              count: deliverables.length,
              data: deliverables,
            },
          ]}
          pageSize={8}
          keyExtractor={(d) => `dlv-${d.id}`}
          renderRow={(d) => <DeliverableRow deliverable={d} />}
        />
      )}

      {/* Year picker modal */}
      <Modal visible={yearOpen} transparent animationType="fade" onRequestClose={() => setYearOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setYearOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('dashboard.year', 'Year')}</Text>
            <FlatList
              data={yearOptions}
              keyExtractor={(it) => String(it)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setYear(item); setYearOpen(false); }}
                  style={[styles.modalRow, item === year && { backgroundColor: colors.primaryLight }]}
                >
                  <Text style={[styles.modalRowText, { color: item === year ? colors.primary : colors.text }]}>
                    {item}
                  </Text>
                  {item === year && <Text style={[styles.modalCheck, { color: colors.primary }]}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
    );
    })()
      )}
    </QueryStates>
  );
};

// ── Subcomponents ───────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const { colors, shadows } = useTheme();
  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
};

const DonutCell: React.FC<{ label: string; value: number; color: string; trackColor: string; bg: string; textColor: string }> = ({ label, value, color, trackColor, bg, textColor }) => {
  return (
    <View style={styles.donutCell}>
      <Donut
        value={value}
        size={108}
        thickness={12}
        color={color}
        trackColor={trackColor}
        bg={bg}
        textColor={textColor}
      />
      <Text style={[styles.donutLabel, { color: textColor }]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

const BudgetCard: React.FC<{
  title: string;
  approved: number;
  planned: number;
  consumed: number;
  variance: number;
  tint: string;
}> = ({ title, approved, planned, consumed, variance, tint }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const consumedPct = planned === 0 ? 0 : Math.min(100, (consumed / planned) * 100);
  const varTint = variance >= 0 ? colors.success : colors.danger;
  return (
    <View style={[styles.budgetCard, { backgroundColor: `${tint}10`, borderColor: `${tint}30` }]}>
      <View style={styles.budgetCardHeader}>
        <Text style={[styles.budgetCardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.budgetCardVariance, { color: varTint }]}>
          {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
        </Text>
      </View>
      <View style={[styles.budgetTrack, { backgroundColor: colors.greyCard }]}>
        <View style={[styles.budgetFill, { width: `${consumedPct}%`, backgroundColor: tint }]} />
      </View>
      <View style={styles.budgetGrid}>
        <View style={styles.budgetGridCell}>
          <Text style={[styles.budgetGridLabel, { color: colors.textMuted }]}>{t('dashboard.fin.approved', 'Approved')}</Text>
          <Text style={[styles.budgetGridValue, { color: colors.text }]}>{fmtMoney(approved)}</Text>
        </View>
        <View style={styles.budgetGridCell}>
          <Text style={[styles.budgetGridLabel, { color: colors.textMuted }]}>{t('dashboard.fin.planned', 'Planned')}</Text>
          <Text style={[styles.budgetGridValue, { color: colors.text }]}>{fmtMoney(planned)}</Text>
        </View>
        <View style={styles.budgetGridCell}>
          <Text style={[styles.budgetGridLabel, { color: colors.textMuted }]}>{t('dashboard.fin.consumed', 'Consumed')}</Text>
          <Text style={[styles.budgetGridValue, { color: tint }]}>{fmtMoney(consumed)}</Text>
        </View>
      </View>
    </View>
  );
};

const KpiTile: React.FC<{ icon: string; label: string; value: string; foot: string; tint: string }> = ({ icon, label, value, foot, tint }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.kpiTile, { backgroundColor: `${tint}15`, borderColor: `${tint}30` }]}>
      <Text style={styles.kpiIcon}>{icon}</Text>
      <Text style={[styles.kpiValue, { color: tint }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.kpiFoot, { color: colors.textMuted }]} numberOfLines={1}>{foot}</Text>
    </View>
  );
};

const OperationalSectorTile: React.FC<{ sector: DashboardOperationalSector }> = ({ sector }) => {
  const { colors } = useTheme();
  const perf = sector.overallPerformance;
  const tint = perf >= 70 ? colors.success : perf >= 40 ? colors.warning : colors.danger;
  return (
    <View style={[styles.opTile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
      <Text style={[styles.opName, { color: colors.text }]} numberOfLines={2}>{sector.sectorName}</Text>
      <Text style={[styles.opPerf, { color: tint }]}>{fmtPct(perf, 2)}</Text>
      <View style={[styles.opMetaRow, { borderTopColor: colors.divider }]}>
        <View style={styles.opMetaCell}>
          <Text style={[styles.opMetaValue, { color: colors.text }]}>{sector.initiativesCount ?? 0}</Text>
          <Text style={[styles.opMetaLabel, { color: colors.textMuted }]}>Initiatives</Text>
        </View>
        <View style={[styles.opMetaDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.opMetaCell}>
          <Text style={[styles.opMetaValue, { color: colors.text }]}>{sector.subServicesCount ?? 0}</Text>
          <Text style={[styles.opMetaLabel, { color: colors.textMuted }]}>Sub-Services</Text>
        </View>
      </View>
    </View>
  );
};

const ProjectRow: React.FC<{ project: DashboardProject }> = ({ project }) => {
  const { colors } = useTheme();
  const perf = project.performance ?? project.relativeCompletion;
  const tint = perf >= 70 ? colors.success : perf >= 40 ? colors.warning : colors.danger;
  return (
    <View style={[styles.compactRow, { borderBottomColor: colors.divider }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>{project.name}</Text>
        <View style={styles.compactMetaLine}>
          <Text style={[styles.compactMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {project.sector}{project.manager ? ` · ${project.manager}` : ''}
          </Text>
        </View>
        <View style={[styles.compactTrack, { backgroundColor: colors.greyCard }]}>
          <View style={[styles.compactFill, { width: `${Math.max(0, Math.min(100, perf))}%`, backgroundColor: tint }]} />
        </View>
      </View>
      <View style={[styles.compactPerfPill, { backgroundColor: `${tint}18`, borderColor: `${tint}40` }]}>
        <Text style={[styles.compactPerfText, { color: tint }]}>{fmtPct(perf, 0)}</Text>
      </View>
    </View>
  );
};

const KpiObjectiveRow: React.FC<{ objective: DashboardKpiObjective }> = ({ objective }) => {
  const { colors } = useTheme();
  const perf = objective.averagePerformance ?? 0;
  const tint = perf >= 70 ? colors.success : perf >= 40 ? colors.warning : colors.danger;
  return (
    <View style={[styles.kpiObjRow, { borderBottomColor: colors.divider }]}>
      <View style={[styles.kpiObjOrder, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.kpiObjOrderText, { color: colors.primary }]}>{objective.order || '•'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.kpiObjName, { color: colors.text }]} numberOfLines={2}>{objective.name}</Text>
        <Text style={[styles.kpiObjMeta, { color: colors.textMuted }]}>
          {objective.kpiCount} KPIs
        </Text>
      </View>
      <Text style={[styles.kpiObjPerf, { color: tint }]}>{fmtPct(perf, 0)}</Text>
    </View>
  );
};

const CrmServiceRow: React.FC<{ svc: DashboardCRMService }> = ({ svc }) => {
  const { colors } = useTheme();
  const onTimePct = svc.onTimePercentage;
  return (
    <View style={[styles.crmRow, { borderBottomColor: colors.divider }]}>
      <Text style={[styles.crmName, { color: colors.text }]} numberOfLines={2}>{svc.name}</Text>
      <View style={styles.crmStatsRow}>
        <CrmChip label="In progress" value={svc.inProgressCount} tint={colors.primary} />
        <CrmChip label="Closed" value={svc.closedCount} tint={colors.success} />
        <CrmChip label="Delayed" value={svc.delayedCount} tint={colors.danger} />
      </View>
      <View style={[styles.crmTrack, { backgroundColor: colors.greyCard }]}>
        <View style={[styles.crmFill, { width: `${onTimePct}%`, backgroundColor: colors.success }]} />
      </View>
      <Text style={[styles.crmFoot, { color: colors.textMuted }]}>
        {fmtPct(onTimePct, 0)} on time · {svc.totalCount} total
      </Text>
    </View>
  );
};

const CrmChip: React.FC<{ label: string; value: number; tint: string }> = ({ label, value, tint }) => (
  <View style={[styles.crmChip, { backgroundColor: `${tint}18` }]}>
    <Text style={[styles.crmChipValue, { color: tint }]}>{value}</Text>
    <Text style={[styles.crmChipLabel, { color: tint }]}>{label}</Text>
  </View>
);

const BigStat: React.FC<{ icon: string; label: string; value: number; tint: string }> = ({ icon, label, value, tint }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.bigStat, { backgroundColor: `${tint}10`, borderColor: `${tint}30` }]}>
      <Text style={styles.bigStatIcon}>{icon}</Text>
      <Text style={[styles.bigStatValue, { color: tint }]}>{value}</Text>
      <Text style={[styles.bigStatLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

const RiskBar: React.FC<{ label: string; value: number; total: number; color: string; trackColor: string; textColor: string }> = ({ label, value, total, color, trackColor, textColor }) => {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <ProgressBar
      label={label}
      value={pct}
      display={`${value} (${pct.toFixed(0)}%)`}
      color={color}
      trackColor={trackColor}
      textColor={textColor}
    />
  );
};

const FinanceChapterRow: React.FC<{ chapter: DashboardFinanceChapter }> = ({ chapter }) => {
  const { colors } = useTheme();
  const consumedPct = chapter.plannedBudget === 0 ? 0 : (chapter.actualExpenditure / chapter.plannedBudget) * 100;
  const variance = chapter.variancePct;
  const varTint = variance >= 0 ? colors.success : colors.danger;
  return (
    <View style={[styles.finRow, { borderBottomColor: colors.divider }]}>
      <View style={styles.finHeader}>
        <Text style={[styles.finName, { color: colors.text }]} numberOfLines={2}>{chapter.name}</Text>
        <Text style={[styles.finVariance, { color: varTint }]}>{variance.toFixed(1)}%</Text>
      </View>
      <View style={[styles.finTrack, { backgroundColor: colors.greyCard }]}>
        <View style={[styles.finFill, { width: `${Math.min(100, consumedPct)}%`, backgroundColor: colors.primary }]} />
      </View>
      <View style={styles.finFootRow}>
        <Text style={[styles.finFoot, { color: colors.textMuted }]}>
          Planned {fmtMoney(chapter.plannedBudget)}
        </Text>
        <Text style={[styles.finFoot, { color: colors.textMuted }]}>
          Actual {fmtMoney(chapter.actualExpenditure)}
        </Text>
      </View>
    </View>
  );
};

const FinanceProjectRow: React.FC<{ project: DashboardFinanceProject }> = ({ project }) => {
  const { colors } = useTheme();
  const perf = project.performance;
  const tint = perf >= 70 ? colors.success : perf >= 40 ? colors.warning : colors.danger;
  const consumedPct = project.approveBudget === 0
    ? 0
    : (project.paidBudget / project.approveBudget) * 100;
  return (
    <View style={[styles.compactRow, { borderBottomColor: colors.divider }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
          {project.projectName || project.accountName}
        </Text>
        <Text style={[styles.compactMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {fmtMoney(project.paidBudget)} / {fmtMoney(project.approveBudget)}
          {project.managerName ? ` · ${project.managerName}` : ''}
        </Text>
        <View style={[styles.compactTrack, { backgroundColor: colors.greyCard }]}>
          <View style={[styles.compactFill, { width: `${Math.max(0, Math.min(100, consumedPct))}%`, backgroundColor: tint }]} />
        </View>
      </View>
      <View style={[styles.compactPerfPill, { backgroundColor: `${tint}18`, borderColor: `${tint}40` }]}>
        <Text style={[styles.compactPerfText, { color: tint }]}>{fmtPct(perf, 0)}</Text>
      </View>
    </View>
  );
};

const DeliverableRow: React.FC<{ deliverable: DashboardDeliverable }> = ({ deliverable }) => {
  const { colors } = useTheme();
  const perf = deliverable.deliverableCompletion;
  const tint = perf >= 70 ? colors.success : perf >= 40 ? colors.warning : colors.danger;
  return (
    <View style={[styles.compactRow, { borderBottomColor: colors.divider }]}>
      <View style={[styles.compactBadge, { backgroundColor: deliverable.isApproved ? `${colors.success}18` : `${colors.warning}18` }]}>
        <Text style={[styles.compactBadgeText, { color: deliverable.isApproved ? colors.success : colors.warning }]}>
          {deliverable.isApproved ? '✓' : '◷'}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>{deliverable.deliverableName}</Text>
        <Text style={[styles.compactMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {deliverable.projectName}{deliverable.sectorName ? ` · ${deliverable.sectorName}` : ''}
        </Text>
        <View style={[styles.compactTrack, { backgroundColor: colors.greyCard }]}>
          <View style={[styles.compactFill, { width: `${Math.max(0, Math.min(100, perf))}%`, backgroundColor: tint }]} />
        </View>
      </View>
      <View style={[styles.compactPerfPill, { backgroundColor: `${tint}18`, borderColor: `${tint}40` }]}>
        <Text style={[styles.compactPerfText, { color: tint }]}>{fmtPct(perf, 0)}</Text>
      </View>
    </View>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 24 },
  retryText: { fontWeight: '700' },

  hero: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 48,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start' },
  heroEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  heroSubtitle: { fontSize: 12, lineHeight: 16 },
  heroScopeChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  heroScopeText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.4 },
  yearChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    marginStart: 8,
  },
  yearChipLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.9 },
  yearChipValue: { fontSize: 14, fontWeight: '800', marginTop: 1 },

  card: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  subSectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },

  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  donutCell: { alignItems: 'center', flex: 1 },
  donutLabel: { fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' },

  statRow: {
    flexDirection: 'row',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 },

  // KPI tiles row
  tilesRow: { flexDirection: 'row' },
  kpiTile: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiIcon: { fontSize: 22, marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 12, fontWeight: '600' },
  kpiFoot: { fontSize: 11, marginTop: 2 },

  // Operational sector tiles
  opScroll: { paddingVertical: 4 },
  opTile: {
    width: 150,
    marginEnd: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  opName: { fontSize: 13, fontWeight: '700', minHeight: 36 },
  opPerf: { fontSize: 22, fontWeight: '800', marginVertical: 6 },
  opMetaRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  opMetaCell: { flex: 1, alignItems: 'center' },
  opMetaValue: { fontSize: 14, fontWeight: '700' },
  opMetaLabel: { fontSize: 10, marginTop: 2 },
  opMetaDivider: { width: StyleSheet.hairlineWidth },


  // KPI objectives
  kpiObjRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  kpiObjOrder: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginEnd: 10 },
  kpiObjOrderText: { fontWeight: '800' },
  kpiObjName: { fontSize: 13, fontWeight: '700' },
  kpiObjMeta: { fontSize: 11, marginTop: 2 },
  kpiObjPerf: { fontSize: 14, fontWeight: '800', marginStart: 8 },

  // CRM
  crmRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  crmName: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  crmStatsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  crmChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginEnd: 6, marginBottom: 4 },
  crmChipValue: { fontWeight: '800', marginEnd: 4 },
  crmChipLabel: { fontSize: 11, fontWeight: '600' },
  crmTrack: { height: 6, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  crmFill: { height: '100%' },
  crmFoot: { fontSize: 11, marginTop: 4 },

  // Governance
  govRow: { flexDirection: 'row' },
  bigStat: {
    flex: 1,
    margin: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  bigStatIcon: { fontSize: 22 },
  bigStatValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  bigStatLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  auditList: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 8 },
  auditRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  auditDot: { fontSize: 14, marginEnd: 8 },
  auditName: { flex: 1, fontSize: 13, fontWeight: '600' },
  auditCount: { fontSize: 13, fontWeight: '700' },

  // Risks
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  riskBig: { fontSize: 30, fontWeight: '800', marginEnd: 12 },
  riskBigLabel: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Finance chapters
  finRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  finHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  finName: { fontSize: 13, fontWeight: '700', flex: 1, marginEnd: 8 },
  finVariance: { fontSize: 14, fontWeight: '800' },
  finTrack: { height: 8, borderRadius: 6, overflow: 'hidden' },
  finFill: { height: '100%' },
  finFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  finFoot: { fontSize: 11 },

  // Compact list rows (used by Projects / Finance Projects / Deliverables)
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compactName: { fontSize: 13, fontWeight: '700' },
  compactMetaLine: { flexDirection: 'row', alignItems: 'center' },
  compactMeta: { fontSize: 11, marginTop: 1, marginBottom: 5 },
  compactTrack: { height: 4, borderRadius: 3, overflow: 'hidden' },
  compactFill: { height: '100%', borderRadius: 3 },
  compactPerfPill: {
    minWidth: 50,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginStart: 8,
  },
  compactPerfText: { fontSize: 12, fontWeight: '800' },
  compactBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 8,
  },
  compactBadgeText: { fontSize: 13, fontWeight: '800' },

  // Common KPI row
  commonKpiText: { fontSize: 13 },

  // Financial header
  finHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  finAsOf: { fontSize: 11, fontWeight: '600' },

  // Vital performance hero
  vitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  vitalLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  vitalValue: { fontSize: 30, fontWeight: '800', marginTop: 4 },
  vitalFoot: { fontSize: 12, marginTop: 4 },
  vitalDonutWrap: { width: 90, alignItems: 'center' },

  // Budget split (Strategic / Operational)
  budgetSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  budgetCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  budgetCardTitle: { fontSize: 13, fontWeight: '800' },
  budgetCardVariance: { fontSize: 13, fontWeight: '800' },
  budgetTrack: { height: 8, borderRadius: 6, overflow: 'hidden', marginBottom: 10 },
  budgetFill: { height: '100%' },
  budgetGrid: { flexDirection: 'column' },
  budgetGridCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  budgetGridLabel: { fontSize: 11 },
  budgetGridValue: { fontSize: 13, fontWeight: '800' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10 },
  modalRowText: { fontSize: 16, fontWeight: '600' },
  modalCheck: { fontSize: 18, fontWeight: '800' },
});

export default ExecutiveDashboardScreen;
