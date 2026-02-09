import { RateRequest } from "../../rates/dto/rate-request.dto";
import { RateQuote } from "../../rates/dto/rate-response.dto";

export interface CarrierRateProvider {
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
