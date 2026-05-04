/**
 * LeaveType enum values (SmartScadBLL.Constants.Enums.LeaveType) — must match SMARTSCAD_BETA.dbo.LeaveType.
 * Used for same-day time window, machine error, remote-work category, and auto end-date rules.
 */
export const LT = {
  Annual: 1,
  Short: 2,
  Sick: 3,
  OfficialMission: 4,
  OfficialMissionLeave: 5,
  AttendanceMachineError: 6,
  STITraining: 7,
  HospitalAppointment: 8,
  Marriage: 9,
  Unpaid: 10,
  ShortLeaveNursing: 11,
  AnnualSecondmentContract: 12,
  SickSecondmentContract: 13,
  AdministrativeLeave: 14,
  NationalService: 15,
  SickLeave: 16,
  WorkInjuryLeave: 17,
  ExamLeave: 18,
  StudyLeave: 19,
  MaternityLeave: 20,
  PaternityLeave: 21,
  CompassionateLeaveLevel1: 22,
  CompassionateLeaveLevel2: 23,
  CompassionateLeaveLevel3: 24,
  EddahLeave: 25,
  HajjLeave: 26,
  AccompanyingPatientLeave: 27,
  SickLeaveNoAttachment: 28,
  NationalServiceRefreshment: 29,
  TrainingLeave: 30,
  ShortLeaveBackToSchool: 31,
  LongOfficialMissionLeave: 32,
  PrecautionLeave: 33,
  RemoteWork: 34,
} as const;

/** Same calendar day + start/end clock times (legacy LeaveRequest.ascx.cs). */
export const LEAVE_TYPES_TIME_SAME_DAY: readonly number[] = [
  LT.Short,
  LT.OfficialMission,
  LT.STITraining,
  LT.HospitalAppointment,
  LT.ShortLeaveBackToSchool,
];

/**
 * Legacy web requires an attachment for these types before submit
 * (LeaveRequest.ascx.cs — ProvideAttachment branch).
 */
export const LEAVE_TYPES_REQUIRE_ATTACHMENT: readonly number[] = [
  LT.Sick,
  LT.OfficialMission,
  LT.OfficialMissionLeave,
  LT.PrecautionLeave,
  LT.RemoteWork,
  LT.HospitalAppointment,
  LT.SickLeave,
  LT.WorkInjuryLeave,
  LT.ExamLeave,
  LT.StudyLeave,
  LT.MaternityLeave,
  LT.PaternityLeave,
  LT.CompassionateLeaveLevel1,
  LT.CompassionateLeaveLevel2,
  LT.CompassionateLeaveLevel3,
  LT.EddahLeave,
  LT.AccompanyingPatientLeave,
];

export function leaveTypeNeedsAttachment(leaveTypeId: number | null): boolean {
  if (leaveTypeId == null) return false;
  return LEAVE_TYPES_REQUIRE_ATTACHMENT.includes(leaveTypeId);
}

export function leaveTypeNeedsSameDayTimes(leaveTypeId: number | null): boolean {
  if (leaveTypeId == null) return false;
  return LEAVE_TYPES_TIME_SAME_DAY.includes(leaveTypeId);
}

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Matches SubmitLeaveRequest: cannot apply before 01-Jan-2017. */
export const MIN_LEAVE_APPLICATION_DATE = '2017-01-01';

/** Strict YYYY-MM-DD parse; invalid → null (avoids Invalid Date from split/map NaN). */
export function parseYmdSafe(s: string | undefined | null): { y: number; m: number; d: number } | null {
  if (s == null || String(s).trim() === '') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

export function localDayStart(dateStr: string): Date {
  const p = parseYmdSafe(dateStr);
  if (!p) {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0);
  }
  return new Date(p.y, p.m - 1, p.d, 0, 0, 0, 0);
}

export function localDayEnd(dateStr: string): Date {
  const p = parseYmdSafe(dateStr);
  if (!p) {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
  }
  return new Date(p.y, p.m - 1, p.d, 23, 59, 59, 999);
}

/**
 * LeaveType.ApplyDates (SMARTSCAD): 'P' = past / backdate only — start date must not be after today
 * (see SubmitLeaveRequest). Anything else = forward-looking; min date is typically today.
 */
export function parseApplyDates(row: any): string {
  if (row == null || typeof row !== 'object') return '';
  const raw = row.applyDates ?? row.ApplyDates;
  if (raw == null || raw === '') return '';
  const c = String(raw).trim().toUpperCase().charAt(0);
  return c === 'P' ? 'P' : '';
}

/** Lexical order works for ISO dates. */
export function clampYmd(ymd: string, min?: string, max?: string): string {
  let s = ymd;
  if (min && s < min) s = min;
  if (max && s > max) s = max;
  return s;
}

/** Earlier of two ISO dates (both must be defined). */
export function ymdEarlier(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Parse "HH:mm" or "H:mm"; default 09:00 if empty/invalid. */
export function parseTimeParts(timeStr: string): [number, number] {
  const t = (timeStr ?? '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return [9, 0];
  let h = Number(m[1]);
  let min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return [9, 0];
  return [h, min];
}

export function profileGenderIsFemale(profile: any): boolean | null {
  if (!profile) return null;
  const raw = `${profile.gender ?? profile.Gender ?? profile.genderAr ?? ''}`.toLowerCase();
  if (/female|أنثى|انثى|f$|^f\b/i.test(raw)) return true;
  if (/male|ذكر|^m\b|m$/i.test(raw)) return false;
  return null;
}

/**
 * Leave list rows from SMARTSCAD may expose id as id, leaveTypeId, leaveTypeID (JSON camelCase for LeaveTypeID), etc.
 */
export function parseLeaveTypeId(row: any): number | null {
  if (row == null || typeof row !== 'object') return null;
  const raw =
    row.id ??
    row.leaveTypeId ??
    row.leaveTypeID ??
    row.LeaveTypeId ??
    row.LeaveTypeID;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

/** Display name for a leave type row (EN + legacy column names). */
export function parseLeaveTypeName(row: any): string {
  if (row == null || typeof row !== 'object') return '';
  const raw =
    row.name ??
    row.leaveTypeName ??
    row.leaveTypeNameEn ??
    row.LeaveTypeName ??
    row.leaveType ??
    row.displayName ??
    row.DisplayName;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') return String(raw).trim();
  const ar = row.leaveTypeNameAr ?? row.LeaveTypeNameAr ?? row.leaveTypeNameAR;
  if (ar !== undefined && ar !== null && String(ar).trim() !== '') return String(ar).trim();
  return '';
}

/** Female-only leave types — widen to number[] so `.includes(parseLeaveTypeId)` type-checks. */
const FEMALE_ONLY_LEAVE_TYPE_IDS: number[] = [
  LT.ShortLeaveNursing,
  LT.MaternityLeave,
  LT.EddahLeave,
];

export function filterLeaveTypesForProfile(
  types: any[],
  opts: { female: boolean | null; hideHajj: boolean },
): any[] {
  return types.filter((t) => {
    const id = parseLeaveTypeId(t);
    if (id === null) return false;
    if (opts.hideHajj && id === LT.HajjLeave) return false;
    if (opts.female === false) {
      if (FEMALE_ONLY_LEAVE_TYPE_IDS.includes(id)) return false;
    }
    if (opts.female === true) {
      if (id === LT.PaternityLeave) return false;
    }
    return true;
  });
}
