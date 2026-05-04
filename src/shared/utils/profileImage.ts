import { API_BASE_URL } from '../../store/baseApi';

/**
 * Build a URL that resolves to a JPEG portrait of the given user.
 *
 * Source of truth is the mobile API endpoint:
 *   GET {API_BASE_URL}/HR/profile/image/{userId}
 *
 * Backed by [Mobile].[spMobile_HR_GetProfileImage] which falls back from the
 * HR.Profile.PictureID blob to Common.ADUserPhoto so most AD users (with or
 * without an HR record) end up with a usable avatar.
 *
 * The mobile endpoint returns 404 when no photo is available; the calling
 * <Image /> component already handles that via its `onError` initials
 * fallback (see ProfileAvatar).
 *
 * Optional override: EXPO_PUBLIC_PROFILE_IMAGE_BASE — kept for parity with
 * older builds that pointed at the legacy IIS endpoint
 * `/EmployeeProfile/Profiles/GetProfilePicture`.
 */
export function profileImageUrl(userId?: string): string | undefined {
  if (!userId) return undefined;
  const id = userId.trim();
  if (!id) return undefined;

  const envBase = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_PROFILE_IMAGE_BASE;
  if (envBase && envBase.length > 0) {
    return `${envBase.replace(/\/+$/, '')}/EmployeeProfile/Profiles/GetProfilePicture?id=${encodeURIComponent(id)}`;
  }

  return `${API_BASE_URL}/HR/profile/image/${encodeURIComponent(id)}`;
}
