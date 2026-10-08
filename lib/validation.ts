import { z } from "zod";

export const listingSchema = z
  .object({
    title: z.string().trim().min(6).max(120),
    description: z.string().trim().min(20).max(5000),
    price: z.coerce.number().positive().max(1_000_000),
    categoryId: z.string().min(1),
    productName: z.string().trim().min(2).max(160),
    condition: z.enum(["new", "like_new", "good", "fair", "parts"]),
    location: z.string().trim().min(2).max(120),
    shipping: z.boolean(),
    meetup: z.boolean(),
    attributes: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean()]),
    ),
    requestId: z.string().uuid(),
  })
  .strict()
  .refine((value) => value.shipping || value.meetup, {
    message: "Choose shipping or meetup",
    path: ["shipping"],
  });

export const listingUpdateSchema = z
  .object({
    title: z.string().trim().min(6).max(120),
    description: z.string().trim().min(20).max(5000),
    price: z.coerce.number().positive().max(1_000_000),
    condition: z.enum(["new", "like_new", "good", "fair", "parts"]),
    location: z.string().trim().min(2).max(120),
    shipping: z.boolean(),
    meetup: z.boolean(),
    status: z.enum(["draft", "active", "reserved", "sold", "removed"]),
  })
  .strict()
  .refine((value) => value.shipping || value.meetup, {
    message: "Choose shipping or meetup",
    path: ["shipping"],
  });

export const reportSchema = z.object({
  listingId: z.string().uuid(),
  reason: z.enum([
    "scam",
    "prohibited",
    "misleading",
    "duplicate",
    "spam",
    "other",
  ]),
  details: z.string().max(1000).optional(),
});

export const favoriteSchema = z.object({ listingId: z.string().uuid() });

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.]+$/),
  displayName: z.string().trim().min(1).max(80),
  location: z.string().trim().max(120).optional().default(""),
  bio: z.string().trim().max(500).optional().default(""),
});

export const conversationSchema = z
  .object({ listingId: z.string().uuid() })
  .strict();
export const messageSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    clientId: z.string().uuid(),
  })
  .strict();
export const offerSchema = z
  .object({
    conversationId: z.string().uuid(),
    amount: z.coerce.number().positive().max(1_000_000),
    parentOfferId: z.string().uuid().nullable().optional(),
  })
  .strict();
export const offerActionSchema = z
  .object({ action: z.enum(["accepted", "declined", "withdrawn"]) })
  .strict();
export const tradeSchema = z
  .object({
    conversationId: z.string().uuid(),
    offeredListingId: z.string().uuid(),
    cashAdjustment: z.coerce.number().min(0).max(1_000_000),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
export const tradeActionSchema = z
  .object({ action: z.enum(["accepted", "declined", "withdrawn"]) })
  .strict();
const savedSearchFields = z
  .object({
    name: z.string().trim().min(1).max(80),
    searchTerm: z.string().trim().max(120).nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    condition: z
      .enum(["new", "like_new", "good", "fair", "parts"])
      .nullable()
      .optional(),
    intent: z
      .enum(["sale", "wanted", "trade", "sale_or_trade"])
      .nullable()
      .optional(),
    minPrice: z.coerce.number().positive().max(1_000_000).nullable().optional(),
    maxPrice: z.coerce.number().positive().max(1_000_000).nullable().optional(),
    location: z.string().trim().max(120).nullable().optional(),
    enabled: z.boolean().default(true),
  })
  .strict();

const validSavedSearchRange = (value: {
  minPrice?: number | null;
  maxPrice?: number | null;
}) =>
  value.minPrice == null ||
  value.maxPrice == null ||
  value.minPrice <= value.maxPrice;

export const savedSearchSchema = savedSearchFields
  .refine(
    validSavedSearchRange,
    {
      message: "Minimum price must not exceed maximum price",
      path: ["minPrice"],
    },
  );

export const savedSearchUpdateSchema = savedSearchFields.partial().refine(
  validSavedSearchRange,
  {
    message: "Minimum price must not exceed maximum price",
    path: ["minPrice"],
  },
);
