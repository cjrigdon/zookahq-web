import { useSearchParams } from 'react-router-dom';

/**
 * Append return navigation context so a detail page can send the user
 * back to where they came from (event, account, booking list, etc.).
 */
export function withReturnTo(
  path: string,
  returnTo: string,
  returnLabel: string,
): string {
  const qIndex = path.indexOf('?');
  const base = qIndex >= 0 ? path.slice(0, qIndex) : path;
  const params = new URLSearchParams(qIndex >= 0 ? path.slice(qIndex + 1) : '');
  params.set('return_to', returnTo);
  params.set('return_label', returnLabel);
  return `${base}?${params.toString()}`;
}

/** Read back-link context from the current URL, with fallbacks. */
export function useNavBack(fallbackTo: string, fallbackLabel: string) {
  const [params] = useSearchParams();
  const returnTo = params.get('return_to');
  const returnLabel = params.get('return_label');
  const eventId = params.get('event_id');
  const accountId = params.get('account_id');

  if (returnTo) {
    return {
      backTo: returnTo,
      backLabel: returnLabel ? `Back to ${returnLabel}` : 'Back',
      deleteRedirectTo: returnTo,
    };
  }

  // Legacy shortcuts still used by some links
  if (eventId) {
    return {
      backTo: `/events/events/${eventId}`,
      backLabel: 'Back to event',
      deleteRedirectTo: `/events/events/${eventId}`,
    };
  }
  if (accountId) {
    return {
      backTo: `/booking/accounts/${accountId}`,
      backLabel: 'Back to account',
      deleteRedirectTo: `/booking/accounts/${accountId}`,
    };
  }

  return {
    backTo: fallbackTo,
    backLabel: fallbackLabel,
    deleteRedirectTo: fallbackTo,
  };
}
