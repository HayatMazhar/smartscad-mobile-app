import type { SemanticIconName } from '../../../../app/theme/semanticIcons';
import { AI_ASSISTANT_ENABLED } from '../../../../app/featureFlags';

const QUICK_ACTIONS_ALL = [
  { name: 'qaTasks' as const, label: 'My Tasks', screen: 'More' as const, params: { screen: 'TaskList' } as const, color: '#297DE3', bg: '#E4F0FF' },
  { name: 'qaSanadkom' as const, label: 'Sanadkom', screen: 'Sanadkom' as const, color: '#60C6B5', bg: '#E8F8F5' },
  { name: 'qaLeave' as const, label: 'Leave', screen: 'More' as const, params: { screen: 'LeaveBalance' } as const, color: '#F9BA53', bg: '#FFF8E1' },
  { name: 'qaAttendance' as const, label: 'Attendance', screen: 'More' as const, params: { screen: 'Attendance' } as const, color: '#F76161', bg: '#FDEDED' },
  { name: 'qaKpis' as const, label: 'KPIs', screen: 'More' as const, params: { screen: 'KPIs' } as const, color: '#8B5CF6', bg: '#F3E5F5' },
  { name: 'qaProjects' as const, label: 'Projects', screen: 'More' as const, params: { screen: 'ProjectList' } as const, color: '#0DCAF0', bg: '#E0F7FA' },
  { name: 'qaStar' as const, label: 'SCAD Star', screen: 'More' as const, params: { screen: 'Recognition' } as const, color: '#EC4899', bg: '#FCE4EC' },
  { name: 'qaAi' as const, label: 'AI Chat', screen: 'More' as const, params: { screen: 'AIChat' } as const, color: '#10B981', bg: '#ECFDF5' },
] as const;

export const QUICK_ACTIONS = (
  AI_ASSISTANT_ENABLED ? QUICK_ACTIONS_ALL : QUICK_ACTIONS_ALL.filter((a) => a.name !== 'qaAi')
) as typeof QUICK_ACTIONS_ALL;

export const PORTAL_TABS = [
  { key: 'news' as const, label: 'News', icon: 'tabNews' as SemanticIconName },
  { key: 'announcements' as const, label: 'Announcements', icon: 'tabAnnounce' as SemanticIconName },
  { key: 'events' as const, label: 'Events', icon: 'tabEvents' as SemanticIconName },
  { key: 'offers' as const, label: 'Offers', icon: 'tabOffers' as SemanticIconName },
  { key: 'videos' as const, label: 'Videos', icon: 'tabVideo' as SemanticIconName },
] as const;

export const WINNER_COLOR_ROT = ['#297DE3', '#60C6B5', '#F9BA53', '#E74C3C', '#9B59B6', '#1ABC9C'];
export const NEWS_COLOR_ROT = ['#297DE3', '#1B3A5C', '#27548A', '#3A7BD5', '#2C3E50', '#0D47A1'];
export const ANN_COLOR_ROT = ['#1B3A5C', '#27548A', '#3A7BD5', '#2C3E50', '#34495E', '#1A237E'];

export function getInitials(name?: string) {
  if (!name) return 'U';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].charAt(0).toUpperCase() : (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase();
}
