import axios from "axios";

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as any;

    if (payload) {
      if (typeof payload.message === "string" && payload.message.trim().length > 0) {
        return payload.message;
      }

      if (payload.error) {
        if (typeof payload.error === "string" && payload.error.trim().length > 0) {
          return payload.error;
        }
        if (typeof payload.error === "object" && payload.error !== null) {
          if (typeof payload.error.message === "string" && payload.error.message.trim().length > 0) {
            return payload.error.message;
          }
        }
      }
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
