import stringSimilarity from "string-similarity";
import type { ParsedTransaction } from "@/types/transaction";

/**
 * Strip the noisy parts of a raw bank descriptor (reference numbers,
 * store/terminal codes, city names, trailing country codes) down to
 * something closer to a canonical merchant name.
 *
 * This is intentionally conservative - it's meant to feed the fuzzy
 * clustering below, not to be the final answer on its own. Over-cleaning
 * risks merging unrelated merchants that happen to share short tokens.
 */
export function cleanMerchantToken(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\b\d{4,}\b/g, "") // long reference/terminal numbers
    .replace(/\bAU\b$/, "") // trailing country code
    .replace(/[^A-Z0-9 ]/g, " ") // punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export interface MerchantCluster {
  canonicalName: string;
  transactions: ParsedTransaction[];
}

const SIMILARITY_THRESHOLD = 0.6;

/**
 * Group transactions into merchant clusters.
 *
 * TODO (week 1): this is a first pass - greedy nearest-match clustering on
 * cleaned descriptor similarity. It will need real statement data to tune
 * SIMILARITY_THRESHOLD and to catch cases it over- or under-merges (e.g.
 * "NETFLIX.COM" vs a one-off "NETFLIX GIFT CARD" purchase at a retailer).
 */
export function clusterMerchants(transactions: ParsedTransaction[]): MerchantCluster[] {
  const clusters: MerchantCluster[] = [];

  for (const tx of transactions) {
    const cleaned = cleanMerchantToken(tx.rawDescription);
    const existing = clusters.find(
      (c) => stringSimilarity.compareTwoStrings(c.canonicalName, cleaned) >= SIMILARITY_THRESHOLD,
    );

    if (existing) {
      existing.transactions.push(tx);
    } else {
      clusters.push({ canonicalName: cleaned, transactions: [tx] });
    }
  }

  return clusters;
}
