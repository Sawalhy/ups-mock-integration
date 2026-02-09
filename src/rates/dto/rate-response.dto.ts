import { z } from "zod";

export const RateQuoteSchema = z.object({
  carrierId: z.string(),
  serviceCode: z.string(),
  serviceName: z.string().optional(),
  totalCharge: z.number().nonnegative(),
  currency: z.string().min(3).max(3),
  deliveryDays: z.number().int().positive().optional(),
});

export type RateQuote = z.infer<typeof RateQuoteSchema>;

export const RateQuoteListSchema = z.array(RateQuoteSchema);
