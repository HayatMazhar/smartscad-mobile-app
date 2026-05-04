/**
 * SCAD RBAC Assets & Roles — extracted from:
 *   1. Legacy code: Shared\Classes\Enums\AssetsEnum.cs + each module's *Role.cs
 *   2. Live DB: SMARTHELP_BETA.AssetManagement.AccessRole
 *
 * Source of truth is the DB. Enum file is a TypeScript mirror for compile-time safety.
 * Updated: 2026-04-23 — validated against AccessRole table (465 active roles across 45 modules).
 */

// ============================================================
// ASSET IDs — one constant per module (mirrors AssetsEnum.cs)
// ============================================================
export const Asset = {
  // Core apps
  TaskManagement:        165,
  SmartHelp_Sanadkom:    166,
  SmartStatistics:       167,
  SmartSupport:          168,
  AssetManagement:       169,
  Correspondence:        170,
  eArchiving:            171,
  LeadershipDashboard:   172,
  HR:                    173,
  EnumeratorsRecruitment: 174,
  Attendance:            175,
  Appraisal:             176,
  eLibrary:              177,
  PMS:                   178,
  EPM:                   179,
  Publisher:             180,
  Website:               181,
  Metadata:              182,
  EmployeeOfTheMonth:    183,
  CentralDatabase:       184,
  Sallatana:             185,
  SYB:                   187,
  DocumentCenter:        188,
  TeamSite:              189,
  IBDAA:                 190,
  mServices:             191,
  DatabaseCatalogue:     192,
  SurveyEngine:          193,
  ADSmartSupportMobile:  194,

  // Governance sub-apps
  ComplianceManagement:  300,
  SLAManagement:         13849,
  AuditManagement:       15119,
  RiskManagement:        15120,
  Committee:             18044,
  BusinessContinuity:    18045,
  PolicyManagement:      18046,
  HealthSafety:          18047,

  // Strategy / statistics
  STI:                   15128,
  StatisticalMaturity:   17353,
  PublicationCalendar:   17749,
  CustomerHappiness:     17760,
  StatisticalCalendar:   17764,
  StatisticsDevelopment: 17761,
  KOIDashboard:          17763,
  EntityProfile:         18337,
  VacancyPlan:           18340,
  SurveysManagement:     25994,
  StatisticalPortfolio_Legacy: 25995,
  StatisticalPortfolio:  31044,

  // Utility / other
  ContentManagement_SiteAdmin: 18094,
  ExecutiveDashboard:    5602,
  Feedback:              18162,
  DelegationRights:      20312,
  HQMovement:            19600,
  StakeholderManagement: 19599,
  Finance:               19512,
  ServiceEmails:         31814,
  Employee_Recognition_Program: 33777,
  StatisticsProduction:  19598,
  BusinessIntelligence:  25993,
  Thankyou:              18570,
  DataVisualization:     20313,
  Bayaan:                35649,
  D4G:                   35502,
} as const;

// ============================================================
// ROLE IDs — per asset. Extracted from AccessRole table.
// ============================================================

/** Task Management (AssetID=165) */
export const TaskManagementRole = {
  AdminUser:          0,
  StandardUser:       1,
  ThreeSixtyDashboard: 3,
  TaskPerformance:    4,
  Delegation:         5,
  DelegateAdmin:      6,
} as const;

/** Sanadkom / SmartHelp (AssetID=166) */
export const SanadkomRole = {
  AdminUser:             1,
  ITReader:              2,
  GSReader:              3,
  HRServicesReader:      4,
  ProcurementReader:     5,
  FinanceReader:         6,
  StrategyReader:        7,
  PMOReader:             8,
  STIReader:             9,
  CommunicationReader:  10,
  DashboardAdmin:       11,
  CheckTicketTasks:     12,
  LeaveReader:          13,
  LegalDashboardAccess: 15,
  ServiceController_CheckDetails: 17,
  ServiceController_Admin: 18,
  AccessOtherEntities:  20,
  EnableDisableEmailNotification: 21,
  ViewQualityReports:   22,
  AssetAckReminders:    50,
  IFPEmailTeam:         51,
  TechnicalSupport:    100,
  ServiceDesk:         101,
  Messaging:           102,
  NetworkSecurity:     103,
  ApplicationsGIS:     104,
  DataServicesReader:  105,
  ServersStorage:      106,
  InformationSecurity: 107,
  ProcurementAdmin:    108,
  CommunicationTeamGroup: 110,
  UpdateKOIsAccess:    111,
  InfraTeamReport:     112,
  EnterpriseArchitectureRead: 115,
  ReadOnlyDeptContracts: 116,
  GSProtocol:          120,
  GSMeetingOrganizers: 121,
  COI:                 125,
  ServiceDeliveryReports: 130,
  TransportReader:     200,
  ChangeRequestReader: 201,
  CISO:                300,
  PortfolioRequestsReadOnly: 301,
  ServiceAvgRatingDashboard: 302,
  ServiceAvgRatingData: 303,
  ServiceAvgRatingDataAll: 304,
  ServiceAvgRatingDataKPI: 305,
  HappinessDashboard:  306,
  WalkingRegistration: 307,
  BayaanInsightsRead:  308,
  InfraDatacenterEmail: 309,
  QuotaIncreaseEmail:  310,
  DemandsDashboard:    311,
} as const;

/** Asset Management (AssetID=169) */
export const AssetMgmtRole = {
  AdminUser:          1,
  Viewer:             2,
  ITInfra:            3,
  GSAdmin:            4,
  ITApp:              5,
  ITDatabase:         6,
  ProcurementContracts: 7,
  AllApplications:    9,
  BypassCustodian:   10,
  ITSoftware:        11,
  AssetRenewalRequests: 12,
  EmailGroupNotifications: 30,
} as const;

/** HR (AssetID=173) — mirrors ProfileRole.cs */
export const HRRole = {
  HRAdmin:            1,
  ReadEmployeeProfile: 2,
  EditEmployeeProfile: 3,
  ResourcesPool:      4,
  JobViewer:          5,
  JobEditor:          6,
  Recruiter:          7,
  HRTopManagement:    8,
  ViewAllEntities:    9,
  PersonalDevelopmentAdmin: 10,
  PersonalDevelopmentReadOnly: 11,
  OrgStructureEdit:   12,
  GradeEdit:          13,
  EditOfferLetters:   14,
  ViewOfferLetters:   15,
  ViewReports:        16,
  AuditProfiles2021Plus: 17,
  ViewApplicants:     18,
  EditApplicants:     19,
  EditVolunteersOutsource: 20,
  NewTrainingApprovals: 21,
  DocApprovalContractualStaff: 22,
  OnboardingSurveyReport: 23,
  AccountExpiryEmail: 24,
  DeclarationsReport: 25,
  SecurityClearanceExpiry: 26,
  ChildrenRelativesReport: 27,
  ProfileEmergencyContacts: 28,
  ProbationEmailSender: 29,
} as const;

/** Attendance (AssetID=175) */
export const AttendanceRole = {
  AdminUser:          1,
  AuthorizedUser:     2,
  AttendanceReport:   3,
  HR:                 4,
  HRApproval:         5,
  AttendanceReportAll: 6,
  Deduction:          7,
  DisciplineUser:     8,
  ExecutiveApproval:  9,
  ExtendMonthLimit:  10,
  DisciplineAdminUser: 11,
  DisciplineReport:  12,
  DisciplineSummaryUser: 13,
  AttendancePerfReport: 14,
  AttendanceReportAdhoc: 15,
  AttendanceRecordDashboard: 16,
  StaffEntry:        17,
  VolunteerAdmin:    18,
  AdhocVolunteer:    19,
  AdhocContractual:  20,
  AdhocStatistics:   21,
  StaffEntryEditTime: 22,
  DNAFusionCardAccess: 23,
  ViewLeavesOnManagerBehalf: 24,
  AdhocForesightsComms: 25,
  AdhocCorporateSupport: 26,
} as const;

/** Appraisal (AssetID=176) — mirrors AppraisalRole.cs */
export const AppraisalRole = {
  Admin:              1,
  TopManagement:      2,
  Settings:           3,
  Dashboard:          4,
  NormalizationDashboard: 5,
  EvaluationViewer:   6,
  ObjectivesEdit:     7,
  Reports:            8,
  ReEvaluation:       9,
} as const;

/** PMS — Strategic Performance Mgmt (AssetID=178) — mirrors PMSRole.cs */
export const PMSRole = {
  AnyRole:            0,
  Admin:              1,
  StrategyTeam:       2,
  ServiceCost:        3,
  ExcellenceGapsAdmin: 4,
  RevokeApprovals:    5,
  TopManagement:      6,
  CorporatePerformancePlanning: 7,
  DeliverableAdmin:   8,
  DeliverableApprover: 9,
} as const;

/** EPM (AssetID=179) — mirrors EPMRole.cs */
export const EPMRole = {
  AnyRole:            0,
  Admin:              1,
  PMOTeam:            2,
  FinanceTeam:        3,
  TopManagement:      4,
  BTUAdmin:           5,
  NotificationsReceiver: 6,
  EPMEditMilestone:   7,
  ReadOnlyAllProjects: 8,
} as const;

/** IBDAA (AssetID=190) — mirrors IbdaaRole.cs */
export const IBDAARole = {
  AnyRole:            0,
  TeamLeader:         1,
  CommitteeMember:    2,
  CommitteeChairman:  3,
  Consultant:         4,
  TopManagement:      5,
  AlmandoosTeam:      6,
} as const;

/** Compliance Management (AssetID=300) */
export const ComplianceRole = {
  SystemAdmin:        1,
  TopManagement:      2,
  ComplianceTeam:     3,
  RegulationsManager: 4,
  LegislativeImpactsManager: 5,
  ViewComplianceRegistry: 6,
  ChampionsManager:   7,
  ViewDashboard:      8,
} as const;

/** Stakeholder Management (AssetID=19599) — mirrors UserRole.cs */
export const StakeholderRole = {
  Administrator:      1,
  AlterStakeholders:  2,
  AlterAgreements:    3,
  UpdateSLAAgreements: 4,
  UpdateStatEcosystem: 5,
  UpdateIFP:          6,
  UpdateDataExchange: 7,
  UpdateOtherTypes:   8,
  UpdateMoU:          9,
  UpdateMoUAppendices: 10,
  ViewDDI:           11,
  ViewCRM:           12,
  ViewPerfIndicators: 13,
  ViewStatValues:    14,
  ViewChallenges:    15,
  ViewMoMs:          16,
  ViewEvents:        17,
  ViewSetUpdatedEntity: 18,
  ViewAgreementDocs: 19,
  ExternalMeetingsDashboard: 20,
  ExternalMeetingsFillNotification: 21,
  ExternalMeetingsHigherMgmtNotification: 22,
} as const;

/** Statistical Maturity (AssetID=17353) */
export const StatMaturityRole = {
  Admin:              1,
  QualityAssurance:   2,
  ReadOnly:           3,
  ReceiveEntityNotifications: 4,
  LocalAdmin:         5,
  ViewFinalDashboard: 6,
} as const;

/** Risk Management (AssetID=15120) */
export const RiskRole = {
  AdminUser:          1,
  ExcellenceUser:     2,
  RiskChampion:       3,
  TopManagement:      4,
  Directors:          5,
  SectionManagers:    6,
} as const;

/** Committee Management (AssetID=18044) */
export const CommitteeRole = {
  AnyRole:            0,
  AdminUser:          1,
  ReadOnly:           2,
} as const;

/** SLA Management / Stakeholder SLA (AssetID=13849) */
export const SLARole = {
  Administrator:      1,
  TopManagement:      2,
  ReadOnly:           2, // alias in DB
} as const;

/** HQ Movement (AssetID=19600) */
export const HQMovementRole = {
  AnyRole:            0,
  Administrator:      1,
  TopManagement:      2,
  ContentEditor:      3,
  MaterialProvider:   4,
} as const;

/** STI — Training (AssetID=15128) */
export const STIRole = {
  AnyRole:            0,
  Admin:              1,
  Read:               2,
  Edit:               3,
  ReceiveCourseRequestTasks: 4,
  SectorTrainingViewer: 5,
} as const;

/** Publisher (AssetID=180 base, 17749 calendar) */
export const PublisherRole = {
  AdminUser:          1,
  ReadOnly:           2,
} as const;

/** Executive / Leadership Dashboard (AssetID=172) */
export const ExecDashboardRole = {
  TopManagement:      1,
  HRAdmin:            2,
  FinanceRead:        3,
  OPDashboardRead:    4,
  OPDashboardAlterStrategy: 5,
  SectorDataViewer:   6,
  ManageFinanceOnNewDashboard: 8,
  ReadCRMServices:    10,
  CorporateSupportSectorDashboard: 11,
  GeneralAccessNewDashboard: 100,
} as const;

/** Recognition / Employee of Month (AssetID=33777 — Employee Recognition Program) */
export const RecognitionRole = {
  CommitteeMember:    1,
  ViewOnly:           2,
  AdhocNomination:    3,
  Admin:              4,
  ConfigurationManager: 5,
  History:            6,
} as const;

/** Content Management / Site Admin (AssetID=18094) */
export const ContentRole = {
  MenuManagement:     1,
  NewsManagement:     2,
  AnnouncementManagement: 3,
  GalleryManagement:  4,
  CircularManagement: 5,
  OpinionsManagement: 6,
  NewsletterManagement: 7,
  EventsManagement:   8,
  STICalendar:        9,
  AbuDhabiGovCalendar: 10,
  VideoGallery:      11,
  ContentPages:      12,
  CommunicationBank: 13,
  HRASurveyReports:  14,
  FAQs:              15,
  HQMovementNews:    16,
  HQMovementGallery: 17,
  NewsVideoGallery:  18,
  OffersManagement:  19,
  IftarInvitationReport: 20,
  PowerBIDashboard:  21,
  HealthSafetyCirculars: 22,
  Feedback:          23,
  EditorialCalendar: 24,
  TutorialCategory:  27,
  Tutorial:          29,
  LeadershipAcceleration: 30,
  MethodologyHub:    31,
} as const;

/** Finance (AssetID=19512) */
export const FinanceRole = {
  Admin:              1,
  TopManagement:      2,
  AccessCashFlowContracts: 3,
  ChangeProjectManager: 4,
  BudgetingPlanning:  5,
} as const;

/** Statistical Portfolio (AssetID=31044 / 25995 legacy) */
export const StatPortfolioRole = {
  All:                0,
  StatisticalValue:   1,
  RequestsDashboard:  2,
  ProgressStatusPortfolio: 3,
  SVProgressStatus:   4,
  AlteryxWorkflowStatus: 5,
  ProgressStatusPublication: 6,
} as const;

// ============================================================
// TYPE HELPERS + Redux shape
// ============================================================
export type AssetId = typeof Asset[keyof typeof Asset];
export type RoleId = number;

export interface RightsMap {
  assets: Record<number, number[]>;
  loadedAt?: string;
}
