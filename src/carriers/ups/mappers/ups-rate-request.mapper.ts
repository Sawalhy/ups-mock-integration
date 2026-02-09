import { RateRequest } from "../../../rates/dto/rate-request.dto";

export function mapToUpsRateRequest(request: RateRequest): Record<string, unknown> {
  return {
    RateRequest: {
      Request: {
        RequestOption: request.serviceLevel ? "Rate" : "Shop",
      },
      Shipment: {
        Shipper: {
          Address: {
            PostalCode: request.origin.postalCode,
            CountryCode: request.origin.countryCode,
          },
        },
        ShipTo: {
          Address: {
            PostalCode: request.destination.postalCode,
            CountryCode: request.destination.countryCode,
          },
        },
        ShipFrom: {
          Address: {
            PostalCode: request.origin.postalCode,
            CountryCode: request.origin.countryCode,
          },
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
}
