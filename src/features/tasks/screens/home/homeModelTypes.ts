import type { TFunction } from 'i18next';
import type { AppColors } from '../../../../app/theme/colors';
import type { ThemeSkin } from '../../../../app/theme/themeSkins';
export type GreetingState =
  | { kind: 'emoji'; text: string; emoji: string }
  | { kind: 'text'; text: string }
  | { kind: 'icon'; text: string; icon: 'greetingSun' | 'greetingDay' | 'greetingMoon' };

type HomeSectionRow = { visible: boolean; variant: 'default' | 'compact' };
export type HomeSectionsState = {
  quickAccess: HomeSectionRow;
  performance: HomeSectionRow;
  waitingForAction: HomeSectionRow;
  raiseRequest: HomeSectionRow;
  leaveSummary: HomeSectionRow;
  scadStar: HomeSectionRow;
  portal: HomeSectionRow;
  saahemLeaderboard: HomeSectionRow;
};

export interface HomeScreenModel {
  navigation: { navigate: (...args: any[]) => void };
  t: TFunction;
  colors: AppColors;
  shadows: any;
  fontFamily?: string;
  fontScale: number;
  skin: ThemeSkin;
  user: any;
  homeSections: HomeSectionsState;
  isLargeHero: boolean;
  homeHeroSize: 'large' | 'medium' | 'compact';
  heroL: any;
  currentYear: number;
  perfYear: number;
  setPerfYear: (y: number) => void;
  qaCardWidth: number;
  heroName: string;
  heroRole: string;
  profile: any;
  attendance: any;
  taskDash: any;
  leaveSummary: any;
  notifs: any[];
  unreadNotifs: any[];
  topServices: any[];
  waitingItems: any[];
  news: any[];
  announcements: any[];
  events: any[];
  offers: any[];
  videos: any[];
  winners: any[];
  totalDaysTaken: number;
  pendingRequests: number;
  hasUpcomingLeave: boolean;
  total: number;
  completed: number;
  delayed: number;
  overdue: number;
  inProgress: number;
  chartData: { label: string; val: number; color: string }[];
  completionRate: number;
  completionPctColor: string;
  refreshing: boolean;
  onRefresh: () => void;
  portalTab: 'news' | 'announcements' | 'events' | 'offers' | 'videos';
  setPortalTab: (k: 'news' | 'announcements' | 'events' | 'offers' | 'videos') => void;
  clock: Date;
  greeting: GreetingState;
  dateStr: string;
  timeStr: string;
  inTime: string | null;
  outTime: string | null;
  attStatus: string;
  qaC: boolean;
  perfC: boolean;
  waitC: boolean;
  raiseC: boolean;
  leaveC: boolean;
  starC: boolean;
  portC: boolean;
  saahemC: boolean;
  smTop: (c: boolean) => number;
  secPad: (c: boolean) => number;
  secTitleStyle: any[];
  rAtt: () => void;
  rTasks: () => void;
  rLeaveSum: () => void;
  rNotifs: () => void;
  rTopSvcs: () => void;
  rNews: () => void;
  rAnn: () => void;
  rEvents: () => void;
  rOffers: () => void;
  rVideos: () => void;
  rWinners: () => void;
  rWaiting: () => void;
  saahemRows: any[];
  saahemLoading: boolean;
  /** Display label for the leaderboard period, e.g. "Q1 2026" (current calendar quarter; same rule as web Saahem leaderboard). */
  saahemPeriodLabel: string;
  /** Subtitle under the Saahem section title (period + single vs multi-quarter copy). */
  saahemSubtitle: string;
  rSaahem: () => void;
}
