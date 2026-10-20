import { z } from "zod";
import { PC_HARDWARE_MULTISELECT_KEYS } from "./pc-hardware-taxonomy";

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(1024),
});

export const registerSchema = loginSchema.extend({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/),
});
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(320),
});

const attributeValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().min(1).max(120)).min(1).max(32),
]);
const listingAttributesSchema = z.record(z.string().max(80), attributeValueSchema).superRefine((attributes, context) => {
  for (const [key, value] of Object.entries(attributes)) {
    if (Array.isArray(value) && key !== "compatibility" && !PC_HARDWARE_MULTISELECT_KEYS.has(key)) context.addIssue({ code: "custom", path: [key], message: "This attribute cannot contain multiple values." });
  }
});

export const listingSchema = z
  .object({
    title: z.string().trim().min(6).max(120),
    description: z.string().trim().min(1).max(5000),
    price: z.coerce.number().positive().max(1_000_000),
    categoryId: z.string().min(1),
    productName: z.string().trim().min(2).max(160),
    condition: z.enum(["new", "like_new", "good", "fair", "parts"]),
    location: z.string().trim().min(2).max(120),
    shipping: z.boolean(),
    meetup: z.boolean(),
    attributes: listingAttributesSchema,
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
    description: z.string().trim().min(1).max(5000),
    price: z.coerce.number().positive().max(1_000_000),
    condition: z.enum(["new", "like_new", "good", "fair", "parts"]),
    location: z.string().trim().min(2).max(120),
    shipping: z.boolean(),
    meetup: z.boolean(),
    status: z.enum(["draft", "active", "reserved", "sold", "removed"]),
    categoryId: z.string().uuid().optional(),
    productName: z.string().trim().min(2).max(160).optional(),
    attributes: listingAttributesSchema.optional(),
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

export const ratingSchema = z
  .object({
    sellerId: z.string().uuid(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => value || null),
  })
  .strict();

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
export const conversationIdSchema = z.string().uuid();
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
