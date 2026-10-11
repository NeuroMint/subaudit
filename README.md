# SubAudit

Recurring-charge auditor. Upload a bank statement CSV, get back the
subscriptions hiding in it (with price-creep flags), and get a drafted
cancellation message for anything you decide to cut.

Second case study for a programming portfolio, deliberately different from
the first (PikTCG - a Discord bot monitoring 20+ AU Pokémon TCG retailers for
restocks). Where PikTCG used AI only as a build tool, this project puts an
LLM genuinely inside the product: a human-approved, tool-use-driven
classification and drafting layer, not a chatbot wrapper.

## Architecture

1. **CSV ingestion** (`src/lib/csv/`) - bank-specific parsers normalize
   different export formats into a common `ParsedTransaction` shape.
2. **Merchant clustering** (`src/lib/csv/normalize-merchant.ts`) - fuzzy-
   matches raw descriptors ("NETFLIX.COM 134-5582 SYDNEY AU") into merchant
   identities.
3. **Deterministic detection** (`src/lib/detection/`) - interval/variance
   math decides whether a cluster's charge history is periodic, and flags
   price creep over time. This is the algorithmic core of the project.
4. **LLM classification** (`src/lib/classification/`) - only clusters the
   deterministic detector is genuinely unsure about get sent to Claude, via
   a tool-use call that forces structured, schema-validated output. The
   model is not consulted on clusters the algorithm already has a confident
   answer for.
5. **Cancellation drafting agent** (`src/lib/agent/draft-cancellation.ts`) -
   drafts (never sends) a cancellation message for anything flagged to
   cancel. A human reviews and acts on it themselves - the approval gate is
   the design, not a v2 TODO.
6. **Overrides** (Prisma `Override` model) - user corrections persist, so a
   false positive dismissed once doesn't resurface on the next import.

See `prisma/schema.prisma` for the full data model.

## Status

Scaffold stage. Core modules exist as real interfaces with working-but-
unvalidated first-pass implementations, marked with `TODO` comments where
they need tuning against real bank data (see `eval/`).

Build plan:
- **Week 1** - real bank CSV formats, transaction model, merchant clustering
- **Week 2** - periodicity + price-creep detection, hand-labeled eval set
- **Week 3** - LLM classification wiring, cancellation-drafting agent, overrides
- **Week 4** - dashboard UI, polish, case-study write-up

## Setup

```
npm install
cp .env.example .env   # set DATABASE_URL and ANTHROPIC_API_KEY
npm run prisma:migrate
npm run dev
```

Run the detection eval with `npm run eval` (see `eval/README.md`).
