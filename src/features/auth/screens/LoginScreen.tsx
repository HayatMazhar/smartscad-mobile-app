import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, StatusBar,
  ScrollView, Animated, useWindowDimensions, Image, FlatList, Modal,
  Dimensions, Pressable, I18nManager, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  useLoginMutation, useRequestOtpMutation, useVerifyOtpMutation, tryWindowsLogin,
  useGetDevUsersQuery, useImpersonateUserMutation, DevUser,
  useGetMicrosoftAuthConfigQuery,
} from '../services/authApi';
import type { AuthStackParamList } from '../../../app/navigation/AuthNavigator';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import {
  setCredentials, setPendingOtp, refreshPendingOtp, clearPendingOtp,
} from '../services/authSlice';
import { useTheme } from '../../../app/theme/ThemeContext';
import { API_BASE_URL } from '../../../store/baseApi';
import ProfileAvatar from '../../../shared/components/ProfileAvatar';

const isWeb = Platform.OS === 'web';

// Brand constants — shared by OTP step + landing glass card
const BRAND_NAVY = '#023C69';
const BRAND_NAVY_DARK = '#01294A';
const SCREEN_BG = '#FFFFFF';
const FIELD_BG = '#F4F6F9';
const FIELD_BORDER = '#E1E6ED';
const FIELD_BORDER_FOCUS = BRAND_NAVY;
const TEXT_PRIMARY = '#0A1F35';
const TEXT_SECONDARY = '#5C6B7A';
const TEXT_MUTED = '#8A96A3';
const DANGER = '#C0392B';
const DANGER_SOFT = '#FDECEA';
const WARN_AMBER = '#B7791F';
const WARN_AMBER_SOFT = '#FFF7E6';

const WIN_H = Dimensions.get('window').height;

/** Premium-dark landing background + ambient glows */
const LANDING_BG_DEEP = '#001F3D';
const LANDING_ACCENT_TEAL = '#1FB6C9';
const LANDING_ACCENT_GOLD = '#D4AF37';

/** Auto-rotating spotlight rows — cycles through Sanadkom capabilities (10 items). */
const SPOTLIGHT_ITEMS: { icon: string; title: string; body: string; accent: string }[] = [
  { icon: '📋', title: 'Tasks', body: 'Create, assign and complete work items wherever you are.', accent: '#1FB6C9' },
  { icon: '✅', title: 'Approvals', body: 'Act on leave, KPIs and workflow decisions in one tap.', accent: '#3DC36C' },
  { icon: '📊', title: 'Executive dashboards', body: 'Strategy, finance and performance insights on demand.', accent: '#FF9F1C' },
  { icon: '🏖️', title: 'Leave', body: 'Submit and track leave requests with full visibility.', accent: '#1FB6C9' },
  { icon: '🎫', title: 'Sanadkom tickets', body: 'Raise and follow internal support requests.', accent: '#9B59B6' },
  { icon: '🔔', title: 'Notifications', body: 'Stay current on assignments, mentions and reminders.', accent: '#E74C3C' },
  { icon: '📅', title: 'Calendar', body: 'See tasks and leave alongside your schedule.', accent: '#3498DB' },
  { icon: '🎯', title: 'KPIs & performance', body: 'Monitor goals, deliverables and delivery progress.', accent: '#16A085' },
  { icon: '🤝', title: 'Delegation', body: 'Work on behalf of colleagues when properly authorised.', accent: '#D4AF37' },
  { icon: '📎', title: 'Documents', body: 'Attach evidence and files where your workflow needs them.', accent: '#95A5A6' },
];

/** Premium dark login + glass card + rotating spotlight carousel (former variant G). */
const LoginLandingPremiumSpotlight: React.FC<{
  onMicrosoftSignIn: () => void;
  msAuthEnabled: boolean;
  msHint: string;
  busy?: boolean;
  belowSlot?: React.ReactNode;
}> = ({ onMicrosoftSignIn, msAuthEnabled, msHint, busy, belowSlot }) => {
  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(() => {
        setIdx((p) => (p + 1) % SPOTLIGHT_ITEMS.length);
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(id);
  }, [fade]);

  const f = SPOTLIGHT_ITEMS[idx];

  return (
    <View style={loginLandingStyles.shell}>
      <View style={loginLandingStyles.glowTop} />
      <View style={loginLandingStyles.glowBottom} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={loginLandingStyles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[loginLandingStyles.landingStack, { paddingTop: insets.top + 52 }]}>
          <View style={[loginLandingStyles.glassCard, loginLandingStyles.glassCardCompact]}>
            <View style={loginLandingStyles.cardLogoRing}>
              <Image source={require('../../../assets/sanadkom_icon.png')} style={loginLandingStyles.cardLogoImg} resizeMode="contain" />
            </View>
            <Text style={loginLandingStyles.cardEyebrow}>SANADKOM</Text>
            <Text style={loginLandingStyles.cardTitle}>Welcome aboard</Text>
            <Text style={loginLandingStyles.cardSub}>
              {"Your secure, single-tap gateway to SCAD's enterprise services."}
            </Text>
            {msAuthEnabled && (
              <View style={{ width: '100%', marginTop: 10 }}>
                <TouchableOpacity
                  onPress={onMicrosoftSignIn}
                  disabled={busy}
                  activeOpacity={0.85}
                  style={[loginLandingStyles.msBtn, busy && { opacity: 0.7 }]}
                >
                  <View style={loginLandingStyles.msLogo}>
                    <View style={[loginLandingStyles.msTile, { backgroundColor: '#F25022' }]} />
                    <View style={[loginLandingStyles.msTile, { backgroundColor: '#7FBA00' }]} />
                    <View style={[loginLandingStyles.msTile, { backgroundColor: '#00A4EF' }]} />
                    <View style={[loginLandingStyles.msTile, { backgroundColor: '#FFB900' }]} />
                  </View>
                  {busy ? (
                    <ThemedActivityIndicator color="#5E5E5E" size="small" />
                  ) : (
                    <Text style={loginLandingStyles.msBtnText}>Sign in with Microsoft</Text>
                  )}
                </TouchableOpacity>
                <Text style={loginLandingStyles.cardHint}>{msHint}</Text>
              </View>
            )}
          </View>

          <Animated.View style={[loginLandingStyles.spotlightCard, { opacity: fade }]}>
            <View style={loginLandingStyles.spotlightTopRow}>
              <View style={[loginLandingStyles.spotIcon, { backgroundColor: `${f.accent}33`, borderColor: `${f.accent}88` }]}>
                <Text style={loginLandingStyles.spotIconTxt}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={loginLandingStyles.spotTitle}>{f.title}</Text>
                <Text style={loginLandingStyles.spotBody} numberOfLines={2}>{f.body}</Text>
              </View>
            </View>
            <View style={loginLandingStyles.dotRow}>
              {SPOTLIGHT_ITEMS.map((_, i) => (
                <View key={i} style={[loginLandingStyles.dotH, i === idx && loginLandingStyles.dotHActive]} />
              ))}
            </View>
          </Animated.View>

          {/* Alternate sign-in + dev "Login As" above announcement so testers see it without scrolling past the card. */}
          {belowSlot ? <View style={loginLandingStyles.belowSlot}>{belowSlot}</View> : null}
          <LoginAnnouncementArea />
        </View>
      </ScrollView>
    </View>
  );
};

const loginLandingStyles = StyleSheet.create({
  shell: {
    flex: 1, backgroundColor: LANDING_BG_DEEP, minHeight: WIN_H,
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, minHeight: WIN_H },
  glowTop: {
    position: 'absolute', top: -100, right: -120,
    width: 320, height: 320, borderRadius: 9999,
    backgroundColor: LANDING_ACCENT_TEAL, opacity: 0.18,
  },
  glowBottom: {
    position: 'absolute', bottom: -120, left: -100,
    width: 360, height: 360, borderRadius: 9999,
    backgroundColor: LANDING_ACCENT_GOLD, opacity: 0.10,
  },
  landingStack: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 4,
  },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22, padding: 18,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.40, shadowRadius: 28, elevation: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  glassCardCompact: { padding: 16, paddingBottom: 18 },
  cardLogoRing: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#F4F8FC',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, marginTop: -42,
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: BRAND_NAVY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 7,
  },
  cardLogoImg: { width: 46, height: 46 },
  cardEyebrow: { fontSize: 10, fontWeight: '800', color: BRAND_NAVY, letterSpacing: 1.3, marginBottom: 4 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY, textAlign: 'center' },
  cardSub: { fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center', marginTop: 4, lineHeight: 17 },
  cardHint: { fontSize: 11, color: TEXT_MUTED, textAlign: 'center', marginTop: 6 },
  msBtn: {
    height: 46, borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#8C8C8C',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  msLogo: { width: 20, height: 20, flexDirection: 'row', flexWrap: 'wrap' },
  msTile: { width: 9, height: 9, margin: 0.5 },
  msBtnText: { fontSize: 15, fontWeight: '700', color: '#5E5E5E', letterSpacing: 0.2 },
  spotlightCard: {
    width: '100%', marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  spotlightTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  spotIcon: {
    width: 34, height: 34, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  spotIconTxt: { fontSize: 16 },
  spotTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  spotBody: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 2, lineHeight: 15 },
  dotRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 5, marginTop: 8,
  },
  dotH: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotHActive: {
    width: 18, backgroundColor: '#FFFFFF',
  },
  belowSlot: { marginTop: 14 },
});

const announcementStyles = StyleSheet.create({
  wrap: { width: '100%', marginTop: 14 },
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.38)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: LANDING_ACCENT_GOLD,
    opacity: 0.95,
  },
  cardAccentRtl: {
    left: undefined,
    right: 0,
  },
  /** Compact login row: small plaque left, copy right (matches earlier layout). */
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  compactThumb: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  compactTextCol: { flex: 1, minWidth: 0 },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: LANDING_ACCENT_GOLD,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    lineHeight: 20,
  },
  excerpt: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.78)',
    marginTop: 6,
    lineHeight: 15,
  },
  readFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  readMore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8D5A3',
    flex: 1,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    color: LANDING_ACCENT_GOLD,
    lineHeight: 24,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 12, 24, 0.72)',
  },
  modalSheet: {
    backgroundColor: '#FAF8F4',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    overflow: 'hidden',
    zIndex: 2,
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  /** Panoramic team photo — login-announcement-team.png (1024×367). Height scales with width so entire group stays visible (contain). */
  modalTeamHeroWrap: {
    width: '100%',
    backgroundColor: '#FAF8F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  modalTeamHero: {
    backgroundColor: '#FAF8F4',
    alignSelf: 'center',
  },
  modalScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: WIN_H * 0.42,
  },
  modalScrollInner: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    paddingHorizontal: 0,
    paddingTop: 0,
    lineHeight: 26,
  },
  modalBody: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalClose: {
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 28 : 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BRAND_NAVY,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

/** Bottom-of-login announcement card + cream bottom-sheet detail (reference: Excellence Award comms). */
const LoginAnnouncementArea: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { width: screenW } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const rtl = i18n.language?.startsWith('ar') ?? I18nManager.isRTL;

  /** login-announcement-team.png intrinsic ratio — panoramic; no height cap so nobody is cropped. */
  const TEAM_IMG_W = 1024;
  const TEAM_IMG_H = 367;
  const bannerH = Math.round(screenW * (TEAM_IMG_H / TEAM_IMG_W));

  return (
    <>
      <View style={announcementStyles.wrap}>
        <TouchableOpacity
          style={announcementStyles.card}
          onPress={() => setOpen(true)}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel={t('auth.announcement.readMore')}
        >
          <View style={[announcementStyles.cardAccent, rtl && announcementStyles.cardAccentRtl]} />
          <View style={[announcementStyles.cardRow, rtl && { flexDirection: 'row-reverse' }]}>
            <Image
              source={require('../../../assets/login-announcement-main-logo.png')}
              style={announcementStyles.compactThumb}
              resizeMode="contain"
            />
            <View style={announcementStyles.compactTextCol}>
              <Text style={[announcementStyles.badge, rtl && { textAlign: 'right' }]}>{t('auth.announcement.badge')}</Text>
              <Text style={[announcementStyles.title, rtl && { textAlign: 'right' }]} numberOfLines={2}>
                {t('auth.announcement.title')}
              </Text>
              <Text style={[announcementStyles.excerpt, rtl && { textAlign: 'right' }]} numberOfLines={2}>
                {t('auth.announcement.excerpt')}
              </Text>
              <View style={[announcementStyles.readFooter, rtl && { flexDirection: 'row-reverse' }]}>
                <Text style={announcementStyles.readMore} numberOfLines={2}>{t('auth.announcement.readMore')}</Text>
                <Text style={announcementStyles.chevron}>{rtl ? '‹' : '›'}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={announcementStyles.modalRoot}>
          <Pressable style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]} onPress={() => setOpen(false)} accessibilityRole="button" />
          <View style={announcementStyles.modalSheet}>
            {/* Full panoramic photo: dimensions match asset ratio; contain = entire group visible (no crop). */}
            <View style={[announcementStyles.modalTeamHeroWrap, { width: screenW }]}>
              <Image
                source={require('../../../assets/login-announcement-team.png')}
                style={[
                  announcementStyles.modalTeamHero,
                  {
                    width: screenW,
                    height: bannerH,
                    borderTopLeftRadius: 22,
                    borderTopRightRadius: 22,
                  },
                ]}
                resizeMode="contain"
              />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={announcementStyles.modalScroll}
              contentContainerStyle={announcementStyles.modalScrollInner}
            >
              <Text style={[announcementStyles.modalTitle, rtl && { textAlign: 'right' }]}>
                {t('auth.announcement.title')}
              </Text>
              <Text style={[announcementStyles.modalBody, rtl && { textAlign: 'right', writingDirection: 'rtl' }]}>
                {t('auth.announcement.body')}
              </Text>
            </ScrollView>
            <TouchableOpacity style={announcementStyles.modalClose} onPress={() => setOpen(false)} activeOpacity={0.85}>
              <Text style={announcementStyles.modalCloseText}>{t('auth.announcement.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

/** Temporary: hide AD username/password. Re-enable Microsoft + dev "Login As" only. Flip to false to restore password flow. */
const TEMP_HIDE_EMAIL_PASSWORD_LOGIN = true;

const LoginScreen: React.FC = () => {
  const { width: winW } = useWindowDimensions();
  const isWide = isWeb && winW > 768;
  const { t } = useTranslation();
  const { colors: tc } = useTheme();
  const dispatch = useAppDispatch();
  const pendingOtp = useAppSelector((s) => s.auth.pendingOtp);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  // Probe whether Microsoft sign-in is enabled server-side. If the config
  // call 404s (Enabled=false in appsettings) we hide the Microsoft button
  // and fall back to the username/password flow.
  const { data: msConfig } = useGetMicrosoftAuthConfigQuery();
  const msAuthEnabled = !!msConfig;
  // Reveal the username/password fields only when the user explicitly asks
  // for them (or when Microsoft sign-in is unavailable). Keeps the
  // happy-path screen down to a single big "Sign in with Microsoft" button.
  const [showPasswordForm, setShowPasswordForm] = useState(
    TEMP_HIDE_EMAIL_PASSWORD_LOGIN ? false : !msAuthEnabled,
  );
  useEffect(() => {
    if (TEMP_HIDE_EMAIL_PASSWORD_LOGIN) return;
    if (!msAuthEnabled) setShowPasswordForm(true);
  }, [msAuthEnabled]);
  const [login, { isLoading }] = useLoginMutation();
  const [requestOtp, { isLoading: otpResending }] = useRequestOtpMutation();
  const [verifyOtp, { isLoading: otpVerifying }] = useVerifyOtpMutation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // ── OTP step state ──────────────────────────────────────────────────
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpRemainingSec, setOtpRemainingSec] = useState(0);
  const otpInputRef = useRef<TextInput>(null);

  const devSkipSso = (() => {
    try { if (__DEV__) return true; } catch { /* __DEV__ not defined */ }
    const w = (globalThis as any).window;
    if (typeof w !== 'undefined' && w.location?.search?.includes('nosso')) return true;
    return false;
  })();

  const [ssoLoading, setSsoLoading] = useState(isWeb && !devSkipSso);
  const [ssoBusy, setSsoBusy] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  const runWindowsSso = async (silent = false) => {
    if (!silent) setSsoBusy(true);
    try {
      const result = await tryWindowsLogin();
      if (result) {
        dispatch(setCredentials({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        }));
        return true;
      }
      if (!silent) setError('Windows sign-in failed. Please sign in manually.');
      return false;
    } finally {
      setSsoBusy(false);
    }
  };

  useEffect(() => {
    if (!isWeb || devSkipSso) {
      setSsoLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const ok = await runWindowsSso(true);
      if (cancelled) return;
      if (!ok) setSsoLoading(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, devSkipSso]);

  useEffect(() => {
    if (ssoLoading) return;
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp, ssoLoading]);

  const handleLogin = async () => {
    setError('');
    try {
      const result = await login({ username, password }).unwrap();

      // Trusted device → tokens come back immediately, sign in.
      if (result.kind === 'tokens') {
        dispatch(setCredentials({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        }));
        return;
      }

      // Untrusted device → server emailed an OTP, switch to the OTP step.
      dispatch(setPendingOtp({
        otpSessionId: result.otpSessionId,
        maskedEmail: result.maskedEmail,
        username,
        displayName: result.user?.displayName,
        validitySeconds: result.validitySeconds,
        issuedAt: Date.now(),
        // 🚧 DEV / TEST ONLY — populated only when the API has Otp:DebugEchoCode enabled.
        debugCode: result.debugCode,
      }));
      setOtpCode('');
      setOtpError('');
      setOtpRemainingSec(result.validitySeconds);
    } catch (e: any) {
      // Differentiate "wrong password" (401) from "AD unreachable" (503) so
      // the user isn't told their credentials are wrong when the real issue
      // is a backend / Active Directory outage.
      const status: number | string | undefined = e?.status;
      const apiMsg: string | undefined = e?.data?.error || e?.error;
      if (status === 503) {
        setError(apiMsg || 'Sign-in service is temporarily unavailable. Please try again in a moment.');
      } else if (status === 401) {
        setError(apiMsg || t('auth.invalidCredentials'));
      } else if (typeof status === 'string' && status === 'FETCH_ERROR') {
        setError('Network error — could not reach the sign-in service.');
      } else {
        setError(apiMsg || t('auth.invalidCredentials'));
      }
    }
  };

  const handleOtpVerify = async () => {
    if (!pendingOtp) return;
    const code = otpCode.trim();
    if (code.length < 4) {
      setOtpError('Enter the verification code we just emailed.');
      return;
    }
    setOtpError('');
    try {
      const result = await verifyOtp({
        otpSessionId: pendingOtp.otpSessionId,
        code,
        trustDevice: true,
      }).unwrap();
      dispatch(setCredentials({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      }));
    } catch (e: any) {
      const status = e?.status;
      const apiMsg: string | undefined = e?.data?.error || e?.error;
      if (status === 401) setOtpError(apiMsg || 'Incorrect code. Please try again.');
      else if (status === 410) setOtpError('Code expired. Tap Resend code to get a new one.');
      else if (status === 429) setOtpError('Too many attempts. Please request a new code.');
      else setOtpError(apiMsg || 'Could not verify the code. Please try again.');
      setOtpCode('');
    }
  };

  const handleOtpResend = async () => {
    if (!pendingOtp) return;
    setOtpError('');
    try {
      const result = await requestOtp({ otpSessionId: pendingOtp.otpSessionId }).unwrap();
      dispatch(refreshPendingOtp({
        otpSessionId: result.otpSessionId,
        validitySeconds: result.validitySeconds,
        maskedEmail: result.maskedEmail,
        // 🚧 DEV / TEST ONLY — populated only when the API has Otp:DebugEchoCode enabled.
        debugCode: result.debugCode,
      }));
      setOtpRemainingSec(result.validitySeconds);
      setOtpCode('');
      otpInputRef.current?.focus();
    } catch (e: any) {
      const apiMsg: string | undefined = e?.data?.error || e?.error;
      setOtpError(apiMsg || 'Could not resend the code. Please try again.');
    }
  };

  const handleOtpCancel = () => {
    dispatch(clearPendingOtp());
    setOtpCode('');
    setOtpError('');
    setError('');
  };

  // Live OTP countdown — recompute every second from `pendingOtp.issuedAt`
  // so we don't drift on background/foreground.
  useEffect(() => {
    if (!pendingOtp) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - pendingOtp.issuedAt) / 1000);
      const remain = Math.max(0, pendingOtp.validitySeconds - elapsed);
      setOtpRemainingSec(remain);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingOtp]);

  // Auto-focus the OTP input the moment we enter the OTP step.
  useEffect(() => {
    if (pendingOtp) {
      // small delay so the modal/animation settles before iOS shows the keyboard
      const t = setTimeout(() => otpInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [pendingOtp]);

  const canSubmit = username.length > 0 && password.length > 0;
  const canVerifyOtp = otpCode.trim().length >= 4 && !otpVerifying;
  const fmtCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const devEnabled = true;
  const [devOpen, setDevOpen] = useState(false);
  const [devPickerOpen, setDevPickerOpen] = useState(false);
  const [devSearch, setDevSearch] = useState('');
  const [devSelected, setDevSelected] = useState<DevUser | null>(null);
  const { data: devUsers, isFetching: devLoading, error: devUsersError } =
    useGetDevUsersQuery(devSearch || undefined, { skip: !devEnabled || !devOpen });
  const devUsersErrorMsg = devUsersError
    ? (typeof devUsersError === 'object' && 'status' in devUsersError
        ? `HTTP ${(devUsersError as { status: number | string }).status}`
        : 'Network error')
    : null;
  const [impersonate, { isLoading: devImpLoading }] = useImpersonateUserMutation();

  const handleImpersonate = async (u: DevUser) => {
    try {
      setError('');
      const pick = u ?? devSelected;
      if (!pick) return;
      const result = await impersonate({ userId: pick.domainUserId || pick.userId }).unwrap();
      dispatch(setCredentials({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      }));
    } catch (e: any) {
      const msg = e?.data?.error || e?.error || 'Impersonation failed.';
      setError(`Impersonation failed: ${msg}`);
    }
  };

  const formScrollStyle = useMemo(
    () => [
      styles.formScrollBase,
      isWide ? styles.formScrollWide : styles.formScrollNarrow,
    ],
    [isWide],
  );
  // Strips the outer ScrollView's padding/scroll behaviour so a redesigned
  // login variant can render edge-to-edge and run its own scroll.
  const variantOwnsLayout = useMemo<ViewStyle>(
    () => ({ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, flexGrow: 1 }),
    [],
  );

  if (ssoLoading) {
    return (
      <View style={styles.ssoContainer}>
        <ThemedActivityIndicator size="large" color={BRAND_NAVY} />
        <Text style={styles.ssoText}>Signing in with your Windows account…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, !pendingOtp && styles.rootLandingDark]}>
      <StatusBar
        barStyle={pendingOtp ? 'dark-content' : 'light-content'}
        backgroundColor={pendingOtp ? SCREEN_BG : LANDING_BG_DEEP}
      />

      {pendingOtp ? (
        <View style={styles.brandStripe} />
      ) : null}

      <KeyboardAvoidingView
        style={[styles.formPanel, !pendingOtp && styles.formPanelLandingDark]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            formScrollStyle,
            // When a redesigned login variant is being shown, let the variant
            // own its own padding + scroll. Otherwise we get a doubly-padded,
            // doubly-scrolled landing screen.
            !pendingOtp && variantOwnsLayout,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!!pendingOtp}
        >
          <Animated.View
            style={[
              styles.formInner,
              !pendingOtp && { flex: 1 },
              { opacity: fadeIn, transform: [{ translateY: slideUp }] },
            ]}
          >
            {pendingOtp ? (
              // ── Step 2: OTP verification ────────────────────────────
              <View>
                {/* OTP step keeps the simple white-bg + centred logo chrome */}
                <View style={styles.logoHero}>
                  <Image
                    source={require('../../../assets/sanadkom_icon.png')}
                    style={styles.logoIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.otpTitle}>Verify it's you</Text>
                <Text style={styles.otpSubtitle}>
                  {pendingOtp.debugCode ? (
                    <>
                      Test mode is active — your 4-digit code is shown below.
                      Enter it to finish signing in
                      {pendingOtp.displayName ? `, ${pendingOtp.displayName}` : ''}.
                    </>
                  ) : (
                    <>
                      We've emailed a 4-digit code to{' '}
                      <Text style={styles.otpEmail}>{pendingOtp.maskedEmail}</Text>
                      . Enter it below to finish signing in
                      {pendingOtp.displayName ? `, ${pendingOtp.displayName}` : ''}.
                    </>
                  )}
                </Text>

                {/* 🚧 DEV / TEST ONLY — only present when the API has Otp:DebugEchoCode enabled. */}
                {pendingOtp.debugCode ? (
                  <TouchableOpacity
                    style={styles.otpDebugBanner}
                    onPress={() => { setOtpCode(pendingOtp.debugCode ?? ''); setOtpError(''); }}
                    activeOpacity={0.8}
                    accessibilityLabel={`Test mode — your verification code is ${pendingOtp.debugCode}`}
                  >
                    <Text style={styles.otpDebugBannerLabel}>TEST MODE — email skipped</Text>
                    <Text style={styles.otpDebugBannerCode}>{pendingOtp.debugCode}</Text>
                    <Text style={styles.otpDebugBannerHint}>Tap to fill</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Verification code</Text>
                  <View
                    style={[
                      styles.fieldWrap,
                      focusedField === 'otp' && { borderColor: FIELD_BORDER_FOCUS, backgroundColor: '#FFFFFF' },
                      otpError && { borderColor: DANGER, backgroundColor: DANGER_SOFT },
                    ]}
                  >
                    <TextInput
                      ref={otpInputRef}
                      style={[styles.fieldInput, styles.otpInput]}
                      placeholder="••••"
                      placeholderTextColor={TEXT_MUTED}
                      value={otpCode}
                      onChangeText={(v) => { setOtpCode(v.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                      keyboardType="number-pad"
                      autoCorrect={false}
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      maxLength={6}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={handleOtpVerify}
                    />
                  </View>
                  <View style={styles.otpMetaRow}>
                    <Text style={styles.otpMeta}>
                      {otpRemainingSec > 0
                        ? `Expires in ${fmtCountdown(otpRemainingSec)}`
                        : 'Code expired — tap Resend code.'}
                    </Text>
                    <TouchableOpacity
                      onPress={handleOtpResend}
                      disabled={otpResending}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.otpResend, otpResending && { opacity: 0.5 }]}>
                        {otpResending ? 'Sending…' : 'Resend code'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {otpError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{otpError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.signInBtn, !canVerifyOtp && styles.signInOff]}
                  onPress={handleOtpVerify}
                  disabled={!canVerifyOtp}
                  activeOpacity={0.85}
                >
                  {otpVerifying ? (
                    <ThemedActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.signInText}>Verify & sign in</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.otpBackBtn}
                  onPress={handleOtpCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.otpBackText}>← Use a different account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <LoginLandingPremiumSpotlight
                onMicrosoftSignIn={() => navigation.navigate('MicrosoftSignIn')}
                msAuthEnabled={msAuthEnabled}
                msHint="Use your SCAD work account (e.g. you@scad.gov.ae)"
                busy={ssoBusy}
                belowSlot={
                  <View style={styles.variantBelowPad}>
                      {!TEMP_HIDE_EMAIL_PASSWORD_LOGIN && msAuthEnabled && !showPasswordForm && (
                        <TouchableOpacity
                          style={styles.altLinkRow}
                          onPress={() => setShowPasswordForm(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.altLinkText}>Sign in another way →</Text>
                        </TouchableOpacity>
                      )}

                      {TEMP_HIDE_EMAIL_PASSWORD_LOGIN && !msAuthEnabled && (
                        <Text style={[styles.softHintMuted, styles.tempPasswordOffHint]} accessibilityRole="text">
                          Microsoft sign-in is not enabled for this endpoint. Username/password login is temporarily hidden — use Testing login below.
                        </Text>
                      )}

            {/* ── Username + password (alternate) ───────────────────────
                Hidden by default when Microsoft sign-in is enabled — the
                user has to opt into it via "Sign in another way".
                Disabled entirely while TEMP_HIDE_EMAIL_PASSWORD_LOGIN is true. */}
            {showPasswordForm && !TEMP_HIDE_EMAIL_PASSWORD_LOGIN && (
            <>
            {msAuthEnabled && (
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR USE PASSWORD</Text>
                <View style={styles.dividerLine} />
              </View>
            )}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <View
                style={[
                  styles.fieldWrap,
                  focusedField === 'user' && { borderColor: FIELD_BORDER_FOCUS, backgroundColor: '#FFFFFF' },
                  error && !username && { borderColor: DANGER, backgroundColor: DANGER_SOFT },
                ]}
              >
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. ad10014"
                  placeholderTextColor={TEXT_MUTED}
                  value={username}
                  onChangeText={(v) => { setUsername(v); setError(''); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('user')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View
                style={[
                  styles.fieldWrap,
                  focusedField === 'pass' && { borderColor: FIELD_BORDER_FOCUS, backgroundColor: '#FFFFFF' },
                  error && !password && { borderColor: DANGER, backgroundColor: DANGER_SOFT },
                ]}
              >
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={TEXT_MUTED}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.signInBtn, !canSubmit && styles.signInOff]}
              onPress={handleLogin}
              disabled={isLoading || !canSubmit}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ThemedActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signInText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Secured by Active Directory</Text>
              <View style={styles.dividerLine} />
            </View>
            </>
            )}

            {/* Dev "Login As" panel — UAT only */}
            {devEnabled && (
              <View style={styles.devPanel}>
                <TouchableOpacity
                  style={styles.devHeader}
                  activeOpacity={0.75}
                  onPress={() => setDevOpen((v) => !v)}
                  testID="auth.dev_panel_toggle"
                >
                  <View style={styles.devBadge}>
                    <Text style={styles.devBadgeText}>UAT</Text>
                  </View>
                  <Text style={styles.devTitle}>Login As (testing only)</Text>
                  <Text style={styles.devChevron}>{devOpen ? '▴' : '▾'}</Text>
                </TouchableOpacity>

                {devOpen && (
                  <View style={styles.devBody}>
                    <View style={styles.devDiagBox}>
                      <Text style={styles.devDiagLabel}>API</Text>
                      <Text style={styles.devDiagValue} numberOfLines={2}>{API_BASE_URL}</Text>
                      <Text style={styles.devDiagLabel}>Status</Text>
                      <Text
                        style={[
                          styles.devDiagValue,
                          { color: devUsersErrorMsg ? DANGER : devUsers ? '#1E7A4F' : TEXT_PRIMARY },
                        ]}
                      >
                        {devLoading
                          ? 'Loading…'
                          : devUsersErrorMsg
                            ? `Failed (${devUsersErrorMsg})`
                            : devUsers
                              ? `Loaded ${devUsers.length} users`
                              : 'Not loaded yet'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.devPickField}
                      activeOpacity={0.8}
                      onPress={() => setDevPickerOpen(true)}
                      testID="auth.dev_user_picker"
                    >
                      <Text style={styles.devPickLabel}>
                        {devSelected
                          ? devSelected.displayName
                          : devLoading ? 'Loading users…' : 'Select a user…'}
                      </Text>
                      <Text style={styles.devPickChevron}>▾</Text>
                    </TouchableOpacity>

                    {devSelected?.jobTitle || devSelected?.department ? (
                      <Text style={styles.devSelSub}>
                        {[devSelected.jobTitle, devSelected.department].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.devLoginBtn, (!devSelected || devImpLoading) && styles.devLoginOff]}
                      disabled={!devSelected || devImpLoading}
                      onPress={() => devSelected && handleImpersonate(devSelected)}
                      activeOpacity={0.85}
                      testID="auth.dev_sign_in"
                    >
                      {devImpLoading ? (
                        <ThemedActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.devLoginText}>
                          {devSelected ? `Sign in as ${devSelected.displayName}` : 'Sign in as selected user'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {isWeb && (
                      <TouchableOpacity
                        style={styles.devSsoBtn}
                        onPress={() => runWindowsSso(false)}
                        disabled={ssoBusy}
                        activeOpacity={0.85}
                      >
                        {ssoBusy ? (
                          <ThemedActivityIndicator color={WARN_AMBER} size="small" />
                        ) : (
                          <Text style={styles.devSsoText}>Try Windows sign-in (SSO)</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Modal
                  visible={devPickerOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setDevPickerOpen(false)}
                >
                  <View style={styles.devModalBack}>
                    <View style={styles.devModalCard}>
                      <View style={styles.devModalHeader}>
                        <Text style={styles.devModalTitle}>Select user</Text>
                        <TouchableOpacity
                          onPress={() => setDevPickerOpen(false)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={styles.devModalClose}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.devSearchInput}
                        placeholder="Search by name or login…"
                        placeholderTextColor={TEXT_MUTED}
                        value={devSearch}
                        onChangeText={setDevSearch}
                        autoCorrect={false}
                        autoCapitalize="none"
                        testID="auth.dev_user_search"
                      />
                      {devLoading ? (
                        <View style={styles.devListLoading}>
                          <ThemedActivityIndicator color={BRAND_NAVY} />
                        </View>
                      ) : (
                        <FlatList
                          data={devUsers ?? []}
                          keyExtractor={(u) => u.domainUserId || u.userId}
                          keyboardShouldPersistTaps="handled"
                          contentContainerStyle={{ paddingBottom: 8 }}
                          ListEmptyComponent={
                            <Text style={styles.devListEmpty}>No users found.</Text>
                          }
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.devListRow}
                              activeOpacity={0.7}
                              testID="auth.dev_user_row"
                              onPress={() => {
                                setDevSelected(item);
                                setDevPickerOpen(false);
                              }}
                            >
                              <ProfileAvatar
                                userId={item.domainUserId || item.userId}
                                name={item.displayName || item.userId}
                                size={40}
                                borderRadius={20}
                              />
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.devRowName} numberOfLines={1}>
                                  {item.displayName || item.userId}
                                </Text>
                                <Text style={styles.devRowSub} numberOfLines={1}>
                                  {[item.userId, item.jobTitle, item.department].filter(Boolean).join(' · ')}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          )}
                        />
                      )}
                    </View>
                  </View>
                </Modal>
              </View>
            )}
                    </View>
                  }
              />
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Statistics Centre logo — anchored to the bottom of the screen. */}
      <View style={styles.bottomBrand} pointerEvents="none">
        <Image
          source={
            pendingOtp
              ? require('../../../assets/scad-logo-official.png')
              : require('../../../assets/scad-logo-white.png')
          }
          style={styles.bottomLogo}
          resizeMode="contain"
        />
        <Text style={[styles.footerCopy, !pendingOtp && styles.footerCopyOnDark]}>
          © {new Date().getFullYear()} · v1.0.0
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ssoContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 16, backgroundColor: SCREEN_BG,
  },
  ssoText: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },

  root: { flex: 1, backgroundColor: SCREEN_BG },
  rootLandingDark: { backgroundColor: LANDING_BG_DEEP },

  brandStripe: {
    height: 4, width: '100%', backgroundColor: BRAND_NAVY,
  },

  // ── Logo ─────────────────────────────────────────────────────────────
  // Icon-only Sanadkom mark sits in a large hero block at the top of the
  // screen, on plain white. No wordmark, no extra heading — the icon is
  // the brand statement. Sits centred on mobile, off-centre on tablet/web.
  logoHero: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    marginTop: 36, marginBottom: 32,
  },
  logoIcon: {
    width: 132, height: 132,
  },

  // ── Form ─────────────────────────────────────────────────────────────
  formPanel: { flex: 1, backgroundColor: SCREEN_BG },
  formPanelLandingDark: { backgroundColor: LANDING_BG_DEEP },
  formScrollBase: { maxWidth: 460, alignSelf: 'center', width: '100%' },
  formScrollNarrow: {
    flexGrow: 1, justifyContent: 'flex-start',
    paddingTop: 8, paddingBottom: 160, paddingHorizontal: 22,
  },
  formScrollWide: {
    flexGrow: 1, justifyContent: 'center',
    paddingTop: 24, paddingBottom: 180, paddingHorizontal: 32,
  },
  formInner: {},

  // Adds horizontal padding around the warnings, password form and dev
  // panel that each login variant injects via its `belowSlot` prop.
  variantBelowPad: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY,
    marginBottom: 7, letterSpacing: 0.6, textTransform: 'uppercase',
  },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: FIELD_BG, borderColor: FIELD_BORDER, borderWidth: 1,
    borderRadius: 12, height: 52, paddingHorizontal: 14,
  },
  fieldInput: {
    flex: 1, fontSize: 15, fontWeight: '500',
    color: TEXT_PRIMARY, paddingVertical: 0,
  },
  eyeIcon: {
    fontSize: 12, fontWeight: '700', color: BRAND_NAVY,
    paddingLeft: 12, letterSpacing: 0.4,
  },

  // ── OTP step ─────────────────────────────────────────────────────────
  otpTitle: {
    fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY,
    marginBottom: 8, letterSpacing: 0.2,
  },
  otpSubtitle: {
    fontSize: 14, fontWeight: '400', color: TEXT_SECONDARY,
    marginBottom: 22, lineHeight: 20,
  },
  otpEmail: { fontWeight: '700', color: TEXT_PRIMARY },
  otpInput: {
    fontSize: 22, fontWeight: '700', letterSpacing: 8,
    textAlign: 'center',
  },
  otpMetaRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8,
  },
  otpMeta: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED },
  otpResend: { fontSize: 12, fontWeight: '700', color: BRAND_NAVY, letterSpacing: 0.3 },
  otpBackBtn: { alignSelf: 'center', marginTop: 18, padding: 8 },
  otpBackText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  // 🚧 DEV / TEST ONLY — surfaced when API has Otp:DebugEchoCode enabled.
  otpDebugBanner: {
    backgroundColor: '#FFF7E6',
    borderColor: '#F5C26B',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  otpDebugBannerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A5A00',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  otpDebugBannerCode: {
    fontSize: 26,
    fontWeight: '800',
    color: '#5C3D00',
    letterSpacing: 8,
  },
  otpDebugBannerHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A5A00',
    marginTop: 4,
    letterSpacing: 0.4,
  },

  errorBanner: {
    backgroundColor: DANGER_SOFT, borderColor: DANGER, borderWidth: 1,
    borderRadius: 10, padding: 11, marginBottom: 8,
  },
  errorText: { fontSize: 13, fontWeight: '600', color: DANGER },

  signInBtn: {
    height: 52, borderRadius: 12, marginTop: 4,
    backgroundColor: BRAND_NAVY,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BRAND_NAVY_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  signInOff: { opacity: 0.35 },
  signInText: {
    color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.6,
  },

  // ── Microsoft sign-in primary CTA ────────────────────────────────────
  // Branded after Microsoft's official "Sign in with Microsoft" button.
  // White surface, dark text, the four-square Microsoft logo on the left.
  msBtn: {
    height: 54, borderRadius: 12, marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#8C8C8C',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  msBtnText: {
    fontSize: 16, fontWeight: '600', color: '#5E5E5E', letterSpacing: 0.2,
  },
  msHint: {
    fontSize: 12, color: TEXT_MUTED, fontWeight: '500',
    textAlign: 'center', marginTop: 8, letterSpacing: 0.2,
  },
  softHintMuted: {
    fontSize: 13, color: TEXT_SECONDARY,
    lineHeight: 18, textAlign: 'center',
  },
  tempPasswordOffHint: {
    marginTop: 12,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  msLogo: {
    width: 22, height: 22, flexDirection: 'row', flexWrap: 'wrap',
  },
  msTile: { width: 10, height: 10, margin: 0.5 },
  msTileTL: { backgroundColor: '#F25022' },
  msTileTR: { backgroundColor: '#7FBA00' },
  msTileBL: { backgroundColor: '#00A4EF' },
  msTileBR: { backgroundColor: '#FFB900' },

  altLinkRow: {
    alignSelf: 'center', marginTop: 22, padding: 8,
  },
  altLinkText: {
    fontSize: 13, fontWeight: '700', color: BRAND_NAVY, letterSpacing: 0.3,
  },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginVertical: 22,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: FIELD_BORDER },
  dividerText: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.4,
    color: TEXT_MUTED,
  },

  // ── Bottom brand mark ─────────────────────────────────────────────────
  // Anchored absolutely to the bottom of the screen (same coordinates as
  // the splash screen) so the official SCAD logo always lands in the same
  // visual spot whether the user is on the splash or the login.
  bottomBrand: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLogo: {
    // Match the splash screen footer size for a consistent brand footprint.
    width: 150, height: 60,
  },
  footerCopy: {
    fontSize: 10, fontWeight: '500', color: TEXT_MUTED,
    marginTop: 8, letterSpacing: 0.3,
  },
  footerCopyOnDark: {
    color: 'rgba(255,255,255,0.55)',
  },

  // ── Dev "Login As" panel ─────────────────────────────────────────────
  devPanel: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: WARN_AMBER,
    backgroundColor: WARN_AMBER_SOFT,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  devHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  devBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    backgroundColor: WARN_AMBER,
  },
  devBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  devTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },
  devChevron: { fontSize: 14, fontWeight: '700', color: TEXT_SECONDARY },
  devBody: { marginTop: 10, gap: 10 },
  devDiagBox: {
    backgroundColor: '#FFFFFF', borderColor: '#EFE0BF', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 2,
  },
  devDiagLabel: {
    fontSize: 9, fontWeight: '800', letterSpacing: 0.6,
    textTransform: 'uppercase', color: TEXT_MUTED, marginTop: 2,
  },
  devDiagValue: { fontSize: 11, fontWeight: '600', color: TEXT_PRIMARY },
  devPickField: {
    height: 44, borderRadius: 10, borderWidth: 1, borderColor: WARN_AMBER,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
  },
  devPickLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  devPickChevron: { fontSize: 14, fontWeight: '700', color: TEXT_SECONDARY },
  devSelSub: { fontSize: 11, color: TEXT_SECONDARY, marginTop: -4 },
  devLoginBtn: {
    height: 44, borderRadius: 10,
    backgroundColor: WARN_AMBER,
    justifyContent: 'center', alignItems: 'center',
  },
  devLoginOff: { opacity: 0.45 },
  devLoginText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  devSsoBtn: {
    height: 40, borderRadius: 10, borderWidth: 1, borderColor: WARN_AMBER,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  devSsoText: { fontSize: 13, fontWeight: '700', color: WARN_AMBER },

  devModalBack: {
    flex: 1, backgroundColor: 'rgba(2,60,105,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  devModalCard: {
    width: '100%', maxWidth: 460, maxHeight: '80%',
    borderRadius: 16, padding: 14, backgroundColor: '#FFFFFF',
  },
  devModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  devModalTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  devModalClose: { fontSize: 18, fontWeight: '700', color: TEXT_SECONDARY },
  devSearchInput: {
    height: 42, borderRadius: 10, borderWidth: 1, borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
    paddingHorizontal: 12, fontSize: 14, marginBottom: 8, color: TEXT_PRIMARY,
  },
  devListLoading: { padding: 24, alignItems: 'center' },
  devListEmpty: { textAlign: 'center', padding: 20, color: TEXT_MUTED },
  devListRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#EEF1F5',
  },
  devRowName: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  devRowSub: { fontSize: 11, marginTop: 1, color: TEXT_SECONDARY },
});

export default LoginScreen;
