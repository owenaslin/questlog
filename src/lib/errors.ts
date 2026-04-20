/**
 * Centralized error handling utilities
 */

export function getErrorMessage(err: unknown, fallback = "An unexpected error occurred."): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}
