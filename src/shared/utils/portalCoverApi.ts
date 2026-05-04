import { API_BASE_URL } from '../../store/baseApi';

/** Cover bytes proxied from Menu.Events.CoverImagePath (no portal cookie on native <Image>). */
export function eventCoverApiUrl(eventId: number | string | null | undefined): string | undefined {
  if (eventId == null || eventId === '') return undefined;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/portal/events/${encodeURIComponent(String(eventId))}/cover`;
}

/** Cover bytes from Menu.Offers.CoverPhotoPath. */
export function offerCoverApiUrl(offerId: number | string | null | undefined): string | undefined {
  if (offerId == null || offerId === '') return undefined;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/portal/offers/${encodeURIComponent(String(offerId))}/cover`;
}
