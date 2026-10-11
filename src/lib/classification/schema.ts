import { z } from "zod";

export const SUBSCRIPTION_CATEGORIES = [
  "streaming",
  "software",
  "fitness",
  "news_media",
  "utilities",
  "insurance",
  "food_delivery",
  "other",
] as const;

// What the classifier is forced to return via tool-use. Kept narrow and
// structured on purpose - this is the contract the Claude API call must
// satisfy, validated below rather than trusted blindly.
export const subscriptionClassificationSchema = z.object({
  is_subscription: z.boolean(),
  confidence: z.number().min(0).max(1),
  service_name: z.string().nullable(),
  category: z.enum(SUBSCRIPTION_CATEGORIES).nullable(),
  notes: z.string(),
});

export type SubscriptionClassification = z.infer<typeof subscriptionClassificationSchema>;

export const classifySubscriptionTool = {
  name: "classify_subscription",
  description:
    "Record a judgment on whether this merchant's charge history represents a recurring subscription.",
  input_schema: {
    type: "object" as const,
    properties: {
      is_subscription: { type: "boolean" as const },
      confidence: { type: "number" as const, minimum: 0, maximum: 1 },
      service_name: { type: ["string", "null"] as unknown as "string" },
      category: {
        type: ["string", "null"] as unknown as "string",
        enum: [...SUBSCRIPTION_CATEGORIES, null],
      },
      notes: { type: "string" as const },
    },
    required: ["is_subscription", "confidence", "service_name", "category", "notes"],
  },
};
