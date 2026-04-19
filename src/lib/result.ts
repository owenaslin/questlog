/**
 * Standardized Result type for error handling
 * Replaces inconsistent { success: boolean, error?: string } patterns
 */

export type Result<T, E = string> =
  | { ok: true; value: T; error?: never }
  | { ok: false; error: E; value?: never };

/**
 * Create a successful result
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create a failed result
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Try to execute a promise and return a Result
 */
export async function tryAsync<T>(
  promise: Promise<T>
): Promise<Result<T, string>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error.message : "Unknown error");
  }
}

/**
 * Unwrap a result or throw
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(String(result.error));
  }
  return result.value;
}

/**
 * Map a successful result to a new value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (!result.ok) return result;
  return ok(fn(result.value));
}
