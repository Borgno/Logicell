import { iniciar, terminar } from "~/lib/loading";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";

  iniciar();
  try {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      signal,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      if (res.status === 401) {
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
      const message = data?.error || data?.message || `Erro ${res.status}`;
      throw new ApiError(message, res.status);
    }

    return data as T;
  } finally {
    terminar();
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", formData }),
};

export function errorMessage(err: any, fallback = "Ocorreu um erro inesperado."): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
