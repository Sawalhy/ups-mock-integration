import { Injectable } from "@nestjs/common";
import { CarrierRegistry } from "../carriers/registry/carrier-registry.service";
import { RateRequest } from "./dto/rate-request.dto";
import { RateQuote } from "./dto/rate-response.dto";

@Injectable()
export class RatesService {
  constructor(private readonly carrierRegistry: CarrierRegistry) {}

  async getQuotes(request: RateRequest): Promise<RateQuote[]> {
    const providers = this.carrierRegistry.getRateProviders(request.carrierId);
    const results: RateQuote[] = [];

    for (const provider of providers) {
      const quotes = await provider.getRates(request);
      results.push(...quotes);
    }

    return results;
  }
}
