import { Body, Controller, Post, BadRequestException } from "@nestjs/common";
import { RateRequestSchema } from "./dto/rate-request.dto";
import { RatesService } from "./rates.service";
import { CarrierError } from "../common/errors/carrier-errors";
import { toHttpException } from "../common/errors/error-mapper";

@Controller("rates")
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post("quote")
  async getRates(@Body() body: unknown) {
    const parsed = RateRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: parsed.error.issues,
      });
    }

    try {
      return await this.ratesService.getQuotes(parsed.data);
    } catch (error) {
      if (error instanceof CarrierError) {
        throw toHttpException(error);
      }
      throw error;
    }
  }
}
