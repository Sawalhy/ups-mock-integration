import {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from "../../src/carriers/contracts/http-client.interface";
import { CarrierError } from "../../src/common/errors/carrier-errors";

type StubResponse = HttpResponse | Error;

export class StubHttpClient implements HttpClient {
  private readonly responses = new Map<string, StubResponse[]>();

  registerResponse(request: HttpRequest, response: StubResponse): void {
    const key = this.keyFor(request);
    const queue = this.responses.get(key) ?? [];
    queue.push(response);
    this.responses.set(key, queue);
  }

  async request<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>> {
    const key = this.keyFor(request);
    const queue = this.responses.get(key) ?? [];
    if (queue.length === 0) {
      throw new CarrierError("CONFIG_ERROR", "Stub response not registered", {
        details: { requestKey: key },
      });
    }

    const next = queue.shift();
    if (!next) {
      throw new CarrierError("CONFIG_ERROR", "Stub response not registered", {
        details: { requestKey: key },
      });
    }

    if (next instanceof Error) {
      throw next;
    }

    return next as HttpResponse<T>;
  }

  private keyFor(request: HttpRequest): string {
    const body = request.body ? JSON.stringify(request.body) : "";
    return `${request.method}:${request.url}:${body}`;
  }
}
