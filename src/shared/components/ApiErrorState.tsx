import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ThemedActivityIndicator from '../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/theme/ThemeContext';

/**
 * Shared API-error UI used everywhere a query fails.
 *
 * Rationale: previously many screens silently swallowed RTK Query failures and
 * defaulted to `?? 0` / `?? []`, which made backend outages look like genuine
 * "no data" / "all zeros" states. That is dangerous for executives and
 * managers who make decisions from those numbers. This component makes
 * failures explicit, in the user's language, with an actionable retry path
 * and a "contact support" hint.
 *
 * Usage:
 *   if (isError) {
 *     return <ApiErrorState onRetry={refetch} />;
 *   }
 *
 * Inline (smaller card variant) is also available.
 */

interface Props {
  /** Optional callback wired to the query's `refetch`. Hides retry button if absent. */
  onRetry?: () => void;
  /** Override the default "We couldn't load …" title. */
  title?: string;
  /** Override the default "Please try again or contact support." message. */
  message?: string;
  /** Compact mode for inline use inside cards (smaller padding, no big icon). */
  compact?: boolean;
  /** Show a loading spinner inside the retry button (during refetch). */
  isRetrying?: boolean;
}

const ApiErrorState: React.FC<Props> = ({
  onRetry,
  title,
  message,
  compact = false,
  isRetrying = false,
}) => {
  const { t } = useTranslation();
  const { colors, fontFamily, shadows } = useTheme();

  const headline =
    title ?? t('common.errorTitle', "We couldn't load this section");
  const body =
    message ??
    t(
      'common.errorBody',
      'The service is currently unavailable. Please try again, or contact IT support if the problem persists.',
    );

  return (
    <View
      style={[
        compact ? styles.cardCompact : styles.card,
        shadows?.card,
        { backgroundColor: colors.card, borderColor: `${colors.danger}33` },
      ]}
    >
      {!compact ? (
        <View style={[styles.iconBubble, { backgroundColor: `${colors.danger}1A` }]}>
          <Text style={[styles.iconText, { color: colors.danger }]}>!</Text>
        </View>
      ) : null}

      <Text
        style={[
          compact ? styles.titleCompact : styles.title,
          { color: colors.text, fontFamily },
        ]}
      >
        {headline}
      </Text>
      <Text
        style={[
          compact ? styles.messageCompact : styles.message,
          { color: colors.textSecondary, fontFamily },
        ]}
      >
        {body}
      </Text>

      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.85}
          disabled={isRetrying}
          style={[
            styles.retryBtn,
            { backgroundColor: colors.primary, opacity: isRetrying ? 0.6 : 1 },
          ]}
        >
          {isRetrying ? (
            <ThemedActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.retryText, { color: '#fff', fontFamily }]}>
              {t('common.retry', 'Retry')}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardCompact: {
    marginVertical: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  titleCompact: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  messageCompact: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 22,
    minWidth: 96,
    alignItems: 'center',
  },
  retryText: { fontSize: 13, fontWeight: '700' },
});

export default ApiErrorState;
