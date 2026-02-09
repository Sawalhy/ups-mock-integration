import { z } from "zod";
import { CarrierError } from "../../../common/errors/carrier-errors";
import { RateQuote } from "../../../rates/dto/rate-response.dto";

const RatedShipmentSchema = z.object({
  Service: z.object({
    Code: z.string(),
    Description: z.string().optional(),
  }),
  TotalCharges: z.object({
    MonetaryValue: z.string(),
    CurrencyCode: z.string(),
  }),
  GuaranteedDelivery: z
    .object({
      BusinessDaysInTransit: z.string().optional(),
    })
    .optional(),
});

const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    RatedShipment: z.array(RatedShipmentSchema),
  }),
});

export function mapFromUpsRateResponse(
  response: unknown,
  carrierId: string,
): RateQuote[] {
  const parsed = UpsRateResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new CarrierError("MALFORMED_RESPONSE", "UPS rate response invalid", {
      details: { issues: parsed.error.issues },
    });
  }

  return parsed.data.RateResponse.RatedShipment.map((shipment) => {
    const deliveryDaysValue = shipment.GuaranteedDelivery?.BusinessDaysInTransit;
    const deliveryDays = deliveryDaysValue
      ? Number(deliveryDaysValue)
      : undefined;

    return {
      carrierId,
      serviceCode: shipment.Service.Code,
      serviceName: shipment.Service.Description,
      totalCharge: Number(shipment.TotalCharges.MonetaryValue),
      currency: shipment.TotalCharges.CurrencyCode,
      deliveryDays: Number.isFinite(deliveryDays) ? deliveryDays : undefined,
    };
  });
}
