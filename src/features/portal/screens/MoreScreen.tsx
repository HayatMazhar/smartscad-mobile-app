import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { logout, setLanguage } from '../../auth/services/authSlice';
import ThemedIcon from '../../../shared/components/ThemedIcon';
import type { SemanticIconName } from '../../../app/theme/semanticIcons';
import { AI_ASSISTANT_ENABLED } from '../../../app/featureFlags';

interface MenuItem {
  key: string;
  icon: SemanticIconName;
  label: string;
  section: string;
  screen?: string;
}

const MoreScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows, skin, fontFamily, fontScale } = useTheme();
  const flatListCard =
    skin.cardBorderWidth > 0
      ? { shadowOpacity: 0, elevation: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, shadowColor: 'transparent' as const }
      : null;
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.auth.language);
  const isExecutive = useAppSelector((s) => s.auth.user?.isExecutive ?? false);

  // Filter menu items based on persona
  const allMenuItems: MenuItem[] = [
    { key: 'tasks', icon: 'tasks', label: isExecutive ? 'Action Items' : t('tabs.tasks', 'My Tasks'), section: 'workforce', screen: 'TaskList' },
    { key: 'leaveBalance', icon: 'chart', label: t('leave.balance'), section: 'workforce', screen: 'LeaveBalance' },
    { key: 'leaveHistory', icon: 'leave', label: t('leave.history'), section: 'workforce', screen: 'LeaveHistory' },
    { key: 'attendance', icon: 'attendance', label: t('attendance.title'), section: 'workforce', screen: 'Attendance' },
    { key: 'teamLeave', icon: 'team', label: 'Team Leave', section: 'workforce', screen: 'TeamLeave' },
    { key: 'projects', icon: 'projects', label: t('epm.myProjects'), section: 'projects', screen: 'ProjectList' },
    { key: 'pms', icon: 'objectives', label: t('pms.menuLabel', 'Strategic Performance Management'), section: 'projects', screen: 'PmsHub' },
    { key: 'kpis', icon: 'kpis', label: t('pms.kpis'), section: 'projects', screen: 'PmsKpisList' },
    { key: 'finance', icon: 'serviceMoney', label: t('finance.menuLabel', 'Finance'), section: 'finance', screen: 'FinanceDashboard' },
    { key: 'cashFlows', icon: 'chart', label: t('finance.cashFlowsLink', 'Browse cash flows'), section: 'finance', screen: 'CashFlowList' },
    { key: 'accountsExpenditure', icon: 'kpis', label: t('finance.accountsExpenditureLink', 'Accounts expenditure'), section: 'finance', screen: 'AccountsExpenditure' },
    { key: 'profile', icon: 'profile', label: t('hr.profile'), section: 'hr', screen: 'Profile' },
    { key: 'directory', icon: 'directory', label: t('hr.directory'), section: 'hr', screen: 'Directory' },
    { key: 'orgchart', icon: 'orgchart', label: t('hr.orgChart'), section: 'hr', screen: 'OrgChart' },
    { key: 'recognition', icon: 'recognition', label: 'SCAD Star Awards', section: 'hr', screen: 'Recognition' },
    { key: 'appraisal', icon: 'appraisal', label: 'Performance Appraisal', section: 'hr', screen: 'Appraisal' },
    { key: 'training', icon: 'training', label: 'Training', section: 'hr', screen: 'Training' },
    { key: 'news', icon: 'news', label: t('portal.news'), section: 'portal', screen: 'News' },
    { key: 'events', icon: 'events', label: t('portal.events'), section: 'portal', screen: 'Events' },
    { key: 'announcements', icon: 'announcements', label: t('portal.announcements'), section: 'portal', screen: 'Announcements' },
    { key: 'circulars', icon: 'circulars', label: t('portal.circulars'), section: 'portal', screen: 'Circulars' },
    { key: 'faqs', icon: 'faqs', label: t('portal.faqs'), section: 'portal', screen: 'FAQs' },
    { key: 'offers', icon: 'offers', label: 'Offers', section: 'portal', screen: 'Offers' },
    { key: 'videos', icon: 'tabVideo', label: 'Videos', section: 'portal', screen: 'Gallery' },
    ...(AI_ASSISTANT_ENABLED
      ? ([{ key: 'ai', icon: 'ai' as const, label: 'AI Assistant', section: 'ai', screen: 'AIChat' }] satisfies MenuItem[])
      : []),
  ];

  // Executives don't see these items (handled by not showing Create Task / Submit Ticket)
  // The filtering happens naturally since we don't include those in allMenuItems
  const menuItems = allMenuItems;

  const allSections: { key: string; title: string; icon: SemanticIconName }[] = [
    { key: 'workforce', title: 'Workforce', icon: 'sectionWorkforce' },
    { key: 'projects', title: 'Projects & Strategy', icon: 'sectionProjects' },
    { key: 'finance', title: 'Finance', icon: 'serviceMoney' },
    { key: 'hr', title: 'HR & Profile', icon: 'sectionHr' },
    { key: 'portal', title: 'Portal', icon: 'sectionPortal' },
    { key: 'ai', title: 'AI', icon: 'ai' },
  ];
  const sections = allSections.filter((s) => menuItems.some((m) => m.section === s.key));

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    dispatch(setLanguage(newLang));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {sections.map((section) => {
        const items = menuItems.filter((m) => m.section === section.key);
        return (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedIcon name={section.icon} size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily, fontSize: 13 * fontScale }]}>
                {section.title}
              </Text>
            </View>
            <View
              style={[
                styles.menuGroup,
                shadows.card,
                flatListCard,
                { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
              ]}
            >
              {items.map((item, idx) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuItem,
                    idx < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                  ]}
                  activeOpacity={0.6}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                  testID={`more.menu.${item.key}`}
                >
                  <View style={styles.menuLeft}>
                    <ThemedIcon name={item.icon} size={20} color={colors.primary} />
                    <Text style={[styles.menuText, { color: colors.text, fontFamily }]}>{item.label}</Text>
                  </View>
                  <ThemedIcon name="chevronForward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {/* Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedIcon name="settings" size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontFamily, fontSize: 13 * fontScale }]}>
            {t('common.settings')}
          </Text>
        </View>
        <View
          style={[
            styles.menuGroup,
            shadows.card,
            flatListCard,
            { backgroundColor: colors.card, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.6}
          >
            <View style={styles.menuLeft}>
              <ThemedIcon name="notifications" size={20} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text, fontFamily }]}>
                {t('notifications.title', 'Notifications')}
              </Text>
            </View>
            <ThemedIcon name="chevronForward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
            onPress={toggleLanguage}
            activeOpacity={0.6}
          >
            <View style={styles.menuLeft}>
              <ThemedIcon name="language" size={20} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text, fontFamily }]}>
                {language === 'en' ? 'العربية' : 'English'}
              </Text>
            </View>
            <View style={[styles.settingBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.settingBadgeText, { color: colors.primary }]}>
                {language.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}
            onPress={() => navigation.navigate('DesignSettings')}
            activeOpacity={0.6}
          >
            <View style={styles.menuLeft}>
              <ThemedIcon name="design" size={20} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.text, fontFamily }]}>Design & appearance</Text>
            </View>
            <ThemedIcon name="chevronForward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => dispatch(logout())}
            activeOpacity={0.6}
          >
            <View style={styles.menuLeft}>
              <ThemedIcon name="logout" size={20} color={colors.danger} />
              <Text style={[styles.menuText, { color: colors.danger, fontFamily }]}>
                {t('common.logout')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.footerVersion, { color: colors.textMuted }]}>
        Sanadkom · Statistics Centre Abu Dhabi · v1.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionIcon: { fontSize: 14 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuGroup: { borderRadius: 12, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { fontSize: 18 },
  menuText: { fontSize: 15, fontWeight: '500' },
  settingBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  settingBadgeText: { fontSize: 11, fontWeight: '700' },
  footerVersion: { textAlign: 'center', fontSize: 12, marginTop: 24 },
});

export default MoreScreen;
