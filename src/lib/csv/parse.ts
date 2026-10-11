import Papa from "papaparse";
import type { ParsedTransaction } from "@/types/transaction";
import { commbankParser } from "./banks/commbank";
import { anzParser } from "./banks/anz";

export interface BankParser {
  name: string;
  /** Does this CSV's header row match this bank's export format? */
  detect(headerRow: string[]): boolean;
  /** Map raw CSV rows (header already stripped) to normalized transactions. */
  parse(rows: string[][], account: string): ParsedTransaction[];
}

const PARSERS: BankParser[] = [commbankParser, anzParser];

export class UnrecognizedBankFormatError extends Error {}

export function parseBankCsv(csvText: string, account: string): ParsedTransaction[] {
  const { data } = Papa.parse<string[]>(csvText.trim(), { skipEmptyLines: true });
  if (data.length === 0) return [];

  const [header, ...rows] = data as [string[], ...string[][]];
  const parser = PARSERS.find((p) => p.detect(header));
  if (!parser) {
    throw new UnrecognizedBankFormatError(
      `No parser matched this CSV's header: ${header.join(",")}`,
    );
  }
  return parser.parse(rows, account);
}
