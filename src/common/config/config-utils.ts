import { ConfigService } from "@nestjs/config";
import { CarrierError } from "../errors/carrier-errors";

export function getRequiredString(
  configService: ConfigService,
  key: string,
): string {
  const value = configService.get<string>(key);
  if (!value) {
    throw new CarrierError("CONFIG_ERROR", "Missing configuration", {
      details: { key },
    });
  }
  return value;
}

export function getNumberConfig(
  configService: ConfigService,
  key: string,
  fallback: number,
  options?: { min?: number },
): number {
  const raw = configService.get<string>(key);
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }

  const parsed = Number(raw);
  const min = options?.min;
  if (!Number.isFinite(parsed) || (min !== undefined && parsed < min)) {
    return fallback;
  }

  return parsed;
}
