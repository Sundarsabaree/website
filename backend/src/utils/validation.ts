import { z } from "zod";

/** ISO/date string that must be parseable; empty string is allowed (treated as "no date"). */
export const optionalDate = z
  .union([
    z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid date" }),
    z.literal(""),
  ])
  .nullable()
  .optional();

/** undefined -> "not provided", null/'' -> clear the date, otherwise a Date. */
export function parseDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return new Date(value);
}
