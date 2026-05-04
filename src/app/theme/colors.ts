// SCAD Facelift / SCADv3 design tokens
// Source: profile.css, main-variables.scss, scad_theme.css

export const brand = {
  cobalt: '#0C4A94',
  sideMenu: '#0C4282',
  navy: '#05264A',
  navBar: '#EDF1F5',
  pageBg: '#F3F4F8',
  headerGradientStart: 'rgba(11, 80, 162, 0.25)',
  headerGradientEnd: 'rgba(16, 60, 124, 0.95)',
} as const;

export const lightColors = {
  // Brand
  primary: '#297DE3',
  primaryDark: '#2164B6',
  primaryLight: '#E4F0FF',
  primarySoft: 'rgba(153, 165, 188, 0.188)',

  // Semantic
  secondary: '#05264A',
  success: '#60C6B5',
  successSoft: '#28C76F',
  danger: '#F76161',
  dangerSoft: '#FF4C51',
  warning: '#F9BA53',
  warningSoft: '#FF9F43',
  info: '#0DCAF0',

  // Surfaces
  background: '#F3F4F8',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardTint: '#F4F8FF',
  greyCard: '#E5E8ED',
  stripe: '#F8FAFC',

  // Text
  text: '#05264A',
  textSecondary: '#788EA7',
  textMuted: '#ADB5BD',

  // Borders
  border: '#DEE2E6',
  borderLight: '#DAE5F0',
  divider: '#EBEBED',

  // Navigation
  navBar: '#EDF1F5',
  sideMenu: '#0C4282',
  sideMenuText: '#D0D0D0',
  sideMenuHover: '#AAFAFF',
  sideMenuIcon: '#16C7FF',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarInactive: '#788EA7',

  // Status bar
  statusBar: 'dark-content' as 'dark-content' | 'light-content',

  // Component-specific
  notification: '#F76161',
  inputBorder: '#DEE2E6',
  tableHeader: '#E4F0FF',
  badgeNavy: '#05264A',
  profileMeta: '#F1F5F9',
  profileMetaText: '#0F172A',
  profileMetaBorder: '#E2E8F0',

  // Progress states
  stepConnector: '#A6BDDA',
  stepGreen: '#28C76F',
  stepOrange: '#FF9F43',
  stepRed: '#FF4C51',

  // Home hero (navy “demo” header; overridable per color theme)
  homeHeroBackground: '#05264A',
  homeHeroText: '#FFFFFF',
  homeHeroTextMuted: 'rgba(255,255,255,0.6)',
  homeHeroSubtle: 'rgba(255,255,255,0.1)',
  homeHeroBorder: 'rgba(255,255,255,0.12)',
  homeStatusBar: 'light-content' as 'light-content' | 'dark-content',
  homeDecor1: 'rgba(41,125,227,0.08)',
  homeDecor2: 'rgba(96,198,181,0.06)',

  // Full-width bars / per-screen custom chrome (HR headers, org chart, etc.)
  stackHeaderBackground: '#05264A',
  stackHeaderText: '#FFFFFF',
  stackHeaderTint: '#FFFFFF',
  stackStatusBar: 'light-content' as 'light-content' | 'dark-content',
};

export const darkColors: typeof lightColors = {
  primary: '#4DA3FF',
  primaryDark: '#297DE3',
  primaryLight: '#1A2D47',
  primarySoft: 'rgba(77, 163, 255, 0.15)',

  secondary: '#A0C4FF',
  success: '#7DD8CB',
  successSoft: '#40D98F',
  danger: '#F08080',
  dangerSoft: '#FF6B6B',
  warning: '#FFD080',
  warningSoft: '#FFB366',
  info: '#5DE0F7',

  background: '#0F1117',
  surface: '#1A1D26',
  card: '#222636',
  cardTint: '#1E2333',
  greyCard: '#2A2E3A',
  stripe: '#1E2233',

  text: '#E4E6EB',
  textSecondary: '#8B9BB4',
  textMuted: '#5A6377',

  border: '#2E3344',
  borderLight: '#2E3344',
  divider: '#252836',

  navBar: '#1A1D26',
  sideMenu: '#0F1420',
  sideMenuText: '#8B9BB4',
  sideMenuHover: '#4DA3FF',
  sideMenuIcon: '#4DA3FF',

  tabBar: '#1A1D26',
  tabBarInactive: '#5A6377',

  statusBar: 'light-content' as const,

  notification: '#F08080',
  inputBorder: '#2E3344',
  tableHeader: '#1E2333',
  badgeNavy: '#4DA3FF',
  profileMeta: '#222636',
  profileMetaText: '#E4E6EB',
  profileMetaBorder: '#2E3344',

  stepConnector: '#3A4A66',
  stepGreen: '#40D98F',
  stepOrange: '#FFB366',
  stepRed: '#FF6B6B',

  homeHeroBackground: '#0A1628',
  homeHeroText: '#F8FAFC',
  homeHeroTextMuted: 'rgba(248,250,252,0.65)',
  homeHeroSubtle: 'rgba(255,255,255,0.08)',
  homeHeroBorder: 'rgba(255,255,255,0.1)',
  homeStatusBar: 'light-content' as 'light-content' | 'dark-content',
  homeDecor1: 'rgba(77,163,255,0.12)',
  homeDecor2: 'rgba(125,216,200,0.08)',

  stackHeaderBackground: '#0A1628',
  stackHeaderText: '#F8FAFC',
  stackHeaderTint: '#F8FAFC',
  stackStatusBar: 'light-content' as 'light-content' | 'dark-content',
};

export type AppColors = typeof lightColors;
