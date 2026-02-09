import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UpsRateAdapter } from "./ups.rate.adapter";
import { UpsAuthClient } from "./ups.auth.client";
import { HTTP_CLIENT, HttpClient } from "../contracts/http-client.interface";
import { HttpClientImpl } from "../../common/http/http-client.impl";
import { StubHttpClient } from "../../common/http/http-client.stub";
import { TokenCache } from "../../common/http/token-cache.service";

@Module({
  providers: [
    {
      provide: HTTP_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): HttpClient => {
        const mode = (configService.get<string>("HTTP_MODE") ?? "stub").toLowerCase();
        if (mode === "live") {
          const maxRetries = Number(configService.get<string>("HTTP_MAX_RETRIES") ?? "2");
          const baseDelayMs = Number(configService.get<string>("HTTP_RETRY_BASE_DELAY_MS") ?? "200");
          return new HttpClientImpl({ maxRetries, baseDelayMs });
        }
        return new StubHttpClient();
      },
    },
    UpsAuthClient,
    UpsRateAdapter,
    TokenCache,
  ],
  exports: [UpsRateAdapter],
})
export class UpsModule {}
