import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UpsRateAdapter } from "./ups.rate.adapter";
import { UpsAuthClient } from "./ups.auth.client";
import { HTTP_CLIENT, HttpClient } from "../contracts/http-client.interface";
import { HttpClientImpl } from "../../common/http/http-client.impl";
import { getNumberConfig } from "../../common/config/config-utils";
import { TokenCache } from "../../common/http/token-cache.service";

@Module({
  providers: [
    {
      provide: HTTP_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): HttpClient => {
        const maxRetries = getNumberConfig(configService, "HTTP_MAX_RETRIES", 2, {
          min: 0,
        });
        const baseDelayMs = getNumberConfig(
          configService,
          "HTTP_RETRY_BASE_DELAY_MS",
          200,
          { min: 0 },
        );
        return new HttpClientImpl({ maxRetries, baseDelayMs });
      },
    },
    UpsAuthClient,
    UpsRateAdapter,
    TokenCache,
  ],
  exports: [UpsRateAdapter],
})
export class UpsModule {}
