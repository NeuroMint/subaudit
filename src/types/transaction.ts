// Common shape every bank CSV parser normalizes into, before anything
// touches the database.
export interface ParsedTransaction {
  date: Date;
  amountCents: number;
  rawDescription: string;
  account: string;
}
