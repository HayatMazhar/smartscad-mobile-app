import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ApprovalsStackParamList, ApprovalsTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../app/theme/ThemeContext';
import {
  useGetBISurveyFormQuery,
  useSubmitBISurveyMutation,
  type BISurveyAnswer,
  type BISurveyQuestion,
} from '../services/biSurveysApi';

type DraftAnswer = {
  /** raw value: text string, "true"/"false", or rating number string ("1".."5") */
  answer: string;
  /** description (only for radio Yes or rating sub-question) */
  description: string;
};

const RATING_OPTIONS = ['1', '2', '3', '4', '5'];

const SurveyResponseScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const route = useRoute<RouteProp<ApprovalsStackParamList, 'SurveyResponse'>>();
  const navigation = useNavigation<ApprovalsTabNavigation<'SurveyResponse'>>();
  const insets = useSafeAreaInsets();
  const { colors, fontFamily, shadows } = useTheme();
  const isAr = (i18n.language || '').toLowerCase().startsWith('ar');

  const surveyLinkId = route.params?.surveyLinkId;

  const { data, isLoading, isError, refetch } = useGetBISurveyFormQuery(surveyLinkId, {
    skip: !surveyLinkId,
  });
  const [submit, { isLoading: submitting }] = useSubmitBISurveyMutation();

  const header = data?.header;
  const questions: BISurveyQuestion[] = useMemo(
    () => (data?.questions || []).slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [data?.questions],
  );

  const [draft, setDraft] = useState<Record<number, DraftAnswer>>({});

  // Pre-populate when re-opening a previously submitted survey (read-only view)
  useEffect(() => {
    if (!data?.existingResponses?.length) return;
    const next: Record<number, DraftAnswer> = {};
    for (const r of data.existingResponses) {
      next[r.surveyQuestionId] = {
        answer: r.answer ?? '',
        description: r.description ?? '',
      };
    }
    setDraft(next);
  }, [data?.existingResponses]);

  const update = (qId: number, patch: Partial<DraftAnswer>) =>
    setDraft((prev) => ({
      ...prev,
      [qId]: {
        answer: prev[qId]?.answer ?? '',
        description: prev[qId]?.description ?? '',
        ...patch,
      },
    }));

  const isReadOnly = !!header?.alreadySubmitted || !header?.canFill;

  const validateAndCollect = (): { ok: boolean; payload?: BISurveyAnswer[]; errorKey?: string } => {
    const out: BISurveyAnswer[] = [];
    for (const q of questions) {
      const d = draft[q.surveyQuestionId];
      const ans = (d?.answer ?? '').trim();
      const desc = (d?.description ?? '').trim();

      if (!ans) {
        return { ok: false, errorKey: 'surveys.errorRequired' };
      }
      if (q.questionType === 2 && ans.toLowerCase() === 'true' && !desc) {
        return { ok: false, errorKey: 'surveys.errorYesDescription' };
      }
      out.push({
        surveyQuestionId: q.surveyQuestionId,
        answer: ans,
        description: desc.length ? desc : null,
      });
    }
    return { ok: true, payload: out };
  };

  const onSubmit = async () => {
    const v = validateAndCollect();
    if (!v.ok) {
      Alert.alert(t('common.error', 'Error'), t(v.errorKey!, 'Please fill all required fields'));
      return;
    }
    try {
      const res = await submit({ surveyLinkId, answers: v.payload! }).unwrap();
      const ok = (res as any)?.success === true;
      if (ok) {
        Alert.alert(
          t('surveys.thankYou', 'Thank you!'),
          (res as any)?.message ?? t('surveys.thankYou', 'Thank you!'),
          [{ text: t('common.ok', 'OK'), onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert(t('common.error', 'Error'), (res as any)?.message ?? 'Failed');
      }
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.data?.message ?? e?.message ?? 'Failed');
    }
  };

  const localised = (en?: string | null, ar?: string | null) => (isAr ? ar || en : en || ar) || '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 8,
          paddingBottom: Math.max(28, insets.bottom + 16),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View
          style={[
            styles.hero,
            shadows?.card,
            { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider },
          ]}
        >
          <View style={[styles.pill, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={[styles.pillText, { color: colors.primary, fontFamily }]}>
              {t('surveys.title', 'Survey')}
            </Text>
          </View>
          <Text style={[styles.hTitle, { color: colors.text, fontFamily }]} numberOfLines={3}>
            {localised(header?.surveyNameEn, header?.surveyNameAr) ||
              localised(header?.dashboardName, header?.dashboardNameAr)}
          </Text>
          {!!header?.dashboardName && (
            <Text style={[styles.hSub, { color: colors.textSecondary, fontFamily }]} numberOfLines={2}>
              {localised(header?.dashboardName, header?.dashboardNameAr)}
            </Text>
          )}
          {!!header?.dueDate && (
            <Text style={[styles.hMeta, { color: colors.textMuted, fontFamily }]}>
              {`${t('leave.endDate', 'Due')} · ${new Date(header.dueDate).toLocaleDateString()}`}
            </Text>
          )}
        </View>

        {isLoading && (
          <View style={styles.center}>
            <ThemedActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {isError && !isLoading && (
          <TouchableOpacity onPress={() => void refetch()} style={[styles.retry, { borderColor: colors.divider }]}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontFamily }}>
              {t('common.retry', 'Retry')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Status banners (read-only / not assigned / inactive) */}
        {!!header && header.alreadySubmitted && (
          <Banner colors={colors} fontFamily={fontFamily} variant="info" text={t('surveys.alreadySubmitted', 'Already submitted')} />
        )}
        {!!header && !header.alreadySubmitted && !header.canFill && header.assignedToId && (
          <Banner
            colors={colors}
            fontFamily={fontFamily}
            variant="warning"
            text={header.message ?? t('surveys.notAssigned', 'Not assigned to you')}
          />
        )}

        {/* Questions */}
        {!isLoading && questions.length > 0 && (
          <View style={[styles.qCard, shadows?.card, { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider }]}>
            <View style={[styles.qHeader, { borderBottomColor: colors.divider }]}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.qHeaderText, { color: colors.text, fontFamily }]}>
                {t('surveys.questionsHeader', 'Questions')}
              </Text>
            </View>
            {questions.map((q, idx) => (
              <QuestionRow
                key={q.surveyQuestionId}
                index={idx + 1}
                isLast={idx === questions.length - 1}
                question={q}
                value={draft[q.surveyQuestionId] ?? { answer: '', description: '' }}
                onChange={(patch) => update(q.surveyQuestionId, patch)}
                disabled={isReadOnly || submitting}
                isAr={isAr}
                colors={colors}
                fontFamily={fontFamily}
                t={t}
              />
            ))}
          </View>
        )}

        {/* Submit */}
        {!isLoading && header?.canFill && (
          <TouchableOpacity
            onPress={() => void onSubmit()}
            disabled={submitting}
            style={[
              styles.submitBtn,
              {
                backgroundColor: submitting ? `${colors.success}80` : colors.success,
                opacity: submitting ? 0.7 : 1,
              },
            ]}
          >
            {submitting ? (
              <ThemedActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, fontFamily }}>
                {t('surveys.submit', 'Submit Survey')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

// ── Question row ────────────────────────────────────────────────────────────

const QuestionRow = ({
  index, isLast, question, value, onChange, disabled, isAr, colors, fontFamily, t,
}: {
  index: number;
  isLast: boolean;
  question: BISurveyQuestion;
  value: DraftAnswer;
  onChange: (patch: Partial<DraftAnswer>) => void;
  disabled: boolean;
  isAr: boolean;
  colors: any;
  fontFamily?: string;
  t: TFunction;
}) => {
  const text = isAr ? question.questionAr || question.questionEn : question.questionEn || question.questionAr;
  const subText = isAr ? question.subQuestionAr || question.subQuestionEn : question.subQuestionEn || question.subQuestionAr;

  return (
    <View style={[
      qStyles.row,
      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    ]}>
      <Text style={[qStyles.qText, { color: colors.text, fontFamily }]}>
        {`${index}. ${text || ''}`}
      </Text>

      {/* Type 1 — Text */}
      {question.questionType === 1 && (
        <TextInput
          value={value.answer}
          onChangeText={(s) => onChange({ answer: s })}
          editable={!disabled}
          multiline
          placeholder={t('surveys.answerPlaceholder', 'Type your answer here…')}
          placeholderTextColor={colors.textMuted}
          style={[
            qStyles.input,
            {
              color: colors.text,
              fontFamily,
              borderColor: colors.divider,
              backgroundColor: colors.background,
              opacity: disabled ? 0.7 : 1,
            },
          ]}
        />
      )}

      {/* Type 2 — Radio Yes/No */}
      {question.questionType === 2 && (
        <View>
          <View style={qStyles.radioRow}>
            <RadioPill
              label={t('surveys.yes', 'Yes')}
              selected={value.answer.toLowerCase() === 'true'}
              onPress={() => !disabled && onChange({ answer: 'true' })}
              colors={colors}
              fontFamily={fontFamily}
              variant="success"
            />
            <RadioPill
              label={t('surveys.no', 'No')}
              selected={value.answer.toLowerCase() === 'false'}
              onPress={() => !disabled && onChange({ answer: 'false', description: '' })}
              colors={colors}
              fontFamily={fontFamily}
              variant="muted"
            />
          </View>
          {value.answer.toLowerCase() === 'true' && (
            <View style={{ marginTop: 10 }}>
              {!!subText && (
                <Text style={[qStyles.subText, { color: colors.textMuted, fontFamily }]}>{subText}</Text>
              )}
              <TextInput
                value={value.description}
                onChangeText={(s) => onChange({ description: s })}
                editable={!disabled}
                multiline
                placeholder={t('surveys.describeYes', 'Please describe your answer')}
                placeholderTextColor={colors.textMuted}
                style={[
                  qStyles.input,
                  {
                    color: colors.text,
                    fontFamily,
                    borderColor: colors.divider,
                    backgroundColor: colors.background,
                  },
                ]}
              />
            </View>
          )}
        </View>
      )}

      {/* Type 3 — Rating 1-5 */}
      {question.questionType === 3 && (
        <View>
          <View style={qStyles.ratingRow}>
            {RATING_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => !disabled && onChange({ answer: r })}
                style={[
                  qStyles.ratingChip,
                  {
                    borderColor: value.answer === r ? colors.primary : colors.divider,
                    backgroundColor: value.answer === r ? `${colors.primary}18` : colors.card,
                  },
                ]}
              >
                <Text
                  style={{
                    color: value.answer === r ? colors.primary : colors.textSecondary,
                    fontWeight: '800',
                    fontFamily,
                  }}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!subText && (
            <Text style={[qStyles.subText, { color: colors.textMuted, fontFamily, marginTop: 8 }]}>{subText}</Text>
          )}
          {!!subText && (
            <TextInput
              value={value.description}
              onChangeText={(s) => onChange({ description: s })}
              editable={!disabled}
              multiline
              placeholder={t('surveys.describeYes', 'Please describe your answer')}
              placeholderTextColor={colors.textMuted}
              style={[
                qStyles.input,
                {
                  color: colors.text,
                  fontFamily,
                  borderColor: colors.divider,
                  backgroundColor: colors.background,
                  marginTop: 6,
                },
              ]}
            />
          )}
        </View>
      )}
    </View>
  );
};

const RadioPill = ({
  label, selected, onPress, colors, fontFamily, variant,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: any;
  fontFamily?: string;
  variant: 'success' | 'muted';
}) => {
  const onColor = variant === 'success' ? colors.success : colors.textSecondary;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        qStyles.radioPill,
        {
          borderColor: selected ? onColor : colors.divider,
          backgroundColor: selected ? `${onColor}18` : colors.card,
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={[
        qStyles.radioDot,
        { borderColor: selected ? onColor : colors.divider },
      ]}>
        {selected && <View style={[qStyles.radioDotInner, { backgroundColor: onColor }]} />}
      </View>
      <Text style={{ color: selected ? onColor : colors.text, fontWeight: '700', fontFamily }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const Banner = ({
  colors, fontFamily, variant, text,
}: {
  colors: any; fontFamily?: string; variant: 'info' | 'warning'; text: string;
}) => {
  const c = variant === 'warning' ? (colors.warning ?? '#F59E0B') : colors.primary;
  return (
    <View style={[styles.banner, { backgroundColor: `${c}14`, borderColor: `${c}40` }]}>
      <Text style={{ color: c, fontWeight: '700', fontFamily, fontSize: 13 }}>{text}</Text>
    </View>
  );
};

// ── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  hTitle: { fontSize: 18, fontWeight: '800', marginTop: 10, lineHeight: 24 },
  hSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  hMeta: { fontSize: 12, marginTop: 8 },
  qCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  qHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  qHeaderText: { fontSize: 14, fontWeight: '800' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { alignItems: 'center', padding: 20 },
  retry: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
});

const qStyles = StyleSheet.create({
  row: { paddingHorizontal: 14, paddingVertical: 16 },
  qText: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  radioRow: { flexDirection: 'row', gap: 10 },
  radioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    gap: 8,
  },
  radioDot: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDotInner: { width: 8, height: 8, borderRadius: 4 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingChip: {
    minWidth: 44, height: 44, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  subText: { fontSize: 12, fontWeight: '600' },
});

export default SurveyResponseScreen;
