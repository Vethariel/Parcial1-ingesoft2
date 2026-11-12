import { fromCents, toCents } from './money.js';

describe('money', () => {
  it.each([
    ['19990.50', 1999050],
    ['19990.5', 1999050],
    ['19990', 1999000],
    ['0.01', 1],
    ['0.10', 10],
  ])('toCents(%s) = %i', (amount, cents) => {
    expect(toCents(amount)).toBe(cents);
  });

  it.each(['-1', '1.234', 'abc', '', '1e3'])('toCents rechaza %s', (amount) => {
    expect(() => toCents(amount)).toThrow();
  });

  it('fromCents da siempre 2 decimales', () => {
    expect(fromCents(1999050)).toBe('19990.50');
    expect(fromCents(5)).toBe('0.05');
    expect(fromCents(0)).toBe('0.00');
  });

  it('suma exacta donde number falla (0.1 + 0.2)', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(fromCents(toCents('0.10') + toCents('0.20'))).toBe('0.30');
  });
});
