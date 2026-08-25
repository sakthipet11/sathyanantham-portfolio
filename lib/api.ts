export class ApiError extends Error {
  status: number;
  statusText: string;
  data?: unknown;

  constructor(status: number, statusText: string, data?: unknown, message?: string) {
    super(message || `API request failed with status ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export interface FetchApiOptions extends RequestInit {
  timeoutMs?: number;
  fallbackData?: unknown;
}

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  status: number;
  ok: boolean;
}

/**
 * Opt-in resilient API fetch helper.
 * Does not throw unhandled exceptions by default if safeMode is used or when catching errors.
 */
export async function fetchApi<T = unknown>(
  url: string,
  options: FetchApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeoutMs = 15000,
    headers = {},
    fallbackData = null,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isJson = response.headers.get('content-type')?.includes('application/json');
    let responseData: unknown = null;

    if (isJson) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const error = new ApiError(
        response.status,
        response.statusText,
        responseData,
        typeof responseData === 'object' && responseData && 'message' in responseData
          ? String((responseData as { message: unknown }).message)
          : undefined
      );

      return {
        data: (fallbackData as T) ?? null,
        error,
        status: response.status,
        ok: false,
      };
    }

    return {
      data: responseData as T,
      error: null,
      status: response.status,
      ok: true,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    let error: Error;
    if (err instanceof Error && err.name === 'AbortError') {
      error = new TimeoutError(timeoutMs);
    } else if (err instanceof Error) {
      error = err;
    } else {
      error = new Error(String(err));
    }

    return {
      data: (fallbackData as T) ?? null,
      error,
      status: 0,
      ok: false,
    };
  }
}
