import { baseApi } from '../../../store/baseApi';

// Plan: legacy_api_parity_rollout 2.2
// Oshad / Near-Miss HSE form. The GET returns the multi-result envelope:
// `{ locations, accidentTypes, incidenceTypes, severities }`. The submit returns
// `{ isSuccess, incidentId, reportNo, message }`.

export type OshadSubmitBody = {
  description: string;
  locationId: number;
  incidenceTypeId: number;
  floorId?: number | null;
  areaId?: string | null;
  accidentTypeId?: number; // 1 Hazard, 2 Near-miss
  statusConditionId?: number; // 1 Minor, 2 Critical
  attachmentJson?: string | null;
  lang?: string;
};

export type OshadFormResponse = {
  locations: Array<{ id: number; code: string; name: string; parentID: number | null; level: number }>;
  accidentTypes: Array<{ id: number; name: string }>;
  incidenceTypes: Array<{ id: number; name: string }>;
  severities: Array<{ id: number; name: string }>;
};

export const safetyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOshadForm: builder.query<any, string | void>({
      query: (lang) => `/common/oshad/form${lang ? `?lang=${lang}` : ''}`,
    }),
    submitNearMiss: builder.mutation<any, OshadSubmitBody>({
      query: (body) => ({ url: '/common/oshad/near-miss', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetOshadFormQuery, useSubmitNearMissMutation } = safetyApi;
