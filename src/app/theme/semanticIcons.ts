/**
 * Semantic names → demo emoji (SCAD) + Ionicons (government themes).
 * Ionic set uses outline; optional `filled` for active tab / emphasis.
 */
export type SemanticIconName =
  | 'home'
  | 'tasks'
  | 'services'
  | 'more'
  | 'tabMore'
  | 'bell'
  | 'greetingSun'
  | 'greetingDay'
  | 'greetingMoon'
  | 'leave'
  | 'attendance'
  | 'team'
  | 'projects'
  | 'objectives'
  | 'kpis'
  | 'profile'
  | 'directory'
  | 'orgchart'
  | 'recognition'
  | 'appraisal'
  | 'training'
  | 'news'
  | 'events'
  | 'announcements'
  | 'circulars'
  | 'faqs'
  | 'offers'
  | 'gallery'
  | 'image'
  | 'ai'
  | 'notifications'
  | 'settings'
  | 'language'
  | 'logout'
  | 'design'
  | 'sectionWorkforce'
  | 'sectionProjects'
  | 'sectionHr'
  | 'sectionPortal'
  | 'chart'
  | 'star'
  | 'clock'
  | 'calendar'
  | 'airplane'
  | 'hourglass'
  | 'document'
  | 'ticket'
  | 'buildings'
  | 'chevronForward'
  | 'sparkles'
  | 'playCircle'
  | 'globe'
  | 'colorPalette'
  | 'type'
  | 'pencil'
  | 'sunny'
  // Quick access
  | 'qaTasks'
  | 'qaSanadkom'
  | 'qaLeave'
  | 'qaAttendance'
  | 'qaKpis'
  | 'qaProjects'
  | 'qaStar'
  | 'qaAi'
  // Service catalog guess
  | 'serviceIt'
  | 'serviceHr'
  | 'serviceMoney'
  | 'serviceBuild'
  | 'serviceLegal'
  | 'serviceAnnounce'
  | 'serviceData'
  | 'serviceDefault'
  // Portal tabs
  | 'tabNews'
  | 'tabAnnounce'
  | 'tabEvents'
  | 'tabOffers'
  | 'tabVideo'
  | 'like'
  | 'comment'
  // Waiting
  | 'waitTicket'
  | 'waitLeave'
  | 'waitTask'
  // Misc
  | 'megaphone'
  | 'ticketBusiness';

export const SEMANTIC_ICONS: Record<
  SemanticIconName,
  { emoji: string; ion: { outline: string; filled?: string } }
> = {
  home: { emoji: '🏠', ion: { outline: 'home-outline', filled: 'home' } },
  tasks: { emoji: '📋', ion: { outline: 'list-outline', filled: 'list' } },
  services: { emoji: '🎫', ion: { outline: 'file-tray-full-outline', filled: 'file-tray-full' } },
  more: { emoji: '☰', ion: { outline: 'menu-outline', filled: 'menu' } },
  /** Apps grid in reference screenshots */
  tabMore: { emoji: '▦', ion: { outline: 'apps-outline', filled: 'apps' } },
  bell: { emoji: '🔔', ion: { outline: 'notifications-outline', filled: 'notifications' } },
  greetingSun: { emoji: '☀️', ion: { outline: 'sunny-outline', filled: 'sunny' } },
  greetingDay: { emoji: '🌤️', ion: { outline: 'partly-sunny-outline', filled: 'partly-sunny' } },
  greetingMoon: { emoji: '🌙', ion: { outline: 'moon-outline', filled: 'moon' } },
  leave: { emoji: '📅', ion: { outline: 'calendar-outline', filled: 'calendar' } },
  attendance: { emoji: '⏰', ion: { outline: 'time-outline', filled: 'time' } },
  team: { emoji: '👥', ion: { outline: 'people-outline', filled: 'people' } },
  projects: { emoji: '📊', ion: { outline: 'bar-chart-outline', filled: 'bar-chart' } },
  objectives: { emoji: '🎯', ion: { outline: 'flag-outline', filled: 'flag' } },
  kpis: { emoji: '📈', ion: { outline: 'trending-up-outline', filled: 'trending-up' } },
  profile: { emoji: '👤', ion: { outline: 'person-outline', filled: 'person' } },
  directory: { emoji: '📒', ion: { outline: 'book-outline', filled: 'book' } },
  orgchart: { emoji: '🏢', ion: { outline: 'git-network-outline', filled: 'git-network' } },
  recognition: { emoji: '⭐', ion: { outline: 'star-outline', filled: 'star' } },
  appraisal: { emoji: '📋', ion: { outline: 'clipboard-outline', filled: 'clipboard' } },
  training: { emoji: '🎓', ion: { outline: 'school-outline', filled: 'school' } },
  news: { emoji: '📰', ion: { outline: 'newspaper-outline', filled: 'newspaper' } },
  events: { emoji: '📅', ion: { outline: 'calendar-number-outline', filled: 'calendar-number' } },
  announcements: { emoji: '📢', ion: { outline: 'megaphone-outline', filled: 'megaphone' } },
  circulars: { emoji: '📄', ion: { outline: 'documents-outline', filled: 'documents' } },
  faqs: { emoji: '❓', ion: { outline: 'help-circle-outline', filled: 'help-circle' } },
  offers: { emoji: '🏷️', ion: { outline: 'pricetags-outline', filled: 'pricetags' } },
  gallery: { emoji: '🖼️', ion: { outline: 'images-outline', filled: 'images' } },
  image: { emoji: '🖼️', ion: { outline: 'image-outline', filled: 'image' } },
  ai: { emoji: '🤖', ion: { outline: 'chatbubbles-outline', filled: 'chatbubbles' } },
  notifications: { emoji: '🔔', ion: { outline: 'notifications-outline', filled: 'notifications' } },
  settings: { emoji: '⚙️', ion: { outline: 'cog-outline', filled: 'cog' } },
  language: { emoji: '🌍', ion: { outline: 'language-outline', filled: 'language' } },
  logout: { emoji: '🚪', ion: { outline: 'log-out-outline', filled: 'log-out' } },
  design: { emoji: '🎨', ion: { outline: 'color-palette-outline', filled: 'color-palette' } },
  sectionWorkforce: { emoji: '👥', ion: { outline: 'people-circle-outline', filled: 'people-circle' } },
  sectionProjects: { emoji: '📈', ion: { outline: 'trending-up-outline', filled: 'trending-up' } },
  sectionHr: { emoji: '🏠', ion: { outline: 'business-outline', filled: 'business' } },
  sectionPortal: { emoji: '🌐', ion: { outline: 'earth-outline', filled: 'earth' } },
  chart: { emoji: '📊', ion: { outline: 'pie-chart-outline', filled: 'pie-chart' } },
  star: { emoji: '⭐', ion: { outline: 'star-outline', filled: 'star' } },
  clock: { emoji: '⏰', ion: { outline: 'time-outline', filled: 'time' } },
  calendar: { emoji: '📅', ion: { outline: 'calendar-outline', filled: 'calendar' } },
  airplane: { emoji: '✈️', ion: { outline: 'airplane-outline', filled: 'airplane' } },
  hourglass: { emoji: '⏳', ion: { outline: 'hourglass-outline', filled: 'hourglass' } },
  document: { emoji: '📄', ion: { outline: 'document-text-outline', filled: 'document-text' } },
  ticket: { emoji: '🎫', ion: { outline: 'receipt-outline', filled: 'receipt' } },
  buildings: { emoji: '🏢', ion: { outline: 'business-outline', filled: 'business' } },
  chevronForward: { emoji: '›', ion: { outline: 'chevron-forward', filled: 'chevron-forward' } },
  sparkles: { emoji: '✨', ion: { outline: 'sparkles-outline', filled: 'sparkles' } },
  playCircle: { emoji: '▶️', ion: { outline: 'play-circle-outline', filled: 'play-circle' } },
  globe: { emoji: '🌐', ion: { outline: 'earth-outline', filled: 'earth' } },
  colorPalette: { emoji: '🎨', ion: { outline: 'color-palette-outline', filled: 'color-palette' } },
  type: { emoji: '🔤', ion: { outline: 'text-outline', filled: 'text' } },
  pencil: { emoji: '✍️', ion: { outline: 'create-outline', filled: 'create' } },
  sunny: { emoji: '☀', ion: { outline: 'sunny-outline', filled: 'sunny' } },
  // Quick access
  qaTasks: { emoji: '📋', ion: { outline: 'list-outline', filled: 'list' } },
  qaSanadkom: { emoji: '🎫', ion: { outline: 'file-tray-full-outline', filled: 'file-tray-full' } },
  qaLeave: { emoji: '📅', ion: { outline: 'calendar-outline', filled: 'calendar' } },
  qaAttendance: { emoji: '⏰', ion: { outline: 'time-outline', filled: 'time' } },
  qaKpis: { emoji: '📊', ion: { outline: 'stats-chart-outline', filled: 'stats-chart' } },
  qaProjects: { emoji: '🏗️', ion: { outline: 'construct-outline', filled: 'construct' } },
  qaStar: { emoji: '⭐', ion: { outline: 'trophy-outline', filled: 'trophy' } },
  qaAi: { emoji: '🤖', ion: { outline: 'sparkles-outline', filled: 'sparkles' } },
  serviceIt: { emoji: '💻', ion: { outline: 'hardware-chip-outline', filled: 'hardware-chip' } },
  serviceHr: { emoji: '👥', ion: { outline: 'people-outline', filled: 'people' } },
  serviceMoney: { emoji: '💰', ion: { outline: 'wallet-outline', filled: 'wallet' } },
  serviceBuild: { emoji: '🏢', ion: { outline: 'business-outline', filled: 'business' } },
  serviceLegal: { emoji: '⚖️', ion: { outline: 'scale-outline', filled: 'scale' } },
  serviceAnnounce: { emoji: '📢', ion: { outline: 'megaphone-outline', filled: 'megaphone' } },
  serviceData: { emoji: '📁', ion: { outline: 'folder-open-outline', filled: 'folder-open' } },
  serviceDefault: { emoji: '📋', ion: { outline: 'apps-outline', filled: 'apps' } },
  tabNews: { emoji: '📰', ion: { outline: 'newspaper-outline', filled: 'newspaper' } },
  tabAnnounce: { emoji: '📢', ion: { outline: 'megaphone-outline', filled: 'megaphone' } },
  tabEvents: { emoji: '📅', ion: { outline: 'calendar-number-outline', filled: 'calendar-number' } },
  tabOffers: { emoji: '🏷️', ion: { outline: 'pricetags-outline', filled: 'pricetags' } },
  tabVideo: { emoji: '🎬', ion: { outline: 'play-circle-outline', filled: 'play-circle' } },
  like: { emoji: '❤️', ion: { outline: 'heart-outline', filled: 'heart' } },
  comment: { emoji: '💬', ion: { outline: 'chatbubble-outline', filled: 'chatbubble' } },
  waitTicket: { emoji: '🎫', ion: { outline: 'receipt-outline', filled: 'receipt' } },
  waitLeave: { emoji: '✈️', ion: { outline: 'airplane-outline', filled: 'airplane' } },
  waitTask: { emoji: '📋', ion: { outline: 'list-outline', filled: 'list' } },
  megaphone: { emoji: '📢', ion: { outline: 'megaphone-outline', filled: 'megaphone' } },
  ticketBusiness: { emoji: '🎫', ion: { outline: 'ticket-outline', filled: 'ticket' } },
};

const SERVICE_KEY_ICONS: Record<string, SemanticIconName> = {
  it: 'serviceIt',
  hr: 'serviceHr',
  finance: 'serviceMoney',
  gs: 'serviceBuild',
  legal: 'serviceLegal',
  strategy: 'serviceAnnounce',
  communication: 'serviceAnnounce',
  data: 'serviceData',
  training: 'serviceDefault',
  research: 'serviceData',
};

export function serviceCategoryIcon(name: string): SemanticIconName {
  const k = (name ?? '').toLowerCase();
  for (const [key, val] of Object.entries(SERVICE_KEY_ICONS)) {
    if (k.includes(key)) return val;
  }
  return 'serviceDefault';
}
