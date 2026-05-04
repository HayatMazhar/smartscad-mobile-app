import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useToast } from '../../../shared/components/Toast';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import {
  useV2GetLeaveTypesQuery,
  useV2GetLeaveBalanceQuery,
  useV2SubmitLeaveMutation,
  useV2GetLeaveCategoriesQuery,
  useV2GetLeaveHistoryQuery,
} from '../services/leaveSvcApi';
import { useUploadLeaveDocumentMutation } from '../services/leaveApi';
import { useGetProfileQuery } from '../../hr/services/hrApi';
import { asArray } from '../../../shared/utils/apiNormalize';
import { pickDocumentsForUpload, type PickedUploadFile } from '../../../shared/utils/pickDocument';
import DateField from '../../../shared/components/DateField';
import Dropdown from '../../../shared/components/Dropdown';
import {
  LT,
  clampYmd,
  filterLeaveTypesForProfile,
  formatYmdLocal,
  leaveTypeNeedsAttachment,
  leaveTypeNeedsSameDayTimes,
  localDayEnd,
  localDayStart,
  MIN_LEAVE_APPLICATION_DATE,
  parseApplyDates,
  parseLeaveTypeId,
  parseLeaveTypeName,
  parseTimeParts,
  profileGenderIsFemale,
} from '../leaveLegacyTypes';

const TYPE_EMOJIS: Record<string, string> = {
  annual: '🏖️', sick: '🤒', personal: '👤', compassionate: '💐',
  maternity: '👶', paternity: '👨‍👦', unpaid: '📝', hajj: '🕋',
};

function getEmoji(name: string) {
  const key = (name ?? '').toLowerCase();
  for (const [k, v] of Object.entries(TYPE_EMOJIS)) {
    if (key.includes(k)) return v;
  }
  return '📋';
}

function daysBetweenInclusive(start: Date, end: Date) {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1, 0);
}

function unwrapProfile(data: any): any {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  if (data.data !== undefined) return Array.isArray(data.data) ? data.data[0] : data.data;
  return data;
}

function unwrapSubmitPayload(payload: unknown): unknown {
  let cur: any = payload;
  for (let i = 0; i < 8; i++) {
    if (
      cur !== null &&
      typeof cur === 'object' &&
      !Array.isArray(cur) &&
      typeof (cur as { success?: unknown }).success === 'boolean' &&
      'data' in cur &&
      (cur as { data?: unknown }).data !== undefined
    ) {
      cur = (cur as { data: unknown }).data;
      continue;
    }
    break;
  }
  return cur;
}

/** SP row from SubmitLeaveRequest — may be wrapped in multiple { success, data } layers from API. */
function extractSubmitRow(payload: unknown): Record<string, unknown> {
  const inner = unwrapSubmitPayload(payload);
  if (Array.isArray(inner)) return (inner[0] as Record<string, unknown>) ?? {};
  if (inner && typeof inner === 'object') return inner as Record<string, unknown>;
  return {};
}

function rowIsSuccess(row: Record<string, unknown>): boolean {
  const v = row.isSuccess ?? row.IsSuccess;
  if (v === false || v === 0 || v === '0' || v === 'false') return false;
  return v === true || v === 1 || v === '1' || v === 'true';
}

function rowMessage(row: Record<string, unknown>): string {
  const raw =
    row.message ??
    row.Message ??
    row.userFriendlyMessage ??
    row.UserFriendlyMessage ??
    row.error ??
    row.Error ??
    row.code ??
    row.Code;
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  const rid = row.reasonID ?? row.ReasonID;
  if (rid != null && String(rid).trim() !== '') return String(rid).trim();
  return '';
}

function rowLeaveUid(row: Record<string, unknown>): string | null {
  const u = row.leaveAppUID ?? row.leaveAppUid ?? row.LeaveAppUID;
  if (u == null) return null;
  const s = String(u).trim();
  return s.length ? s : null;
}

const LeaveRequestScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows, radii } = useTheme();
  const toast = useToast();
  const lang = (i18n.language || 'en-us').toLowerCase().startsWith('ar') ? 'ar-ae' : 'en-us';

  const { data: rawProfile } = useGetProfileQuery();
  const profile = unwrapProfile(rawProfile);
  const genderFemale = profileGenderIsFemale(profile);

  const y = new Date().getFullYear();
  const { data: hajjHist } = useV2GetLeaveHistoryQuery({
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
    leaveTypeIds: '26',
    leaveStatus: '20,21,22',
    lang,
  });
  const hajjBlocked = (asArray<any>(hajjHist)).length > 0;

  const { data: rawTypes, isFetching: loadingTypes } = useV2GetLeaveTypesQuery(lang);
  const rawTypeList = asArray<any>(rawTypes);
  const typeList = useMemo(
    () => filterLeaveTypesForProfile(rawTypeList, { female: genderFemale, hideHajj: hajjBlocked }),
    [rawTypeList, genderFemale, hajjBlocked],
  );

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [startDateStr, setStartDateStr] = useState(() => formatYmdLocal(new Date()));
  const [endDateStr, setEndDateStr] = useState(() => formatYmdLocal(new Date()));
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState('');
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('11:00');
  const [attDateStr, setAttDateStr] = useState(() => formatYmdLocal(new Date()));
  const [attTime, setAttTime] = useState('09:00');
  const [machineKind, setMachineKind] = useState<0 | 1>(0);
  const [remoteCategoryCode, setRemoteCategoryCode] = useState<number | null>(null);
  const [files, setFiles] = useState<PickedUploadFile[]>([]);

  const { data: rawBal } = useV2GetLeaveBalanceQuery({ endDate: localDayEnd(endDateStr).toISOString(), lang });
  const balances = asArray<any>(rawBal);

  const { data: rawCat, isFetching: loadingCat } = useV2GetLeaveCategoriesQuery(
    { leaveTypeId: selectedTypeId ?? 0, lang },
    { skip: selectedTypeId !== LT.RemoteWork },
  );
  const categories = asArray<any>(rawCat);

  const categoryOptions = useMemo(() => {
    return categories.map((c: any) => ({
      value: Number(c.code ?? c.Code ?? c.leaveCategoryId ?? c.LeaveCategoryID ?? 0),
      label: String(c.leaveCategory ?? c.LeaveCategory ?? c.name ?? c.Name ?? `#${c.code}`),
    })).filter((o) => !Number.isNaN(o.value));
  }, [categories]);

  useEffect(() => {
    if (selectedTypeId == null) return;
    if (leaveTypeNeedsSameDayTimes(selectedTypeId)) {
      setEndDateStr(startDateStr);
    }
    if (selectedTypeId === LT.MaternityLeave) {
      const s = localDayStart(startDateStr);
      const e = new Date(s);
      e.setMonth(e.getMonth() + 3);
      e.setDate(e.getDate() - 1);
      setEndDateStr(formatYmdLocal(e));
    } else if (selectedTypeId === LT.PaternityLeave) {
      setEndDateStr(startDateStr);
    } else if (selectedTypeId === LT.ShortLeaveNursing) {
      const s = localDayStart(startDateStr);
      const e = new Date(s);
      e.setFullYear(e.getFullYear() + 1);
      e.setDate(e.getDate() - 1);
      setEndDateStr(formatYmdLocal(e));
    }
  }, [selectedTypeId, startDateStr]);

  const [submitLeave, { isLoading: submitting }] = useV2SubmitLeaveMutation();
  const [uploadDoc, { isLoading: uploading }] = useUploadLeaveDocumentMutation();

  const selectedType = useMemo(
    () => typeList.find((x: any) => parseLeaveTypeId(x) === selectedTypeId),
    [typeList, selectedTypeId],
  );

  const applyFlag = useMemo(() => parseApplyDates(selectedType), [selectedType]);

  /** Fresh “today” each render so calendar min/max stay correct if the app crosses midnight. */
  const todayYmd = formatYmdLocal(new Date());
  const datePolicy = useMemo(() => {
    const pastOnly = applyFlag === 'P';
    return {
      pastOnly,
      minYmd: pastOnly ? MIN_LEAVE_APPLICATION_DATE : todayYmd,
      maxYmd: pastOnly ? todayYmd : undefined as string | undefined,
    };
  }, [applyFlag, todayYmd]);

  /**
   * When leave type or ApplyDates changes, clamp stored dates into allowed policy range.
   * SP: ApplyDates 'P' → start must not be after today (backdated leave).
   */
  useEffect(() => {
    if (selectedTypeId == null) return;
    const today = formatYmdLocal(new Date());
    const pastOnly = applyFlag === 'P';
    const minY = pastOnly ? MIN_LEAVE_APPLICATION_DATE : today;
    const maxY = pastOnly ? today : undefined;
    const maxC = maxY ?? '9999-12-31';
    setStartDateStr((s) => clampYmd(s, minY, maxC));
    setEndDateStr((e) => clampYmd(e, minY, maxC));
    setAttDateStr((a) => clampYmd(a, minY, maxC));
  }, [selectedTypeId, applyFlag]);

  /**
   * Max date on the *start* picker: policy only (backdated → today).
   * Do not use endDateStr here — when start and end both default to today,
   * max === today and every future day stays disabled.
   * Start ≤ end is enforced in onChange handlers + submit validation.
   */
  const startDateMaxYmd = useMemo(() => {
    if (leaveTypeNeedsSameDayTimes(selectedTypeId)) return startDateStr;
    return datePolicy.maxYmd;
  }, [selectedTypeId, startDateStr, datePolicy.maxYmd]);

  const onStartDateChange = (v: string) => {
    const maxCap = datePolicy.maxYmd ?? '9999-12-31';
    let x = clampYmd(v, datePolicy.minYmd, maxCap);
    setStartDateStr(x);
    if (leaveTypeNeedsSameDayTimes(selectedTypeId)) {
      setEndDateStr(x);
      return;
    }
    setEndDateStr((e) => {
      const ec = clampYmd(e, datePolicy.minYmd, maxCap);
      return ec < x ? x : ec;
    });
  };

  const onEndDateChange = (v: string) => {
    const maxCap = datePolicy.maxYmd ?? '9999-12-31';
    let x = clampYmd(v, datePolicy.minYmd, maxCap);
    if (x < startDateStr) x = startDateStr;
    setEndDateStr(x);
  };

  const onAttDateChange = (v: string) => {
    const maxCap = datePolicy.maxYmd ?? '9999-12-31';
    setAttDateStr(clampYmd(v, datePolicy.minYmd, maxCap));
  };

  const balance = useMemo(() => {
    if (!selectedType || !balances.length) return null;
    const selName = parseLeaveTypeName(selectedType);
    return balances.find(
      (b: any) =>
        parseLeaveTypeId(b) === selectedTypeId ||
        (selName.length > 0 && parseLeaveTypeName(b).toLowerCase() === selName.toLowerCase()),
    );
  }, [balances, selectedType, selectedTypeId]);

  const calculatedDays = daysBetweenInclusive(localDayStart(startDateStr), localDayStart(endDateStr));

  const buildStartEnd = (): { start: Date; end: Date } | null => {
    if (selectedTypeId === LT.AttendanceMachineError) {
      const d0 = localDayStart(attDateStr);
      const [h, m] = parseTimeParts(attTime);
      const s = new Date(d0);
      s.setHours(h, m, 0, 0);
      return { start: s, end: new Date(s.getTime()) };
    }
    if (selectedTypeId != null && leaveTypeNeedsSameDayTimes(selectedTypeId)) {
      const d0 = localDayStart(startDateStr);
      const [sh, sm] = parseTimeParts(timeStart);
      const [eh, em] = parseTimeParts(timeEnd);
      const s = new Date(d0);
      s.setHours(sh, sm, 0, 0);
      const e = new Date(d0);
      e.setHours(eh, em, 0, 0);
      if (e.getTime() <= s.getTime()) {
        toast.warning(t('common.error', 'Error'), t('leave.invalidTimeOrder', 'End time must be after start time'));
        return null;
      }
      return { start: s, end: e };
    }
    return { start: localDayStart(startDateStr), end: localDayEnd(endDateStr) };
  };

  const validateDateRangeOrder = (): boolean => {
    if (selectedTypeId === LT.AttendanceMachineError) return true;
    if (selectedTypeId != null && leaveTypeNeedsSameDayTimes(selectedTypeId)) return true;
    const s = localDayStart(startDateStr);
    const e = localDayEnd(endDateStr);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      toast.warning(t('common.error', 'Error'), t('leave.invalidDates', 'Please choose valid dates'));
      return false;
    }
    if (s.getTime() > e.getTime()) {
      toast.warning(
        t('common.error', 'Error'),
        t('leave.invalidDateOrder', 'End date must be on or after the start date'),
      );
      return false;
    }
    return true;
  };

  const handlePickFiles = async () => {
    const picked = await pickDocumentsForUpload();
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!selectedTypeId) {
      toast.warning(t('common.error', 'Error'), t('leave.selectType', 'Please select a leave type'));
      return;
    }
    if (!reason.trim()) {
      toast.warning(t('common.error', 'Error'), t('leave.enterReason', 'Please enter a reason'));
      return;
    }
    if (selectedTypeId === LT.RemoteWork) {
      if (remoteCategoryCode === null || remoteCategoryCode === undefined) {
        toast.warning(t('common.error', 'Error'), t('leave.selectCategory', 'Please select a remote-work category'));
        return;
      }
    }
    if (leaveTypeNeedsAttachment(selectedTypeId) && files.length === 0) {
      toast.warning(t('common.error', 'Error'), t('leave.attachmentsRequired', 'This leave type requires at least one attachment'));
      return;
    }
    const range = buildStartEnd();
    if (!range) return;
    if (!validateDateRangeOrder()) return;

    const attendanceTypeId =
      selectedTypeId === LT.RemoteWork ? (remoteCategoryCode ?? 0)
        : selectedTypeId === LT.AttendanceMachineError ? machineKind
          : 0;

    try {
      const result = await submitLeave({
        leaveTypeId: selectedTypeId,
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        attendanceTypeId,
        contactNumber: contact.trim() || undefined,
        reason: reason.trim(),
        filesCount: files.length,
        recLog: 'SmartSCAD.MobileApp',
        lang,
      }).unwrap();

      const row = extractSubmitRow(result);
      const ok = rowIsSuccess(row);
      const msg =
        rowMessage(row) ||
        (ok ? t('leave.submitted', 'Leave request submitted successfully') : t('leave.submitFailed', 'Failed to submit leave request'));

      if (!ok) {
        toast.showToast(
          'error',
          t('leave.submitFailed', 'Could not submit leave'),
          msg || t('leave.submitFailed', 'Failed to submit leave request'),
          6500,
        );
        return;
      }

      const leaveUid = rowLeaveUid(row);
      if (leaveUid && files.length > 0) {
        for (const f of files) {
          try {
            await uploadDoc({ leaveId: leaveUid, file: f }).unwrap();
          } catch (ex: any) {
            const em = ex?.data?.message ?? ex?.error ?? String(ex);
            toast.error(t('leave.uploadPartial', 'Attachment upload failed'), String(em));
          }
        }
      }

      toast.showToast(
        'success',
        t('leave.submittedTitle', 'Leave submitted'),
        msg,
        4500,
      );
      setTimeout(() => navigation?.goBack?.(), 1500);
    } catch (err: any) {
      const apiMsg =
        err?.data?.message ??
        err?.data?.data?.message ??
        err?.error ??
        err?.message ??
        t('leave.submitFailed', 'Failed to submit leave request');
      toast.showToast('error', t('common.error', 'Error'), String(apiMsg), 6000);
    }
  };

  const busy = submitting || uploading;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {balance && (
          <View style={[styles.balanceBanner, { backgroundColor: colors.primaryLight, borderRadius: radii.lg }]}>
            <View style={styles.balanceBannerInner}>
              <View>
                <Text style={[styles.balanceBannerLabel, { color: colors.primary }]}>
                  {t('leave.availableBalance', 'Available Balance')}
                </Text>
                <Text style={[styles.balanceBannerType, { color: colors.text }]}>
                  {selectedType?.name}
                </Text>
              </View>
              <View style={styles.balanceBannerRight}>
                <Text style={[styles.balanceBannerNum, { color: colors.primary }]}>
                  {balance.remaining ?? balance.balance ?? '-'}
                </Text>
                <Text style={[styles.balanceBannerDays, { color: colors.primary }]}>
                  {t('leave.days', 'days')}
                </Text>
              </View>
            </View>
            <View style={[styles.miniProgressTrack, { backgroundColor: `${colors.primary}20` }]}>
              <View
                style={[
                  styles.miniProgressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${(balance.quota ?? 0) > 0 ? (((balance.remaining ?? balance.balance ?? 0) as number) / (balance.quota ?? 1)) * 100 : 0}%` as any,
                  },
                ]}
              />
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('leave.selectLeaveType', 'SELECT LEAVE TYPE')}
        </Text>
        <View style={styles.typePickerWrap}>
          {loadingTypes ? (
            <ThemedActivityIndicator color={colors.primary} />
          ) : (
            <Dropdown<number>
              value={selectedTypeId}
              onChange={(v) => {
                setSelectedTypeId(v as number);
                setRemoteCategoryCode(null);
              }}
              placeholder={t('leave.pickType', 'Choose a leave type...')}
              searchable={typeList.length > 6}
              options={typeList
                .map((lt: any) => {
                  const id = parseLeaveTypeId(lt);
                  if (id === null) return null;
                  const name = parseLeaveTypeName(lt);
                  const bal = balances.find(
                    (b: any) =>
                      parseLeaveTypeId(b) === id ||
                      (name.length > 0 && parseLeaveTypeName(b).toLowerCase() === name.toLowerCase()),
                  );
                  const rem = bal?.remaining ?? bal?.balance;
                  const label = name || `#${id}`;
                  return {
                    value: id,
                    label,
                    icon: getEmoji(name || label),
                    sublabel:
                      rem != null
                        ? `${rem} ${t('leave.days', 'days')} ${t('leave.remaining', 'remaining')}`
                        : undefined,
                  };
                })
                .filter((o): o is NonNullable<typeof o> => o != null)}
            />
          )}
        </View>

        {(selectedTypeId === LT.RemoteWork || selectedTypeId === LT.AttendanceMachineError) && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('leave.category', 'CATEGORY')}
            </Text>
            {loadingCat ? (
              <ThemedActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} />
            ) : selectedTypeId === LT.AttendanceMachineError ? (
              <View style={[styles.rowSeg, { marginBottom: 16 }]}>
                <TouchableOpacity
                  style={[styles.segBtn, machineKind === 0 && { backgroundColor: colors.primary }]}
                  onPress={() => setMachineKind(0)}
                >
                  <Text style={[styles.segTxt, { color: machineKind === 0 ? '#fff' : colors.text }]}>
                    {t('leave.machineKind0', 'In / forgot checkout')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segBtn, machineKind === 1 && { backgroundColor: colors.primary }]}
                  onPress={() => setMachineKind(1)}
                >
                  <Text style={[styles.segTxt, { color: machineKind === 1 ? '#fff' : colors.text }]}>
                    {t('leave.machineKind1', 'Out / forgot check-in')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Dropdown<number>
                  value={remoteCategoryCode}
                  onChange={(v) => setRemoteCategoryCode(v as number)}
                  placeholder={t('leave.selectCategory', 'Select category')}
                  options={categoryOptions}
                />
              </View>
            )}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('leave.dates', 'DATES')}
        </Text>
        {selectedTypeId != null && (
          <Text style={[styles.dateHint, { color: colors.textMuted }]}>
            {datePolicy.pastOnly
              ? t('leave.dateHintPastOnly', 'This leave type is backdated only: you can select today or earlier.')
              : t('leave.dateHintForward', 'Dates are from today onward.')}
          </Text>
        )}
        <View style={[styles.dateCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
          {selectedTypeId === LT.AttendanceMachineError ? (
            <View style={styles.dateField}>
              <DateField
                label={`📅 ${t('leave.attendanceDate', 'Attendance date')}`}
                value={attDateStr}
                onChange={onAttDateChange}
                min={datePolicy.minYmd}
                max={datePolicy.maxYmd}
              />
              <Text style={[styles.timeLab, { color: colors.textMuted }]}>{t('leave.attendanceTime', 'Time')}</Text>
              <TextInput
                style={[styles.timeInp, { color: colors.text, borderColor: colors.inputBorder }]}
                value={attTime}
                onChangeText={setAttTime}
                placeholder="HH:mm"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ) : (
            <View style={styles.dateFieldRow}>
              <View style={styles.dateField}>
                <DateField
                  label={`📅 ${t('leave.startDate', 'Start Date')}`}
                  value={startDateStr}
                  onChange={onStartDateChange}
                  min={datePolicy.minYmd}
                  max={leaveTypeNeedsSameDayTimes(selectedTypeId) ? startDateStr : (startDateMaxYmd || undefined)}
                />
              </View>
              <View style={[styles.dateFieldDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.dateField}>
                <DateField
                  label={`📅 ${t('leave.endDate', 'End Date')}`}
                  value={endDateStr}
                  onChange={onEndDateChange}
                  min={startDateStr || undefined}
                  max={leaveTypeNeedsSameDayTimes(selectedTypeId) ? startDateStr : datePolicy.maxYmd}
                />
              </View>
            </View>
          )}

          {selectedTypeId != null && leaveTypeNeedsSameDayTimes(selectedTypeId) && (
            <View style={[styles.timeRow, { borderTopColor: colors.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.timeLab, { color: colors.textMuted }]}>{t('leave.timeStart', 'Start time')}</Text>
                <TextInput
                  style={[styles.timeInp, { color: colors.text, borderColor: colors.inputBorder }]}
                  value={timeStart}
                  onChangeText={setTimeStart}
                  placeholder="09:00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.timeLab, { color: colors.textMuted }]}>{t('leave.timeEnd', 'End time')}</Text>
                <TextInput
                  style={[styles.timeInp, { color: colors.text, borderColor: colors.inputBorder }]}
                  value={timeEnd}
                  onChangeText={setTimeEnd}
                  placeholder="11:00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          )}

          {selectedTypeId !== LT.AttendanceMachineError && (
            <View style={[styles.calcDays, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.calcDaysText, { color: colors.primary }]}>
                ⏱️ {t('leave.duration', 'Duration')}:{' '}
                <Text style={styles.calcDaysBold}>
                  {calculatedDays} {t('leave.days', 'days')}
                </Text>
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('leave.contactNumber', 'CONTACT WHILE ON LEAVE')}
        </Text>
        <View style={[styles.inputCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
          <TextInput
            style={[styles.singleLine, { color: colors.text, borderColor: colors.inputBorder }]}
            value={contact}
            onChangeText={setContact}
            placeholder={t('leave.contactPlaceholder', 'Phone number (recommended)')}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('leave.reason', 'REASON')}
        </Text>
        <View style={[styles.inputCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
          <TextInput
            style={[styles.reasonInput, { color: colors.text, borderColor: colors.inputBorder }]}
            placeholder={t('leave.reasonPlaceholder', 'Enter reason for leave...')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={reason}
            onChangeText={setReason}
          />
        </View>

        <TouchableOpacity
          style={[styles.attachBtn, { borderColor: colors.border, borderRadius: radii.lg }]}
          activeOpacity={0.7}
          onPress={handlePickFiles}
        >
          <Text style={styles.attachEmoji}>📎</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.attachTitle, { color: colors.text }]}>
              {t('leave.attachFile', 'Attach files')}
            </Text>
            <Text style={[styles.attachSubtitle, { color: colors.textMuted }]}>
              {t('leave.attachDesc', 'PDF, JPG, PNG (add before submit; required for some leave types)')}
            </Text>
          </View>
        </TouchableOpacity>
        {files.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            {files.map((f, i) => (
              <View key={`${i}-${(f as any).name ?? (f as any).uri}`} style={[styles.fileRow, { borderColor: colors.border }]}>
                <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>
                  📄 {(f as any).name ?? 'file'}
                </Text>
                <TouchableOpacity onPress={() => removeFile(i)}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: busy ? colors.textMuted : colors.primary, borderRadius: radii.lg },
            shadows.button,
          ]}
          onPress={handleSubmit}
          disabled={busy}
          activeOpacity={0.8}
        >
          {busy ? (
            <ThemedActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('leave.submit', 'Submit Leave Request')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  balanceBanner: { padding: 16, marginBottom: 20 },
  balanceBannerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceBannerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceBannerType: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  balanceBannerRight: { alignItems: 'center' },
  balanceBannerNum: { fontSize: 28, fontWeight: '800' },
  balanceBannerDays: { fontSize: 11, fontWeight: '600', marginTop: -2 },
  miniProgressTrack: { height: 4, borderRadius: 2, marginTop: 12 },
  miniProgressFill: { height: 4, borderRadius: 2 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 10, marginLeft: 4, marginTop: 4,
  },
  typePickerWrap: { marginBottom: 16 },
  dateHint: { fontSize: 12, lineHeight: 17, marginBottom: 10, marginLeft: 4 },
  dateCard: { padding: 16, marginBottom: 20 },
  dateFieldRow: { flexDirection: 'row', gap: 0 },
  dateField: { flex: 1, paddingVertical: 8 },
  dateFieldDivider: { width: 1, marginHorizontal: 12 },
  calcDays: { marginTop: 12, borderRadius: 8, padding: 10, alignItems: 'center' },
  calcDaysText: { fontSize: 13, fontWeight: '500' },
  calcDaysBold: { fontWeight: '800' },
  inputCard: { padding: 4, marginBottom: 16 },
  singleLine: {
    borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, margin: 8,
  },
  reasonInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    minHeight: 100, fontSize: 14, lineHeight: 20, margin: 8,
  },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 12,
  },
  attachEmoji: { fontSize: 24 },
  attachTitle: { fontSize: 14, fontWeight: '600' },
  attachSubtitle: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderRadius: 8, marginBottom: 8,
  },
  submitBtn: { padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52, marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  timeLab: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  timeInp: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, fontWeight: '600' },
  rowSeg: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  segTxt: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});

export default LeaveRequestScreen;
