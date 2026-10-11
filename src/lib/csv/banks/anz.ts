import type { BankParser } from "../parse";
import type { ParsedTransaction } from "@/types/transaction";

// TODO (week 1, STILL UNVERIFIED): switched from a header-based guess to
// headerless 3-column (Date, Amount, Description) based on a third-party
// import-format guide (Saasu's bank-statement-import docs), which matches
// CommBank's own shape minus the balance column. One other source
// (a Python bank-CSV parsing package's field list) describes ANZ exports
// with 7+ fields instead - that may be a different ANZ export product
// (business/Transactive) rather than personal internet banking, but it
// means this still needs checking against one real exported file before
// it's trusted. detect() tells ANZ apart from CommBank by column count
// alone (3 vs 4) - if a real export doesn't match either shape, detect()
// correctly falls through to UnrecognizedBankFormatError rather than
// mis-parsing it.
export const anzParser: BankParser = {
  name: "ANZ",

  detect(headerRow) {
    if (headerRow.length !== 3) return false;
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
