/** Home tab layout — persisted with app settings. */

export type HeroBannerSize = 'large' | 'medium' | 'compact';

export type HomeSectionId =
  | 'quickAccess'
  | 'performance'
  | 'waitingForAction'
  | 'raiseRequest'
  | 'leaveSummary'
  | 'scadStar'
  | 'portal'
  | 'saahemLeaderboard';

/** default = current home design; compact = tighter spacing & type */
export type HomeSectionVariant = 'default' | 'compact';

export interface HomeSectionConfig {
  visible: boolean;
  variant: HomeSectionVariant;
}

export const HOME_SECTION_IDS: HomeSectionId[] = [
  'quickAccess',
  'performance',
  'waitingForAction',
  'raiseRequest',
  'leaveSummary',
  'scadStar',
  'portal',
  'saahemLeaderboard',
];

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  quickAccess: 'Quick access',
  performance: 'Performance',
  waitingForAction: 'Waiting for my action',
  raiseRequest: 'Raise a request',
  leaveSummary: 'Leave summary',
  scadStar: 'SCAD Star winners',
  portal: 'Latest news',
  saahemLeaderboard: 'Saahem leaderboard',
};
