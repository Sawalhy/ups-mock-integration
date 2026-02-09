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

    const response = await this.httpClient.request({
      method: "POST",
      url: `${baseUrl}/rating/v1/Rate`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: payload,
      timeoutMs: 15_000,
    });

    if (response.status === 429) {
      throw new CarrierError("RATE_LIMIT", "UPS rate limit exceeded", {
        status: response.status,
      });
    }

    if (response.status < 200 || response.status >= 300) {
      throw new CarrierError("UPSTREAM_ERROR", "UPS rating failed", {
        status: response.status,
        details: { response: response.data },
      });
    }

    return mapFromUpsRateResponse(response.data, this.carrierId);
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
