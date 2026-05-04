import { baseApi } from '../../../store/baseApi';

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type ProfileUpdateBody = {
  mobile?: string;
  extension?: string;
  email?: string;
};

export type RecognitionGiveBody = {
  toUserId: string;
  valueId: number;
  message?: string;
  lang?: string;
};

export type ProfileCardHeader = {
  year: number;
  strategicPerformance: number;
  taskPerformance: number;
  lastEvaluation: number;
  leaveAvailed: number;
  leaveRemaining: number;
  leaveTotal: number;
  tpAssigned: number;
  tpCompleted: number;
  tpInprogress: number;
  tpDelayed: number;
  tpOverdue: number;
  tpRejected: number;
  absent: number;
  late: number;
  earlyOut: number;
  sickLeave: number;
  onTime: number;
  workingDays: number;
  additionalWorkHours: number;
};

export type ProfileCardAppraisal = { year: number; score: number };

export type ProfileCardDiscipline = {
  Year: number;
  Month: number;
  performance: number;
  date: string | null;
};

export type ProfileCardAchievement = {
  kind: string;
  value: number;
  lastDate: string | null;
  footer: string | null;
};

export type ProfileCard = {
  header: ProfileCardHeader[];
  appraisals: ProfileCardAppraisal[];
  discipline: ProfileCardDiscipline[];
  achievements: ProfileCardAchievement[];
};

export type ProfileDetails = {
  userId: string;
  employeeNo: string | null;
  employeeId: number | null;
  displayName: string | null;
  displayNameAr: string | null;
  jobTitle: string | null;
  jobTitleAr: string | null;
  jobDescription: string | null;
  jobDescriptionAr: string | null;
  email: string | null;
  mobile: string | null;
  extension: string | null;
  phone: string | null;
  workLocation: string | null;
  firstName: string | null;
  firstNameAr: string | null;
  lastName: string | null;
  lastNameAr: string | null;
  gender: string | null;
  genderAr: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  nationalityAr: string | null;
  maritalStatus: string | null;
  maritalStatusAr: string | null;
  religion: string | null;
  religionAr: string | null;
  address: string | null;
  unifiedNumber: string | null;
  joinDate: string | null;
  confirmationDate: string | null;
  employeeType: string | null;
  employeeTypeAr: string | null;
  sector: string | null;
  sectorAr: string | null;
  department: string | null;
  departmentAr: string | null;
  section: string | null;
  sectionAr: string | null;
  gradeName: string | null;
  gradeNameAr: string | null;
  jobName: string | null;
  jobNameAr: string | null;
  managerName: string | null;
  managerNameAr: string | null;
  managerUserId: string | null;
  recruitmentAgency: string | null;
  recruitmentAgencyAr: string | null;
  probationDurationType: string | null;
  probationDurationTypeAr: string | null;
  probationDuration: number | null;
  isActing: boolean | null;
  entityId: number | null;
};

export const hrSvcApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetMyProfile: b.query<any, string | void>({
      query: (lang) => `/profile/me${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['ProfileSvc'],
    }),
    v2UpdateMyProfile: b.mutation<any, ProfileUpdateBody>({
      query: (body) => ({ url: '/profile/me', method: 'PATCH', body }),
      invalidatesTags: ['ProfileSvc'],
    }),
    v2SearchDirectory: b.query<any[], { query?: string; sectorId?: number; departmentId?: number; pageNumber?: number; pageSize?: number; lang?: string } | void>({
      query: (a) => `/profile/search${qs((a ?? {}) as any)}`,
    }),
    v2GetMyTeam: b.query<any[], string | void>({
      query: (lang) => `/profile/my-team${lang ? `?lang=${lang}` : ''}`,
    }),

    v2GetProfileCard: b.query<ProfileCard, { year?: number; lang?: string } | void>({
      query: (a) => `/profile/card${qs((a ?? {}) as any)}`,
      providesTags: ['ProfileSvc'],
    }),

    v2GetProfileDetails: b.query<ProfileDetails, string | void>({
      query: (lang) => `/profile/details${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['ProfileSvc'],
    }),

    v2GetRecognitionFeed: b.query<any[], { userId?: string; pageNumber?: number; pageSize?: number; lang?: string } | void>({
      query: (a) => `/recognition/feed${qs((a ?? {}) as any)}`,
      providesTags: ['ScadStarSvc'],
    }),
    v2GiveRecognition: b.mutation<any, RecognitionGiveBody>({
      query: (body) => ({ url: '/recognition/give', method: 'POST', body }),
      invalidatesTags: ['ScadStarSvc'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetMyProfileQuery,
  useV2UpdateMyProfileMutation,
  useV2SearchDirectoryQuery,
  useV2GetMyTeamQuery,
  useV2GetProfileCardQuery,
  useV2GetProfileDetailsQuery,
  useV2GetRecognitionFeedQuery,
  useV2GiveRecognitionMutation,
} = hrSvcApi;
