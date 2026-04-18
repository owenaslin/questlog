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

export function isAuthError(err: unknown): boolean {
  const message = getErrorMessage(err, "").toLowerCase();
  return (
    message.includes("auth") ||
    message.includes("login") ||
    message.includes("session") ||
    message.includes("unauthorized") ||
    message.includes("jwt")
  );
}

export function isNetworkError(err: unknown): boolean {
  const message = getErrorMessage(err, "").toLowerCase();
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("abort") ||
    message.includes("failed to fetch")
  );
}

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function createInitialState<T>(): AsyncState<T> {
  return {
    data: null,
    isLoading: true,
    error: null,
  };
}

export function createLoadingState<T>(): AsyncState<T> {
  return {
    data: null,
    isLoading: true,
    error: null,
  };
}

export function createSuccessState<T>(data: T): AsyncState<T> {
  return {
    data,
    isLoading: false,
    error: null,
  };
}

export function createErrorState<T>(error: unknown): AsyncState<T> {
  return {
    data: null,
    isLoading: false,
    error: getErrorMessage(error),
  };
}
