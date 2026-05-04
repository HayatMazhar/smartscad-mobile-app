import { baseApi } from '../../../store/baseApi';

export type BISurveyHeader = {
  surveyLinkId: number;
  surveyNameEn?: string | null;
  surveyNameAr?: string | null;
  dashboardName?: string | null;
  dashboardNameAr?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  sentOn?: string | null;
  dueDate?: string | null;
  alreadySubmitted: boolean;
  canFill: boolean;
  message?: string | null;
  taskUid?: string | null;
};

/** QuestionType enum (matches SmartHelp.QuestionType): 1=Text, 2=Radio, 3=Rating */
export type BISurveyQuestionType = 1 | 2 | 3;

export type BISurveyQuestion = {
  surveyQuestionId: number;
  questionId: number;
  questionEn?: string | null;
  questionAr?: string | null;
  subQuestionEn?: string | null;
  subQuestionAr?: string | null;
  questionType: BISurveyQuestionType;
  displayOrder: number;
};

export type BISurveyExistingResponse = {
  surveyQuestionId: number;
  answer?: string | null;
  description?: string | null;
};

export type BISurveyForm = {
  header: BISurveyHeader;
  questions: BISurveyQuestion[];
  existingResponses: BISurveyExistingResponse[];
};

export type BISurveyAnswer = {
  surveyQuestionId: number;
  answer?: string | null;
  description?: string | null;
};

export const biSurveysApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBISurveyForm: builder.query<BISurveyForm, number>({
      query: (surveyLinkId) => `/bi-surveys/${surveyLinkId}`,
      providesTags: (_r, _e, id) => [{ type: 'Approvals' as const, id: `survey-${id}` }],
    }),
    submitBISurvey: builder.mutation<
      { success: boolean; message?: string },
      { surveyLinkId: number; answers: BISurveyAnswer[] }
    >({
      query: ({ surveyLinkId, answers }) => ({
        url: `/bi-surveys/${surveyLinkId}/submit`,
        method: 'POST',
        body: { answers },
      }),
      invalidatesTags: ['Approvals', 'Tasks', 'Notifications'],
    }),
  }),
});

export const { useGetBISurveyFormQuery, useSubmitBISurveyMutation } = biSurveysApi;
