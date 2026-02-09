import { HttpException } from "@nestjs/common";
import { CarrierError } from "./carrier-errors";

const DEFAULT_STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_ERROR: 400,
  AUTH_ERROR: 401,
  UPSTREAM_ERROR: 502,
  TIMEOUT: 504,
  MALFORMED_RESPONSE: 502,
  RATE_LIMIT: 429,
  CONFIG_ERROR: 500,
};

export function toHttpException(error: CarrierError): HttpException {
  const status = error.status ?? DEFAULT_STATUS_BY_CODE[error.code] ?? 500;
  return new HttpException(
    {
      code: error.code,
      message: error.message,
      details: error.details ?? null,
    },
    status,
  );
}
