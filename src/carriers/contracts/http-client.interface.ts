export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers?: Record<string, string>;
}

export interface HttpClient {
  request<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>>;
}

export const HTTP_CLIENT = "HTTP_CLIENT";
