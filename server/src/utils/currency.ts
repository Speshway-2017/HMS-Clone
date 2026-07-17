export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toPaise(value: number): number {
  return Math.round(roundCurrency(value) * 100);
}

export function fromPaise(paise: number): number {
  return roundCurrency(paise / 100);
}
