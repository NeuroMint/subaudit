import type { BankParser } from "../parse";
import type { ParsedTransaction } from "@/types/transaction";

// TODO (week 1, STILL UNVERIFIED): headerless (Date, Amount, Description,
// Balance) is the commonly cited shape for CommBank's NetBank "Download
// transactions" export in third-party finance-tooling docs, but a web
// search for an authoritative CommBank source came up empty - this is
// still an assumption, not a confirmed spec. detect() below (4 columns,
// date-shaped first cell, numeric second cell) is a placeholder until a
// real exported sample is in hand - verify against an actual file before
// trusting this.
export const commbankParser: BankParser = {
  name: "CommBank",

  detect(headerRow) {
    // Headerless CSVs can't be detected by column names - detect by shape
    // instead: 4 columns, first cell parses as a date, second as a number.
    if (headerRow.length !== 4) return false;
    const [date, amount] = headerRow;
    return !Number.isNaN(Date.parse(date ?? "")) && !Number.isNaN(Number(amount));
  },

  parse(rows, account): ParsedTransaction[] {
    return rows.map(([date, amount, description]) => ({
      date: new Date(date ?? ""),
      amountCents: Math.round(Number(amount) * 100),
      rawDescription: (description ?? "").trim(),
      account,
    }));
  },
};
