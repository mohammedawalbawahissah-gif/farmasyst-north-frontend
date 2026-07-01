/**
 * Shared helpers for safely reading error details from unknown catch values
 * without resorting to `any`.
 */

interface ApiErrorShape {
  response?: { data?: { detail?: string } };
  message?: string;
}

/** Extract a human-readable message from an Axios-style API error. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const e = err as ApiErrorShape;
  return e?.response?.data?.detail ?? (err instanceof Error ? err.message : fallback);
}
