import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5-5";

export interface CancellationDraftInput {
  serviceName: string;
  category: string | null;
  monthlyCostCents: number | null;
}

/**
 * Draft a cancellation email/message for a subscription the user has
 * explicitly flagged to cancel.
 *
 * Deliberately draft-only for v1: this never sends anything on its own.
 * The guardrail is the point of the architecture, not a gap to close
 * later - a human reads, edits, and sends/uses this themselves. If v2
 * ever adds real sending, it still needs an explicit approval step
 * in between, not a shortcut around one.
 */
export async function draftCancellationMessage(
  input: CancellationDraftInput,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          `Draft a short, polite cancellation request for a subscription called "${input.serviceName}"`,
          input.category ? `(category: ${input.category})` : "",
          input.monthlyCostCents
            ? `currently costing $${(input.monthlyCostCents / 100).toFixed(2)}/month.`
            : "",
          "Write it as a message the subscriber could send to the provider's support channel,",
          "or as self-serve steps if cancellation is typically done through account settings for a",
          "service like this. Keep it to a few sentences.",
        ]
          .filter(Boolean)
          .join(" "),
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model did not return draft text.");
  }
  return textBlock.text;
}
