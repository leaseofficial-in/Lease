const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

/**
 * Renders a number in words using the Indian numbering system
 * (thousand → lakh → crore), e.g. 112500 → "One Lakh Twelve Thousand Five Hundred".
 *
 * Rent receipts are expected to state the amount in words as well as figures, and a
 * receipt is a tax document — a wrong rendering here is a real problem for the user,
 * which is why this lives in lib/ with tests rather than inline in a component.
 *
 * Fractional input is floored: rent is stated in whole rupees on receipts.
 * Returns '' for zero, negative, or non-finite input so callers can show a placeholder.
 */
export function amountInWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  const num = Math.floor(n)

  const below100 = (v: number): string =>
    v < 20 ? ONES[v] : TENS[Math.floor(v / 10)] + (v % 10 ? ' ' + ONES[v % 10] : '')

  const below1000 = (v: number): string =>
    v > 99
      ? ONES[Math.floor(v / 100)] + ' Hundred' + (v % 100 ? ' ' + below100(v % 100) : '')
      : below100(v)

  const build = (v: number): string => {
    if (v < 1000) return below1000(v)
    if (v < 100_000) {
      const rest = v % 1000
      return below1000(Math.floor(v / 1000)) + ' Thousand' + (rest ? ' ' + below1000(rest) : '')
    }
    if (v < 10_000_000) {
      const rest = v % 100_000
      return below1000(Math.floor(v / 100_000)) + ' Lakh' + (rest ? ' ' + build(rest) : '')
    }
    const rest = v % 10_000_000
    return build(Math.floor(v / 10_000_000)) + ' Crore' + (rest ? ' ' + build(rest) : '')
  }

  return build(num)
}
