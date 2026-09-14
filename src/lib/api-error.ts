import axios from "axios";

/** Surfaces the API's specific `{ error: string }` message instead of a generic fallback. */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: unknown } | undefined;
    if (typeof data?.error === "string") return data.error;
  }
  return fallback;
}
