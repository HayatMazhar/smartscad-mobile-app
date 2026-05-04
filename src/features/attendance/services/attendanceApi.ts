import { baseApi } from '../../../store/baseApi';

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTodayAttendance: builder.query<any, void>({ query: () => '/attendance/today', providesTags: ['Attendance'] }),
    checkIn: builder.mutation<any, any>({ query: (body) => ({ url: '/attendance/checkin', method: 'POST', body }), invalidatesTags: ['Attendance'] }),
    getMonthlyCard: builder.query<any, { month?: number; year?: number }>({
      query: ({ month, year }) => `/attendance/monthly?month=${month}&year=${year}`,
      providesTags: ['Attendance'],
    }),
    getAttendanceSummary: builder.query<any, { month?: number; year?: number } | void>({
      query: (args) => {
        const a: any = args ?? {};
        const qs: string[] = [];
        if (a.month) qs.push(`month=${a.month}`);
        if (a.year)  qs.push(`year=${a.year}`);
        return `/attendance/summary${qs.length ? `?${qs.join('&')}` : ''}`;
      },
      providesTags: ['Attendance'],
    }),
    getAttendanceStatus: builder.query<any, void>({ query: () => '/attendance/status' }),
    getTeamAttendance: builder.query<any, { sectorId?: string; departmentId?: string }>({
      query: ({ sectorId, departmentId }) => `/attendance/team?sectorId=${sectorId ?? ''}&departmentId=${departmentId ?? ''}`,
    }),
  }),
});

export const {
  useGetTodayAttendanceQuery, useCheckInMutation, useGetMonthlyCardQuery,
  useGetAttendanceSummaryQuery, useGetAttendanceStatusQuery, useGetTeamAttendanceQuery,
} = attendanceApi;
