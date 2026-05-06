import { API_BASE_URL } from '../../store/baseApi';

/**
 * Build a URL that resolves to a JPEG portrait of the given user.
 *
 * Always uses the mobile API endpoint:
 *   GET {API_BASE_URL}/HR/profile/image/{userId}
 *
 * Backed by [Mobile].[spMobile_HR_GetProfileImage] which falls back from the
 * HR.Profile.PictureID blob to Common.ADUserPhoto so most AD users (with or
 * without an HR record) end up with a usable avatar.
 *
 * The endpoint requires a Bearer token; render with `AuthedImage` so the
 * active access token is forwarded in the request headers. Anonymous calls
 * (legacy `<Image>`) get 401 and the avatar silently falls back to initials.
 *
 * The legacy `EXPO_PUBLIC_PROFILE_IMAGE_BASE` env var (which pointed at the
 * IIS `/EmployeeProfile/Profiles/GetProfilePicture` endpoint guarded by
 * Negotiate / NTLM) is intentionally ignored — Windows authentication is
 * not available from a mobile client and the endpoint always 401s for us.
 *
 * The mobile endpoint returns 404 when no photo is available; the calling
 * `AuthedImage` component handles that via its `onError` initials fallback
 * (see `ProfileAvatar`).
 */
export function profileImageUrl(userId?: string): string | undefined {
  if (!userId) return undefined;
  const id = userId.trim();
  if (!id) return undefined;
  return `${API_BASE_URL}/HR/profile/image/${encodeURIComponent(id)}`;
}
