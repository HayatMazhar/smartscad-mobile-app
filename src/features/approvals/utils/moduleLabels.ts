import type { TFunction } from 'i18next';

/** Server-side module codes (no underscores in user-facing copy). */
export const MODULE_CODE_KEYS: Record<string, string> = {
  LEAVE: 'approvals.module.leave',
  SANADKOM_TICKET: 'approvals.module.sanadkom',
  STANDALONE_TASK: 'approvals.module.task',
  EPM_DELIVERABLE: 'approvals.module.epm',
  EPM_MILESTONE: 'approvals.module.epmMilestone',
  EPM_TASK: 'approvals.module.epmTask',
  PMS_KPI: 'approvals.module.kpi',
  PMS_OBJECTIVE: 'approvals.module.objective',
  IBDAA_IDEA: 'approvals.module.innovation',
  SCAD_STAR: 'approvals.module.scadStar',
  APPRAISAL: 'approvals.module.appraisal',
  SURVEY: 'approvals.module.survey',
  BI_SURVEY: 'approvals.module.biSurvey',
  OTHER: 'approvals.module.other',
};

const FALLBACK: Record<string, string> = {
  LEAVE: 'Leave',
  SANADKOM_TICKET: 'Sanadkom',
  STANDALONE_TASK: 'Task',
  EPM_DELIVERABLE: 'Deliverable',
  EPM_MILESTONE: 'EPM Milestone',
  EPM_TASK: 'EPM Task',
  PMS_KPI: 'KPIs',
  PMS_OBJECTIVE: 'Objectives',
  IBDAA_IDEA: 'Innovation',
  SCAD_STAR: 'SCAD Star',
  APPRAISAL: 'Appraisal',
  SURVEY: 'Survey',
  BI_SURVEY: 'BI Survey',
  OTHER: 'Other',
};

export function getModuleDisplayName(t: TFunction, code: string | undefined | null): string {
  const c = (code ?? '').toUpperCase();
  if (MODULE_CODE_KEYS[c]) {
    return t(MODULE_CODE_KEYS[c], { defaultValue: FALLBACK[c] });
  }
  const pretty = c.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
  return t('approvals.module.generic', { n: pretty, defaultValue: pretty });
}

/** Icon for the "All types" filter chip on the approvals inbox. */
export const ALL_APPROVAL_TYPES_ICON = '📬';

export function moduleIcon(code: string | undefined | null): string {
  const c = (code ?? '').toUpperCase();
  const map: Record<string, string> = {
    LEAVE: '🗓️',
    SANADKOM_TICKET: '🎫',
    STANDALONE_TASK: '📋',
    EPM_DELIVERABLE: '🏗️',
    EPM_MILESTONE: '🏁',
    EPM_TASK: '✅',
    PMS_KPI: '📊',
    PMS_OBJECTIVE: '🎯',
    IBDAA_IDEA: '💡',
    SCAD_STAR: '⭐',
    APPRAISAL: '📝',
    SURVEY: '📨',
    BI_SURVEY: '📊',
    OTHER: '📌',
  };
  return map[c] ?? '📋';
}
