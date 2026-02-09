import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import { CarrierAuthProvider } from "../contracts/carrier-auth-provider.interface";
import {
  HTTP_CLIENT,
  HttpClient,
} from "../contracts/http-client.interface";
import { CarrierError } from "../../common/errors/carrier-errors";
import { TokenCache } from "../../common/http/token-cache.service";

const TokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().int().positive(),
  token_type: z.string().optional(),
});

@Injectable()
export class UpsAuthClient implements CarrierAuthProvider {
  private readonly cacheKey = "ups";
  private readonly safetyBufferMs = 60_000;

  constructor(
    @Inject(HTTP_CLIENT) private readonly httpClient: HttpClient,
    private readonly configService: ConfigService,
    private readonly tokenCache: TokenCache,
  ) {}

  async getAccessToken(forceRefresh = false): Promise<string> {
    const cached = this.tokenCache.get(this.cacheKey);
    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      return cached.accessToken;
    }

    const tokenUrl = this.requiredConfig("UPS_OAUTH_TOKEN_URL");
    const clientId = this.requiredConfig("UPS_CLIENT_ID");
    const clientSecret = this.requiredConfig("UPS_CLIENT_SECRET");

    const response = await this.httpClient.request({
      method: "POST",
      url: tokenUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      timeoutMs: 10_000,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new CarrierError("AUTH_ERROR", "UPS auth failed", {
        status: response.status,
        details: { response: response.data },
      });
    }

    const parsed = TokenResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new CarrierError("MALFORMED_RESPONSE", "UPS auth response invalid", {
        details: { issues: parsed.error.issues },
      });
    }

    const expiresAt =
      Date.now() + parsed.data.expires_in * 1000 - this.safetyBufferMs;

    this.tokenCache.set(this.cacheKey, {
      accessToken: parsed.data.access_token,
      expiresAt,
    });

    return parsed.data.access_token;
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
