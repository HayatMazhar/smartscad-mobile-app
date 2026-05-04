import { baseApi } from '../../../store/baseApi';
import { appendFileToFormData, type PickedUploadFile } from '../../../shared/utils/pickDocument';

/** Module codes: IBDAA_IDEA, APPRAISAL_*, PORTAL_*, or any string agreed with back-end. */
export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUniversalAttachments: builder.query<any, { module: string; entityKey: string }>({
      query: ({ module, entityKey }) =>
        `/attachments?module=${encodeURIComponent(module)}&entityKey=${encodeURIComponent(entityKey)}`,
      providesTags: ['Attachments'],
    }),
    uploadUniversalAttachment: builder.mutation<
      any,
      { module: string; entityKey: string; file: PickedUploadFile }
    >({
      query: ({ module, entityKey, file }) => {
        const form = new FormData();
        form.append('module', module);
        form.append('entityKey', entityKey);
        appendFileToFormData(form, 'file', file);
        return { url: '/attachments', method: 'POST', body: form };
      },
      invalidatesTags: ['Attachments'],
    }),
  }),
});

export const { useGetUniversalAttachmentsQuery, useUploadUniversalAttachmentMutation } = attachmentsApi;
