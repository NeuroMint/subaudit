# Detection eval

`score.ts` measures the deterministic periodicity detector's precision/recall
against hand-labeled transactions, so changes to the algorithm get checked
against real failure modes instead of "looks right on a couple examples."

`labeled-transactions.sample.csv` is a tiny made-up set just to exercise the
script end to end - it includes one deliberately awkward case (a skipped
billing month) to make sure the script doesn't silently pass with a trivial
dataset. It is **not** a real eval set.

Before trusting the detector on real statements (week 2 of the build), this
file needs replacing with genuinely hand-labeled rows pulled from real bank
exports - label each merchant cluster yourself as subscription/not, including
the awkward cases (trial-to-paid conversions, skipped months, coincidentally
periodic one-off purchases) that the naive algorithm is expected to get wrong
first. Real bank statement data must never be committed - see the root
`.gitignore`, which excludes every `eval/*.csv` except this sample.

Run with:

```
npm run eval
```
