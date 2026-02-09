import axios, { AxiosError } from "axios";
import {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "../../carriers/contracts/http-client.interface";
import { CarrierError } from "../errors/carrier-errors";

const RETRYABLE_STATUS = new Set([502, 503, 504]);

export class HttpClientImpl implements HttpClient {
  constructor(
    private readonly options: { maxRetries: number; baseDelayMs: number },
  ) {}

  async request<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.options.maxRetries) {
      try {
        const response = await axios.request<T>({
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: request.query,
          data: request.body,
          timeout: request.timeoutMs,
          validateStatus: () => true,
        });

        if (RETRYABLE_STATUS.has(response.status) && attempt < this.options.maxRetries) {
          await this.delay(this.backoffMs(attempt));
          attempt += 1;
          continue;
        }

        return {
          status: response.status,
          data: response.data,
          headers: response.headers as Record<string, string>,
        };
      } catch (error) {
        lastError = error;
        if (this.isRetryableError(error) && attempt < this.options.maxRetries) {
          await this.delay(this.backoffMs(attempt));
          attempt += 1;
          continue;
        }

        throw this.toCarrierError(error);
      }
    }

    throw this.toCarrierError(lastError);
  }

  private backoffMs(attempt: number): number {
    return this.options.baseDelayMs * Math.pow(2, attempt);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const axiosError = error as AxiosError;
    const code = axiosError.code ?? "";
    return code === "ECONNABORTED";
  }

  private toCarrierError(error: unknown): CarrierError {
    if (!error || typeof error !== "object") {
      return new CarrierError("UPSTREAM_ERROR", "Unknown HTTP error");
    }

    const axiosError = error as AxiosError;
    if (axiosError.code === "ECONNABORTED") {
      return new CarrierError("TIMEOUT", "HTTP request timed out");
    }

    return new CarrierError("UPSTREAM_ERROR", "HTTP request failed", {
      details: {
        message: axiosError.message,
      },
    });
  }
}
