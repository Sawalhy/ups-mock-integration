import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CarrierRateProvider } from "../contracts/carrier-rate-provider.interface";
import {
  HTTP_CLIENT,
  HttpClient,
} from "../contracts/http-client.interface";
import { RateRequest } from "../../rates/dto/rate-request.dto";
import { RateQuote } from "../../rates/dto/rate-response.dto";
import { CarrierError } from "../../common/errors/carrier-errors";
import { UpsAuthClient } from "./ups.auth.client";
import { mapToUpsRateRequest } from "./mappers/ups-rate-request.mapper";
import { mapFromUpsRateResponse } from "./mappers/ups-rate-response.mapper";

@Injectable()
export class UpsRateAdapter implements CarrierRateProvider {
  private readonly carrierId = "ups";

  constructor(
    @Inject(HTTP_CLIENT) private readonly httpClient: HttpClient,
    private readonly configService: ConfigService,
    private readonly authClient: UpsAuthClient,
  ) {}

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const baseUrl = this.requiredConfig("UPS_API_BASE_URL");
    const token = await this.authClient.getAccessToken();
    const payload = mapToUpsRateRequest(request);
    const requestPayload = {
      method: "POST",
      url: `${baseUrl}/rating/v1/Rate`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: payload,
      timeoutMs: 15_000,
    };

    const response = await this.httpClient.request(requestPayload);

    if (response.status === 401 || response.status === 403) {
      const refreshedToken = await this.authClient.getAccessToken(true);
      const retryResponse = await this.httpClient.request({
        ...requestPayload,
        headers: {
          ...requestPayload.headers,
          Authorization: `Bearer ${refreshedToken}`,
        },
      });

      if (retryResponse.status >= 200 && retryResponse.status < 300) {
        return mapFromUpsRateResponse(retryResponse.data, this.carrierId);
      }

      return this.throwUpsError(retryResponse);
    }

    if (response.status >= 200 && response.status < 300) {
      return mapFromUpsRateResponse(response.data, this.carrierId);
    }

    return this.throwUpsError(response);
  }

  private throwUpsError(response: {
    status: number;
    data: unknown;
  }): never {
    const details = this.extractUpsErrorDetails(response.data);

    if (response.status === 429) {
      throw new CarrierError("RATE_LIMIT", "UPS rate limit exceeded", {
        status: response.status,
        details,
      });
    }

    if (response.status >= 400 && response.status < 500) {
      if (response.status === 401 || response.status === 403) {
        throw new CarrierError("AUTH_ERROR", "UPS auth rejected", {
          status: response.status,
          details,
        });
      }

      throw new CarrierError("VALIDATION_ERROR", "UPS rejected request", {
        status: response.status,
        details,
      });
    }

    throw new CarrierError("UPSTREAM_ERROR", "UPS service error", {
      status: response.status,
      details,
    });
  }

  private extractUpsErrorDetails(
    data: unknown,
  ): Record<string, unknown> | undefined {
    if (!data || typeof data !== "object") return undefined;
    return { response: data };
  }

  private requiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new CarrierError("CONFIG_ERROR", "Missing configuration", {
        details: { key },
      });
    }
    return value;
  }
}
