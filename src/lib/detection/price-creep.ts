export interface PriceCreepVerdict {
  increased: boolean;
  firstAmountCents: number;
  lastAmountCents: number;
  pctChange: number;
}

const MATERIAL_INCREASE_THRESHOLD = 0.05; // 5%

/**
 * Flag a subscription whose charge amount has crept up over time
 * (the classic "price went from $9.99 to $12.99 and nobody announced it"
 * pattern). Amounts should already be in chronological order.
 */
export function detectPriceCreep(amountsCentsChronological: number[]): PriceCreepVerdict {
  const first = amountsCentsChronological[0];
  const last = amountsCentsChronological[amountsCentsChronological.length - 1];

  if (first === undefined || last === undefined || first === 0) {
    return { increased: false, firstAmountCents: first ?? 0, lastAmountCents: last ?? 0, pctChange: 0 };
  }

  const pctChange = (last - first) / first;
  return {
    increased: pctChange >= MATERIAL_INCREASE_THRESHOLD,
    firstAmountCents: first,
    lastAmountCents: last,
    pctChange,
  };
}
