import { NextResponse } from "next/server";
import { parseBankCsv, UnrecognizedBankFormatError } from "@/lib/csv/parse";
import { clusterMerchants } from "@/lib/csv/normalize-merchant";
import { detectPeriodicity } from "@/lib/detection/periodicity";
import { detectPriceCreep } from "@/lib/detection/price-creep";
import { classifyAmbiguousCluster } from "@/lib/classification/classify";
import { prisma } from "@/lib/db/client";

// Deterministic periodicity confidence below this falls into the
// "ambiguous" band and gets routed to the LLM classifier instead of
// being decided by interval math alone.
// TODO (week 2): tune against the eval set in eval/ once it has enough
// hand-labeled real examples to measure precision/recall against.
const AMBIGUOUS_CONFIDENCE_CEILING = 0.6;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const account = formData.get("account");

  if (!(file instanceof File) || typeof account !== "string") {
    return NextResponse.json({ error: "Expected 'file' and 'account' fields." }, { status: 400 });
  }

  let transactions;
  try {
    transactions = parseBankCsv(await file.text(), account);
  } catch (err) {
    if (err instanceof UnrecognizedBankFormatError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }

  const clusters = clusterMerchants(transactions);
  const results = [];

  for (const cluster of clusters) {
    const dates = cluster.transactions.map((tx) => tx.date);
    const amounts = cluster.transactions.map((tx) => tx.amountCents);
    const verdict = detectPeriodicity(dates);

    const needsLlmJudgment = cluster.transactions.length >= 2 && verdict.confidence < AMBIGUOUS_CONFIDENCE_CEILING;

    const classification = needsLlmJudgment ? await classifyAmbiguousCluster(cluster) : null;

    const isSubscription = classification ? classification.is_subscription : verdict.isPeriodic;
    if (!isSubscription) continue;

    const priceCreep = detectPriceCreep(amounts);

    results.push({
      merchant: cluster.canonicalName,
      source: classification ? "LLM" : "DETERMINISTIC",
      confidence: classification ? classification.confidence : verdict.confidence,
      intervalDays: verdict.isPeriodic ? verdict.intervalDays : null,
      serviceName: classification?.service_name ?? cluster.canonicalName,
      category: classification?.category ?? null,
      priceIncreaseDetected: priceCreep.increased,
      chargeCount: cluster.transactions.length,
    });
  }

  // TODO (week 1-2): persist `results` as MerchantCluster + Transaction +
  // Subscription rows via `prisma`, applying any existing Override rows
  // first so previously-dismissed false positives don't resurface.
  void prisma;

  return NextResponse.json({ detected: results });
}
