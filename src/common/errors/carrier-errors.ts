export type CarrierErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "MALFORMED_RESPONSE"
  | "RATE_LIMIT"
  | "CONFIG_ERROR";

export class CarrierError extends Error {
  public readonly code: CarrierErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly status?: number;

  constructor(
    code: CarrierErrorCode,
    message: string,
    options?: { details?: Record<string, unknown>; status?: number },
  ) {
    super(message);
    this.code = code;
    this.details = options?.details;
    this.status = options?.status;
  }
}
