import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Platform } from 'react-native';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { setTheme } from '../../auth/services/authSlice';
import {
  resetHomeLayout,
  setHomeHeroSize,
  setHomeSectionVariant,
  setHomeSectionVisible,
  setColorPaletteId,
  setFontSizeStep,
  setFontFamilyId,
} from '../../../app/settings/uiPreferencesSlice';
import {
  COLOR_PALETTE_OPTIONS,
  FONT_SIZE_STEPS,
  FONT_FAMILY_OPTIONS,
} from '../../../app/settings/themePreferencesTypes';
import type { ColorPaletteId, FontFamilyId, FontSizeStep } from '../../../app/settings/themePreferencesTypes';
import {
  HOME_SECTION_IDS,
  HOME_SECTION_LABELS,
  type HeroBannerSize,
  type HomeSectionId,
} from '../../../app/settings/homeLayoutTypes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedIcon from '../../../shared/components/ThemedIcon';
import type { SemanticIconName } from '../../../app/theme/semanticIcons';

const HERO_SIZES: { key: HeroBannerSize; label: string; hint: string }[] = [
  { key: 'large', label: 'Large', hint: 'Original banner: big header, date & time, check-in / out / status' },
  { key: 'medium', label: 'Medium', hint: 'Default balance' },
  { key: 'compact', label: 'Compact', hint: 'Minimum header height' },
];

function SectionHeader({ title, icon }: { title: string; icon: SemanticIconName }) {
  const { colors, fontFamily, fontScale } = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <ThemedIcon name={icon} size={18} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily, fontSize: 13 * fontScale }]}>{title}</Text>
    </View>
  );
}

const DesignSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, shadows, isDark, colorPaletteId, fontSizeStep, fontFamilyId, fontScale, fontFamily, skin } = useTheme();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.auth.theme);
  const { homeHeroSize, homeSections } = useAppSelector((s) => s.uiPreferences);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 32 + insets.bottom, paddingTop: 8 }}
    >
      <Text style={[styles.lead, { color: colors.textMuted, fontFamily }]}>Change appearance and which blocks appear on the Home tab.</Text>

      <View style={styles.block}>
        <SectionHeader title="Color story (light mode)" icon="colorPalette" />
        <View
          style={[
            styles.card,
            shadows.card,
            { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10, fontFamily }]}>
            Chooses the neutral government palettes or the original SCAD blues. In dark mode the app still uses the dark theme; switch back to
            light to see these colors.
          </Text>
          {COLOR_PALETTE_OPTIONS.map((p) => {
            const active = colorPaletteId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.rowPick,
                  { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' },
                ]}
                onPress={() => dispatch(setColorPaletteId(p.id as ColorPaletteId))}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text, fontFamily }]}>{p.label}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted, fontFamily }]}>{p.hint}</Text>
                </View>
                {active ? <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Text — size" icon="type" />
        <View
          style={[
            styles.card,
            shadows.card,
            { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10, fontFamily }]}>
            Scales app typography. Current scale: {Math.round(fontScale * 100)}%.
          </Text>
          {FONT_SIZE_STEPS.map((f) => {
            const active = fontSizeStep === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.rowPick,
                  { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' },
                ]}
                onPress={() => dispatch(setFontSizeStep(f.key as FontSizeStep))}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text, fontFamily }]}>{f.label}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted, fontFamily }]}>×{f.scale}</Text>
                </View>
                {active ? <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Text — font family" icon="pencil" />
        <View
          style={[
            styles.card,
            shadows.card,
            { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
          ]}
        >
          {FONT_FAMILY_OPTIONS.map((f) => {
            const active = fontFamilyId === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.rowPick,
                  { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' },
                ]}
                onPress={() => dispatch(setFontFamilyId(f.id as FontFamilyId))}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text, fontFamily: active ? fontFamily : undefined }]}>{f.label}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted, fontFamily: active ? fontFamily : undefined }]}>{f.hint}</Text>
                </View>
                {active ? <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Theme" icon="sunny" />
        <View
          style={[
            styles.card,
            shadows.card,
            { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.hint, { color: colors.textMuted }]}>Applies to the whole app (same as before under More).</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[
                styles.seg,
                { borderColor: colors.border, backgroundColor: !isDark ? colors.primarySoft : colors.card },
              ]}
              onPress={() => dispatch(setTheme('light'))}
              activeOpacity={0.7}
            >
              <Text style={[styles.segLabel, { color: !isDark ? colors.primary : colors.text }]}>Light</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.seg,
                { borderColor: colors.border, backgroundColor: isDark ? colors.primarySoft : colors.card },
              ]}
              onPress={() => dispatch(setTheme('dark'))}
              activeOpacity={0.7}
            >
              <Text style={[styles.segLabel, { color: isDark ? colors.primary : colors.text }]}>Dark</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.background }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Current: {theme === 'dark' ? 'Dark' : 'Light'} mode</Text>
          </View>
        </View>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Home — hero banner" icon="image" />
        <View
          style={[
            styles.card,
            shadows.card,
            { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.hint, { color: colors.textMuted, marginBottom: 10 }]}>
            Large restores the full header (date, time, attendance). Medium and compact keep a slimmer bar only.
          </Text>
          {HERO_SIZES.map((h) => {
            const active = homeHeroSize === h.key;
            return (
              <TouchableOpacity
                key={h.key}
                style={[
                  styles.rowPick,
                  { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : 'transparent' },
                ]}
                onPress={() => dispatch(setHomeHeroSize(h.key))}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{h.label}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{h.hint}</Text>
                </View>
                {active ? <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <SectionHeader title="Home — sections" icon="chart" />
        <View
          style={[
            styles.card,
            shadows.card,
            { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
          ]}
        >
          {HOME_SECTION_IDS.map((id, index) => {
            const row = homeSections[id];
            return (
              <View
                key={id}
                style={[
                  styles.sectionItem,
                  index < HOME_SECTION_IDS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                ]}
              >
                <View style={styles.sectionItemTop}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]}>{HOME_SECTION_LABELS[id]}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                      {row.visible ? (row.variant === 'compact' ? 'Compact layout' : 'Default layout') : 'Hidden on Home'}
                    </Text>
                  </View>
                  <Switch
                    value={row.visible}
                    onValueChange={(v) => {
                      dispatch(setHomeSectionVisible({ id, visible: v }));
                    }}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={row.visible ? colors.primary : undefined}
                    ios_backgroundColor={colors.border}
                  />
                </View>
                {row.visible ? (
                  <View style={styles.variantRow}>
                    <Text style={[styles.variantLabel, { color: colors.textSecondary }]}>Style</Text>
                    <View style={styles.segmentRowSm}>
                      {(['default', 'compact'] as const).map((v) => {
                        const on = row.variant === v;
                        return (
                          <TouchableOpacity
                            key={v}
                            style={[
                              styles.segSm,
                              { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.background },
                            ]}
                            onPress={() => dispatch(setHomeSectionVariant({ id, variant: v }))}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: on ? colors.primary : colors.textMuted, textTransform: 'capitalize' }}>
                              {v}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={() => dispatch(resetHomeLayout())}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Reset home layout to defaults</Text>
          </TouchableOpacity>
        </View>
      </View>

      {Platform.OS === 'web' ? (
        <Text style={[styles.webNote, { color: colors.textMuted }]}>Settings are saved in this browser (localStorage).</Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  lead: { fontSize: 13, lineHeight: 19, marginHorizontal: 20, marginBottom: 8 },
  block: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginLeft: 2 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { borderRadius: 12, padding: 14 },
  hint: { fontSize: 12, lineHeight: 18 },
  segmentRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  seg: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  segLabel: { fontSize: 15, fontWeight: '700' },
  pill: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  rowPick: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  sectionItem: { paddingVertical: 12 },
  sectionItemTop: { flexDirection: 'row', alignItems: 'center' },
  variantRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  variantLabel: { fontSize: 12, fontWeight: '700' },
  segmentRowSm: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'flex-end' },
  segSm: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  resetBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderRadius: 10, borderStyle: 'dashed' },
  webNote: { textAlign: 'center', fontSize: 11, marginTop: 20, paddingHorizontal: 24 },
});

export default DesignSettingsScreen;
