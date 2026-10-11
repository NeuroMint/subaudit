// Run with: npm run eval
//
// Loads a hand-labeled CSV (date, amount, description, account,
// is_subscription_label) and reports precision/recall for the
// deterministic detector against the ground-truth labels, per merchant
// cluster. This is what week 2 should run before trusting the detection
// algorithm with real statements - the sample file here is a handful of
// made-up rows just to exercise the script, not a real eval set.
//
// TODO (week 2): replace labeled-transactions.sample.csv with real,
// hand-labeled rows from actual statements (anonymized if this ever
// leaves your machine) once there are enough to mean something -
// a handful of rows is not a real eval set, just a smoke test.
import { readFileSync } from "node:fs";
import { parseBankCsv } from "../src/lib/csv/parse";
import { clusterMerchants } from "../src/lib/csv/normalize-merchant";
import { detectPeriodicity } from "../src/lib/detection/periodicity";

interface LabeledRow {
  date: string;
  amount: string;
  description: string;
  account: string;
  is_subscription_label: string;
}

function loadLabeledCsv(path: string): LabeledRow[] {
  const lines = readFileSync(path, "utf-8").trim().split("\n");
  const [header, ...rows] = lines;
  const columns = header!.split(",");
  return rows.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(columns.map((col, i) => [col, values[i]])) as unknown as LabeledRow;
  });
}

function main() {
  const path = process.argv[2] ?? "eval/labeled-transactions.sample.csv";
  const rows = loadLabeledCsv(path);

  // Reuse the real CSV parser's normalized shape by feeding it a
  // CommBank-shaped (headerless, 4-column: date, amount, description,
  // balance) subset - this keeps the eval script exercising the same
  // code path production imports use rather than reimplementing parsing
  // just for scoring. Balance is unused by the parser, so a placeholder
  // value is fine here.
  const commbankShapedCsv = rows.map((r) => `${r.date},${r.amount},${r.description},0.00`).join("\n");
  const transactions = parseBankCsv(commbankShapedCsv, rows[0]?.account ?? "eval");

  const labelByDescription = new Map(rows.map((r) => [r.description, r.is_subscription_label === "true"]));
  const clusters = clusterMerchants(transactions);

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const cluster of clusters) {
    const predicted = detectPeriodicity(cluster.transactions.map((t) => t.date)).isPeriodic;
    const actual = cluster.transactions.some(
      (t) => labelByDescription.get(t.rawDescription) === true,
    );

    if (predicted && actual) truePositives++;
    else if (predicted && !actual) falsePositives++;
    else if (!predicted && actual) falseNegatives++;
  }

  const precision = truePositives / (truePositives + falsePositives || 1);
  const recall = truePositives / (truePositives + falseNegatives || 1);

  console.log(`Clusters evaluated: ${clusters.length}`);
  console.log(`Precision: ${precision.toFixed(2)}  Recall: ${recall.toFixed(2)}`);
}

main();
