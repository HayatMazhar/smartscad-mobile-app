import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * A scalable workflow visualiser that reads the same whether you hand it
 * 3 steps (leave application) or 15 steps (ticket workflow).
 *
 * Step shape — only `id`, `name`, and `stepOrder` are required. Everything
 * else is optional and simply passed through from the caller so you can map
 * the shape from any backend contract without having to rename fields.
 */
export interface WorkflowStep {
  id?: number | string;
  name: string;
  stepOrder?: number;
  // Extra fields are ignored by the component but kept in the type so callers
  // stay loosely typed.
  [key: string]: any;
}

interface Props {
  steps: WorkflowStep[];
  /** Either the step's id, or the step's stepOrder — we try id first. */
  currentStepId?: number | string;
  currentStepOrder?: number;
  colors: any;
  shadows: any;
  /** Override the section header title. Defaults to "WORKFLOW PROGRESS". */
  title?: string;
  /**
   * When true, every step is rendered as completed (✓) and there is no
   * "current" step. This mirrors the web TicketWorkflow.cshtml rule
   *   isSuccess = ... || Model.ClosedDate.HasValue
   * so that a closed/approved ticket or leave shows all steps as done.
   * When set, `currentStepId` / `currentStepOrder` are ignored for past/current
   * highlighting (but still used to scroll the active chip into view if any).
   */
  isComplete?: boolean;
  /**
   * Step order (1-based) at which the workflow was cancelled / rejected. Steps
   * before this order are rendered as green ticks (success), the step itself
   * and every subsequent step are rendered with the danger colour (✗), mirroring
   * the web TicketWorkflow.cshtml rule
   *   isCancel = Model.ClosingWorkflowStepID.HasValue
   *           && wf.StepOrder >= Model.ClosingWorkflow.StepOrder
   * Ignored when `isComplete` is true (a successful close wins).
   */
  cancelledAtStepOrder?: number;
  /**
   * When true, the component is rendered without its own card chrome (no
   * outer card background, no horizontal margin, no shadow). Use this when
   * embedding the workflow inside another card so it doesn't double-card.
   */
  compact?: boolean;
}

const CHIP_W = 116;
const CHIP_GAP = 6;

const WorkflowProgress: React.FC<Props> = ({
  steps,
  currentStepId,
  currentStepOrder,
  colors,
  shadows,
  title = 'WORKFLOW PROGRESS',
  isComplete = false,
  cancelledAtStepOrder,
  compact = false,
}) => {
  const scrollRef = useRef<ScrollView | null>(null);

  // The "cancelled" mode wins only when there's no successful close — a
  // ticket that was somehow both rejected AND fully closed-success is shown
  // as success (matches web TicketWorkflow.cshtml: `isSuccess = !isCancel && (...)`,
  // so success requires NOT cancelled, but `isComplete` being true here means
  // the caller has already validated this was a successful close).
  const isCancelMode = !isComplete
    && cancelledAtStepOrder != null
    && cancelledAtStepOrder > 0;

  const { currentIdx, activeStep, completedCount, pct } = useMemo(() => {
    // When the workflow is fully complete we don't highlight a "current" step
    // — every dot must be a green tick (matches web Edit.cshtml when
    // Model.ClosedDate.HasValue).
    if (isComplete) {
      return {
        currentIdx: -1,
        activeStep: null as WorkflowStep | null,
        completedCount: steps.length,
        pct: 100,
      };
    }
    if (isCancelMode) {
      // Steps before the cancellation point count as completed; the rest are
      // shown as cancelled. We deliberately do NOT highlight a "current" step
      // because the workflow has terminated.
      const done = steps.filter(
        (s) => (s.stepOrder ?? 0) < (cancelledAtStepOrder as number),
      ).length;
      return {
        currentIdx: -1,
        activeStep: null as WorkflowStep | null,
        completedCount: done,
        pct: steps.length > 0 ? Math.round((done / steps.length) * 100) : 0,
      };
    }
    const idx = steps.findIndex((s) => s.id != null && s.id === currentStepId);
    const fallbackIdx = currentStepOrder != null
      ? steps.findIndex((s) => s.stepOrder === currentStepOrder)
      : -1;
    const ci = idx >= 0 ? idx : fallbackIdx;
    const done = steps.filter(
      (s) => (s.stepOrder ?? 0) < (currentStepOrder ?? Number.POSITIVE_INFINITY),
    ).length;
    return {
      currentIdx: ci,
      activeStep: ci >= 0 ? steps[ci] : null,
      completedCount: done,
      pct: steps.length > 0 ? Math.round((done / steps.length) * 100) : 0,
    };
  }, [steps, currentStepId, currentStepOrder, isComplete, isCancelMode, cancelledAtStepOrder]);

  useEffect(() => {
    if (currentIdx < 0) return;
    const t = setTimeout(() => {
      const target = Math.max(0, (currentIdx - 1) * (CHIP_W + CHIP_GAP));
      scrollRef.current?.scrollTo({ x: target, animated: true });
    }, 250);
    return () => clearTimeout(t);
  }, [currentIdx]);

  if (!steps.length) return null;

  return (
    <View
      style={
        compact
          ? styles.progressCardCompact
          : [styles.progressCard, shadows?.card, { backgroundColor: colors.card }]
      }
    >
      {!compact && (
      <View style={styles.progressHeader}>
        <Text style={[styles.progressTitle, { color: colors.textSecondary }]}>{title}</Text>
        <View
          style={[
            styles.progressCountPill,
            {
              backgroundColor: isComplete
                ? `${colors.success}22`
                : isCancelMode
                  ? `${colors.danger}22`
                  : colors.primaryLight,
            },
          ]}
        >
          <Text
            style={[
              styles.progressCountText,
              {
                color: isComplete
                  ? colors.success
                  : isCancelMode
                    ? colors.danger
                    : colors.primary,
              },
            ]}
          >
            {isComplete
              ? `Completed · ${steps.length} of ${steps.length}`
              : isCancelMode
                ? `Stopped at step ${cancelledAtStepOrder} of ${steps.length}`
                : currentIdx >= 0
                  ? `Step ${currentIdx + 1} of ${steps.length}`
                  : `${steps.length} steps`}
          </Text>
        </View>
      </View>
      )}

      {compact && (currentIdx >= 0 || isComplete || isCancelMode) && (
        <View style={styles.compactStatusRow}>
          <Text style={[styles.compactStatusText, { color: colors.textSecondary }]}>
            {isComplete
              ? `Completed · ${steps.length} of ${steps.length}`
              : isCancelMode
                ? `Stopped at step ${cancelledAtStepOrder} of ${steps.length}`
                : currentIdx >= 0
                  ? `Step ${currentIdx + 1} of ${steps.length}`
                  : ''}
          </Text>
        </View>
      )}

      {activeStep ? (
        <Text
          style={[
            styles.progressCurrentLabel,
            { color: colors.text },
            compact && { fontSize: 13, marginBottom: 6 },
          ]}
          numberOfLines={2}
        >
          <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Current: </Text>
          {activeStep.name}
        </Text>
      ) : null}

      <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${pct}%` as any,
              backgroundColor: isCancelMode ? colors.danger : colors.primary,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.progressPctText,
          { color: colors.textMuted },
          compact && { marginBottom: 8 },
        ]}
      >
        {completedCount} of {steps.length} completed ({pct}%)
      </Text>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 4 }}
      >
        {steps.map((step, i) => {
          // Cancelled mode mirrors web TicketWorkflow.cshtml `isCancel`:
          // any step at or after the closing step is the "cancel" colour.
          const isCancelled =
            isCancelMode && (step.stepOrder ?? i + 1) >= (cancelledAtStepOrder as number);
          const isCurrent = !isComplete && !isCancelMode && i === currentIdx;
          const isPast =
            !isCancelled && (
              isComplete ||
              (isCancelMode && (step.stepOrder ?? i + 1) < (cancelledAtStepOrder as number)) ||
              i < currentIdx ||
              (currentIdx < 0
                && !isCancelMode
                && (step.stepOrder ?? 0) < (currentStepOrder ?? Number.POSITIVE_INFINITY))
            );
          const dotColor = isCancelled
            ? colors.danger
            : isPast
              ? '#00C800'
              : isCurrent
                ? colors.primary
                : colors.border;
          const labelColor = isCancelled
            ? colors.danger
            : isCurrent
              ? colors.primary
              : isPast
                ? colors.text
                : colors.textMuted;
          // Connecting line colours: left line links to previous step,
          // right line links to next step. We treat a connector as "done"
          // only when both ends are completed, and red when the next dot
          // is in the cancelled region.
          const prevCancelled =
            isCancelMode && i > 0
              && ((steps[i - 1].stepOrder ?? i) >= (cancelledAtStepOrder as number));
          const nextCancelled =
            isCancelMode && i < steps.length - 1
              && ((steps[i + 1].stepOrder ?? i + 2) >= (cancelledAtStepOrder as number));
          return (
            <View key={step.id ?? i} style={[styles.wfChip, { width: CHIP_W }]}>
              <View style={styles.wfLineWrap}>
                <View
                  style={[
                    styles.wfLineLeft,
                    {
                      backgroundColor: i === 0
                        ? 'transparent'
                        : isCancelled || prevCancelled
                          ? colors.danger
                          : (isPast || isCurrent)
                            ? '#00C800'
                            : colors.border,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.wfDot,
                    {
                      backgroundColor: dotColor,
                      borderColor: isCurrent
                        ? colors.primary
                        : isCancelled
                          ? colors.danger
                          : 'transparent',
                    },
                  ]}
                >
                  {isCancelled && <Text style={styles.wfDotTick}>✕</Text>}
                  {!isCancelled && isPast && <Text style={styles.wfDotTick}>✓</Text>}
                  {!isCancelled && isCurrent && <Text style={styles.wfDotNum}>{i + 1}</Text>}
                  {!isCancelled && !isPast && !isCurrent && (
                    <Text style={[styles.wfDotNum, { color: colors.textMuted }]}>{i + 1}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.wfLineRight,
                    {
                      backgroundColor: i === steps.length - 1
                        ? 'transparent'
                        : nextCancelled || isCancelled
                          ? colors.danger
                          : isPast
                            ? '#00C800'
                            : colors.border,
                    },
                  ]}
                />
              </View>
              <Text
                numberOfLines={3}
                ellipsizeMode="tail"
                style={[
                  styles.wfLabel,
                  {
                    color: labelColor,
                    fontWeight: isCurrent || isCancelled ? '800' : isPast ? '600' : '500',
                  },
                ]}
              >
                {step.name}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  progressCard:        { marginHorizontal: 16, marginTop: -12, borderRadius: 14, padding: 14 },
  progressCardCompact: { padding: 0 },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  progressCountPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  progressCountText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  compactStatusRow:  { marginBottom: 6 },
  compactStatusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  progressCurrentLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressPctText: { fontSize: 11, fontWeight: '600', marginTop: 6, marginBottom: 10 },

  wfChip: { alignItems: 'center', marginRight: CHIP_GAP },
  wfLineWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 28 },
  wfLineLeft: { flex: 1, height: 2 },
  wfLineRight: { flex: 1, height: 2 },
  wfDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  wfDotTick: { color: '#fff', fontSize: 14, fontWeight: '900' },
  wfDotNum:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  wfLabel:   { fontSize: 11, textAlign: 'center', lineHeight: 14, marginTop: 6, paddingHorizontal: 4 },
});

export default WorkflowProgress;
