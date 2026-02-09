import { Injectable } from "@nestjs/common";
import { CarrierRateProvider } from "../contracts/carrier-rate-provider.interface";
import { UpsRateAdapter } from "../ups/ups.rate.adapter";
import { CarrierError } from "../../common/errors/carrier-errors";

@Injectable()
export class CarrierRegistry {
  private readonly providers: Record<string, CarrierRateProvider>;

  constructor(private readonly upsRateAdapter: UpsRateAdapter) {
    this.providers = {
      ups: this.upsRateAdapter,
    };
  }

  getRateProviders(carrierId?: string): CarrierRateProvider[] {
    if (carrierId) {
      const provider = this.providers[carrierId.toLowerCase()];
      if (!provider) {
        throw new CarrierError("VALIDATION_ERROR", "Unsupported carrier", {
          details: { carrierId },
        });
      }
      return [provider];
    }

    return Object.values(this.providers);
  }
}
