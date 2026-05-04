import { baseApi } from '../../../store/baseApi';

function qs(o: Record<string, unknown>) {
  const sp = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type AttendanceCheckInBody = {
  latitude?: number;
  longitude?: number;
  lang?: string;
};

export const attendanceSvcApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    v2GetTodayAttendance: b.query<any[], string | void>({
      query: (lang) => `/svc/attendance/today${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['AttendanceSvc'],
    }),
    v2GetMonthlyAttendance: b.query<any[], { month?: number; year?: number; lang?: string } | void>({
      query: (a) => `/svc/attendance/monthly${qs((a ?? {}) as any)}`,
      providesTags: ['AttendanceSvc'],
    }),
    v2GetAttendanceRange: b.query<any[], { startDate: string; endDate: string; lang?: string }>({
      query: (a) => `/svc/attendance/range${qs(a as any)}`,
    }),
    v2GetAttendanceStatuses: b.query<any[], string | void>({
      query: (lang) => `/svc/attendance/statuses${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetDiscipline: b.query<any[], { startDate: string; endDate: string }>({
      query: (a) => `/svc/attendance/discipline${qs(a as any)}`,
    }),
    v2GetAttendanceSetup: b.query<any, string | void>({
      query: (lang) => `/svc/attendance/setup${lang ? `?lang=${lang}` : ''}`,
    }),
    v2GetFlexibleTime: b.query<any[], { dated: string; lang?: string }>({
      query: (a) => `/svc/attendance/flexible${qs(a as any)}`,
    }),
    v2CanCheckIn: b.query<any, string | void>({
      query: (lang) => `/svc/attendance/can-check-in${lang ? `?lang=${lang}` : ''}`,
      providesTags: ['AttendanceSvc'],
    }),
    v2MarkCheckIn: b.mutation<any, AttendanceCheckInBody>({
      query: (body) => ({ url: '/svc/attendance/check-in', method: 'POST', body }),
      invalidatesTags: ['AttendanceSvc'],
    }),
    v2GetAttendanceTeamGrid: b.query<any[], {
      startDate: string;
      endDate: string;
      sectorId?: number | null;
      departmentId?: number | null;
      sectionId?: number | null;
      users?: string;
      statuses?: string;
      activeOnly?: boolean;
      lang?: string;
    }>({
      query: (a) => `/svc/attendance/team-grid${qs(a as any)}`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useV2GetTodayAttendanceQuery,
  useV2GetMonthlyAttendanceQuery,
  useV2GetAttendanceRangeQuery,
  useV2GetAttendanceStatusesQuery,
  useV2GetDisciplineQuery,
  useV2GetAttendanceSetupQuery,
  useV2GetFlexibleTimeQuery,
  useV2CanCheckInQuery,
  useV2MarkCheckInMutation,
  useV2GetAttendanceTeamGridQuery,
} = attendanceSvcApi;
