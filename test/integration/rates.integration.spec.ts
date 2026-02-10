import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { readFileSync } from "fs";
import { join } from "path";
import axios from "axios";
import { RatesService } from "../../src/rates/rates.service";
import { RateRequest } from "../../src/rates/dto/rate-request.dto";
import { RatesModule } from "../../src/rates/rates.module";
import { CarriersModule } from "../../src/carriers/carriers.module";
import {
  HTTP_CLIENT,
  HttpRequest,
  HttpResponse,
} from "../../src/carriers/contracts/http-client.interface";
import { StubHttpClient } from "../support/stub-http-client";
import { mapToUpsRateRequest } from "../../src/carriers/ups/mappers/ups-rate-request.mapper";
import { CarrierError } from "../../src/common/errors/carrier-errors";
import { HttpClientImpl } from "../../src/common/http/http-client.impl";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const fixturesPath = (...parts: string[]) =>
  join(__dirname, "fixtures", ...parts);

const loadFixture = (filename: string) =>
  JSON.parse(readFileSync(fixturesPath(filename), "utf8"));

const buildAuthRequest = (): HttpRequest => ({
  method: "POST",
  url: process.env.UPS_OAUTH_TOKEN_URL!,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.UPS_CLIENT_ID!,
    client_secret: process.env.UPS_CLIENT_SECRET!,
  }).toString(),
  timeoutMs: 10_000,
});

const buildRateRequest = (): HttpRequest => ({
  method: "POST",
  url: `${process.env.UPS_API_BASE_URL}/rating/v1/Rate`,
  headers: {
    Authorization: `Bearer token-123`,
    "Content-Type": "application/json",
  },
  body: mapToUpsRateRequest(sampleRateRequest),
  timeoutMs: 15_000,
});

const sampleRateRequest: RateRequest = {
  origin: {
    postalCode: "94103",
    countryCode: "US",
    city: "San Francisco",
    state: "CA",
    addressLine1: "123 Main St",
    addressLine2: "Suite 100",
  },
  destination: {
    postalCode: "10001",
    countryCode: "US",
    city: "New York",
    state: "NY",
    addressLine1: "456 Market St",
  },
  packages: [
    {
      weight: { value: 2, unit: "LB" },
    },
  ],
};

describe("Rates integration", () => {
  let ratesService: RatesService;
  let stubHttpClient: StubHttpClient;

  beforeEach(async () => {
    process.env.UPS_API_BASE_URL = "https://api.ups.example";
    process.env.UPS_OAUTH_TOKEN_URL = "https://auth.ups.example/token";
    process.env.UPS_CLIENT_ID = "client-id";
    process.env.UPS_CLIENT_SECRET = "client-secret";

    stubHttpClient = new StubHttpClient();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CarriersModule,
        RatesModule,
      ],
    })
      .overrideProvider(HTTP_CLIENT)
      .useValue(stubHttpClient)
      .compile();

    ratesService = moduleRef.get(RatesService);
  });

  it("builds request and parses success response", async () => {
    console.log("Scenario: success response mapping");
    expect(mapToUpsRateRequest(sampleRateRequest)).toEqual(
      loadFixture("ups.rate.request.json"),
    );
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 200,
      data: loadFixture("ups.rate.success.json"),
    });

    const quotes = await ratesService.getQuotes(sampleRateRequest);

    expect(quotes).toHaveLength(1);
    expect(quotes[0].carrierId).toBe("ups");
    expect(quotes[0].serviceCode).toBe("03");
    expect(quotes[0].totalCharge).toBe(12.34);
    expect(quotes[0].currency).toBe("USD");
  });

  it("reuses cached token when valid", async () => {
    console.log("Scenario: token reuse");
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 200,
      data: loadFixture("ups.rate.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 200,
      data: loadFixture("ups.rate.success.json"),
    });

    await ratesService.getQuotes(sampleRateRequest);
    await ratesService.getQuotes(sampleRateRequest);
  });

  it("refreshes token when expired", async () => {
    console.log("Scenario: token refresh");
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(0);
    nowSpy.mockReturnValueOnce(100_000);
    nowSpy.mockReturnValue(100_000);

    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: { access_token: "token-123", expires_in: 1 },
    });
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: { access_token: "token-123", expires_in: 3600 },
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 200,
      data: loadFixture("ups.rate.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 200,
      data: loadFixture("ups.rate.success.json"),
    });

    await ratesService.getQuotes(sampleRateRequest);
    await ratesService.getQuotes(sampleRateRequest);
    nowSpy.mockRestore();
  });

  it("maps upstream error response", async () => {
    console.log("Scenario: upstream 400 error");
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 400,
      data: loadFixture("ups.rate.error.400.json"),
    });

    await expect(ratesService.getQuotes(sampleRateRequest)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("maps blocked merchant response", async () => {
    console.log("Scenario: upstream 403 error");
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 403,
      data: loadFixture("ups.rate.error.401.json"),
    });
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 403,
      data: loadFixture("ups.rate.error.401.json"),
    });

    await expect(ratesService.getQuotes(sampleRateRequest)).rejects.toMatchObject({
      code: "AUTH_ERROR",
      status: 403,
    });
  });

  it("retries on 401 by refreshing token", async () => {
    console.log("Scenario: auth retry on 401");
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 401,
      data: loadFixture("ups.rate.error.401.json"),
    });
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 200,
      data: loadFixture("ups.rate.success.json"),
    });

    const quotes = await ratesService.getQuotes(sampleRateRequest);
    expect(quotes).toHaveLength(1);
  });

  it("maps rate limit response", async () => {
    console.log("Scenario: 429 rate limit");
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 429,
      data: {},
    });

    await expect(ratesService.getQuotes(sampleRateRequest)).rejects.toMatchObject({
      code: "RATE_LIMIT",
      status: 429,
    });
  });

  it("maps upstream server error response", async () => {
    console.log("Scenario: upstream 500 error");
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 500,
      data: loadFixture("ups.rate.error.500.json"),
    });

    await expect(ratesService.getQuotes(sampleRateRequest)).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
      status: 500,
    });
  });

  it("handles malformed response", async () => {
    console.log("Scenario: malformed response body");
    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });
    stubHttpClient.registerResponse(buildRateRequest(), {
      status: 200,
      data: { unexpected: true },
    });

    await expect(ratesService.getQuotes(sampleRateRequest)).rejects.toBeInstanceOf(
      CarrierError,
    );
  });

  it("fails on missing configuration", async () => {
    console.log("Scenario: missing config");
    process.env.UPS_API_BASE_URL = "";

    stubHttpClient.registerResponse(buildAuthRequest(), {
      status: 200,
      data: loadFixture("ups.auth.success.json"),
    });

    await expect(ratesService.getQuotes(sampleRateRequest)).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
  });
});

describe("HttpClientImpl retry behavior", () => {
  beforeEach(() => {
    mockedAxios.request.mockReset();
  });

  it("retries on transient status codes and succeeds", async () => {
    console.log("Scenario: HTTP retry on 503");
    const client = new HttpClientImpl({ maxRetries: 2, baseDelayMs: 1 });
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com",
    };

    mockedAxios.request
      .mockResolvedValueOnce({ status: 503, data: { message: "busy" } })
      .mockResolvedValueOnce({ status: 200, data: { ok: true } });

    const response = await client.request(request);
    expect(response.status).toBe(200);
  });

  it("throws on timeout after retries", async () => {
    console.log("Scenario: HTTP timeout");
    const client = new HttpClientImpl({ maxRetries: 1, baseDelayMs: 1 });
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com",
      timeoutMs: 1,
    };

    const timeoutError = new Error("timeout") as Error & { code?: string };
    timeoutError.code = "ECONNABORTED";
    mockedAxios.request.mockRejectedValueOnce(timeoutError);
    mockedAxios.request.mockRejectedValueOnce(timeoutError);

    await expect(client.request(request)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("maps malformed JSON response errors", async () => {
    console.log("Scenario: HTTP malformed JSON");
    const client = new HttpClientImpl({ maxRetries: 0, baseDelayMs: 1 });
    const request: HttpRequest = {
      method: "GET",
      url: "https://example.com",
    };

    mockedAxios.request.mockRejectedValueOnce(
      new SyntaxError("Unexpected token < in JSON at position 0"),
    );

    await expect(client.request(request)).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });
});
