// Dinero en centavos enteros (D51).
//
// Los precios viajan como texto ("19990.50", D45). Para sumar o multiplicar
// NO se usa number con decimales (0.1 + 0.2 = 0.30000000000000004): se pasa
// a centavos enteros, se opera con enteros (exacto) y se vuelve a texto.

const AMOUNT = /^(\d+)(?:\.(\d{1,2}))?$/;

/** "19990.5" → 1999050. Se parte el texto: nunca se multiplica un decimal por 100. */
export function toCents(amount: string): number {
  const match = AMOUNT.exec(amount);
  if (!match) {
    throw new Error(`Monto inválido: "${amount}"`);
  }
  const [, units, decimals = ''] = match;
  return Number(units) * 100 + Number(decimals.padEnd(2, '0'));
}

/** 1999050 → "19990.50". */
export function fromCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error(`Centavos inválidos: ${cents}`);
  }
  const units = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, '0');
  return `${units}.${decimals}`;
}
