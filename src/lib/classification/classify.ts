import Anthropic from "@anthropic-ai/sdk";
import type { MerchantCluster } from "@/lib/csv/normalize-merchant";
import {
  classifySubscriptionTool,
  subscriptionClassificationSchema,
  type SubscriptionClassification,
} from "./schema";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5-5";

/**
 * Ask the model to judge one ambiguous merchant cluster.
 *
 * This should only be called on clusters the deterministic detector in
 * detection/periodicity.ts placed in the "unsure" confidence band - not on
 * every cluster. That's a deliberate cost/architecture decision: the
 * model's judgment is reserved for the cases where simple interval math
 * genuinely can't decide, not used as a blanket replacement for it.
 *
 * TODO (week 3): add the single reprompt-on-invalid-output retry here -
 * if the tool_use block fails schema validation, resend with the
 * validation error appended rather than silently giving up or crashing.
 */
export async function classifyAmbiguousCluster(
  cluster: MerchantCluster,
): Promise<SubscriptionClassification> {
  const chargeLines = cluster.transactions
    .map((tx) => `${tx.date.toISOString().slice(0, 10)}  $${(tx.amountCents / 100).toFixed(2)}  ${tx.rawDescription}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    tools: [classifySubscriptionTool],
    tool_choice: { type: "tool", name: classifySubscriptionTool.name },
    messages: [
      {
        role: "user",
        content: [
          "Here is every charge on a bank statement that matched to the same merchant cluster.",
          "Decide whether this looks like a recurring subscription (vs. a coincidence of similarly-timed",
          "one-off purchases), using the classify_subscription tool.",
          "",
          `Merchant cluster: ${cluster.canonicalName}`,
          "Charges (oldest first):",
          chargeLines,
        ].join("\n"),
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a classify_subscription tool call.");
  }

  return subscriptionClassificationSchema.parse(toolUse.input);
}
