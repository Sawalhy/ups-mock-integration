import { z } from "zod";

export const WeightSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(["LB", "KG"]),
});

export const DimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["IN", "CM"]),
});

export const AddressSchema = z.object({
  postalCode: z.string().min(2),
  countryCode: z.string().length(2),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().min(1).optional(),
});

export const PackageSchema = z.object({
  weight: WeightSchema,
  dimensions: DimensionsSchema.optional(),
});

export const RateRequestSchema = z.object({
  carrierId: z.string().min(2).optional(),
  serviceLevel: z.string().min(2).optional(),
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1),
});

export type RateRequest = z.infer<typeof RateRequestSchema>;
