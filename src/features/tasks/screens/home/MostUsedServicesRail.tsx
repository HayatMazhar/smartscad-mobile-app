/**
 * MostUsedServicesRail
 * ----------------------------------------------------------------------------
 * Compact horizontally-scrolling rail of the user's most-used Sanadkom
 * services. Replaces the older chunky "service cards" (~140 wide × ~110 tall)
 * with low-profile pills (~auto wide × 44 tall):
 *
 *   ┌─────────────────────────┐  ┌─────────────────────────┐
 *   │ ⊙  Service name         │  │ ⊙  Service name         │   ← horizontal scroll
 *   └─────────────────────────┘  └─────────────────────────┘
 *
 *   • Tinted circular icon on the left (uses the same accentChroma palette
 *     so colours rotate exactly like the old design).
 *   • Single-line name on the right (no category subtitle — keeps each pill
 *     visually quiet, matches the People Spotlight redesign).
 *   • Inline header row with a thin "All →" link, no large section title.
 *
 * Vertical footprint is roughly 65–70 px (header + pill row) vs the old
 * ~145 px, so it frees up real estate without losing access.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedIcon from '../../../../shared/components/ThemedIcon';
import { serviceCategoryIcon } from '../../../../app/theme/semanticIcons';
import { accentChroma } from '../../../../app/theme/accentChroma';

type Nav = {
  navigate: (
    stack: 'Sanadkom',
    params:
      | { screen: 'ServiceCatalog' }
      | { screen: 'SubmitTicket'; params: { serviceId: string | number; serviceName: string } }
  ) => void;
};

type Props = {
  services: any[];
  /** Maximum number of pills to render. Defaults to 8. */
  limit?: number;
  navigation: Nav;
  colors: any;
  skin: any;
  fontFamily?: string;
  /** Optional override for the section header label. */
  title?: string;
  /** Optional override for the right-side action link label. */
  allLabel?: string;
};

const MostUsedServicesRail: React.FC<Props> = ({
  services,
  limit = 8,
  navigation,
  colors,
  skin,
  fontFamily,
  title = 'Most used services',
  allLabel = 'All →',
}) => {
  if (!services || services.length === 0) return null;

  const items = services.slice(0, limit);

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Inline header — small, single-row, no card wrapper. */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text, fontFamily },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Sanadkom', { screen: 'ServiceCatalog' })}
          activeOpacity={0.7}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text
            style={[styles.headerLink, { color: colors.primary, fontFamily }]}
            numberOfLines={1}
          >
            {allLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {items.map((svc, i) => {
          const accent = accentChroma(colors, skin, i);
          const iconName = serviceCategoryIcon(svc.groupName ?? svc.categoryName ?? '');
          return (
            <TouchableOpacity
              key={String(svc.id ?? i)}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('Sanadkom', {
                  screen: 'SubmitTicket',
                  params: { serviceId: svc.id, serviceName: svc.name },
                })
              }
              style={[
                styles.pill,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: skin.cardBorderWidth,
                  borderRadius: 999,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${accent}1F` },
                ]}
              >
                <ThemedIcon name={iconName} size={14} color={accent} />
              </View>
              <Text
                style={[styles.pillLabel, { color: colors.text, fontFamily }]}
                numberOfLines={1}
              >
                {svc.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
    minWidth: 0,
  },
  headerLink: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 12,
  },
  scroll: {
    gap: 8,
    paddingTop: 2,
    paddingBottom: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingLeft: 6,
    paddingRight: 14,
    maxWidth: 220,
    minHeight: 40,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
});

export default MostUsedServicesRail;
