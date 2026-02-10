import { z } from "zod";
import { RateRequest } from "../../../rates/dto/rate-request.dto";
import { CarrierError } from "../../../common/errors/carrier-errors";

const UpsRateRequestSchema = z.object({
  RateRequest: z.object({
    Request: z.object({
      RequestOption: z.string(),
    }),
    Shipment: z.object({
      Shipper: z.object({
        Address: z.object({
          AddressLine: z.array(z.string()).min(1).optional(),
          City: z.string().optional(),
          StateProvinceCode: z.string().optional(),
          PostalCode: z.string(),
          CountryCode: z.string(),
        }),
      }),
      ShipTo: z.object({
        Address: z.object({
          AddressLine: z.array(z.string()).min(1).optional(),
          City: z.string().optional(),
          StateProvinceCode: z.string().optional(),
          PostalCode: z.string(),
          CountryCode: z.string(),
        }),
      }),
      ShipFrom: z.object({
        Address: z.object({
          AddressLine: z.array(z.string()).min(1).optional(),
          City: z.string().optional(),
          StateProvinceCode: z.string().optional(),
          PostalCode: z.string(),
          CountryCode: z.string(),
        }),
      }),
      Service: z
        .object({
          Code: z.string(),
        })
        .optional(),
      Package: z.array(
        z.object({
          PackagingType: z.object({
            Code: z.string(),
          }),
          PackageWeight: z.object({
            UnitOfMeasurement: z.object({
              Code: z.string(),
            }),
            Weight: z.string(),
          }),
          Dimensions: z
            .object({
              UnitOfMeasurement: z.object({
                Code: z.string(),
              }),
              Length: z.string(),
              Width: z.string(),
              Height: z.string(),
            })
            .optional(),
        }),
      ),
    }),
  }),
});

export function mapToUpsRateRequest(request: RateRequest): Record<string, unknown> {
  const mapAddress = (address: RateRequest["origin"]) => {
    const addressLines = [
      address.addressLine1,
      address.addressLine2,
    ].filter((line): line is string => Boolean(line));

    return {
      AddressLine: addressLines.length > 0 ? addressLines : undefined,
      City: address.city,
      StateProvinceCode: address.state,
      PostalCode: address.postalCode,
      CountryCode: address.countryCode,
    };
  };

  const payload = {
    RateRequest: {
      Request: {
        RequestOption: request.serviceLevel ? "Rate" : "Shop",
      },
      Shipment: {
        Shipper: {
          Address: mapAddress(request.origin),
        },
        ShipTo: {
          Address: mapAddress(request.destination),
        },
        ShipFrom: {
          Address: mapAddress(request.origin),
        },
        Service: request.serviceLevel
          ? {
              Code: request.serviceLevel,
            }
          : undefined,
        Package: request.packages.map((pkg) => ({
          PackagingType: {
            Code: "02",
          },
          PackageWeight: {
            UnitOfMeasurement: {
              Code: pkg.weight.unit === "LB" ? "LBS" : "KGS",
            },
            Weight: pkg.weight.value.toString(),
          },
          Dimensions: pkg.dimensions
            ? {
                UnitOfMeasurement: {
                  Code: pkg.dimensions.unit === "IN" ? "IN" : "CM",
                },
                Length: pkg.dimensions.length.toString(),
                Width: pkg.dimensions.width.toString(),
                Height: pkg.dimensions.height.toString(),
              }
            : undefined,
        })),
      },
    },
  };

  const parsed = UpsRateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    throw new CarrierError("MALFORMED_RESPONSE", "UPS request payload invalid", {
      details: { issues: parsed.error.issues },
    });
  }

  return payload;
}
