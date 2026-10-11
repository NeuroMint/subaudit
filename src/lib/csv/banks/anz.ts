import type { BankParser } from "../parse";
import type { ParsedTransaction } from "@/types/transaction";

// TODO (week 1): ANZ's internet banking export includes a header row -
// column names below are a best guess and need checking against a real
// exported file ("Processed Date", "Amount", "Details" or similar).
export const anzParser: BankParser = {
  name: "ANZ",

  detect(headerRow) {
    const normalized = headerRow.map((h) => h.trim().toLowerCase());
    return normalized.includes("processed date") && normalized.includes("details");
  },

  parse(rows, account): ParsedTransaction[] {
    return rows.map(([date, amount, details]) => ({
      date: new Date(date ?? ""),
      amountCents: Math.round(Number(amount) * 100),
      rawDescription: (details ?? "").trim(),
      account,
    }));
  },
};
