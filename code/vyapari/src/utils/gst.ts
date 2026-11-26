/**
 * GST helpers.
 *
 * Product prices in Vyapari are GST-inclusive. The applicable rate is derived from
 * the product category; tax is back-calculated from the inclusive amount:
 *   taxable = inclusive / (1 + rate / 100),  gst = inclusive - taxable
 */
export const getGstRate = (category?: string): number => {
  const c = (category || '').toLowerCase();
  if (c.includes('grocery') || c.includes('food')) return 5;
  if (c.includes('electronics') || c.includes('device')) return 18;
  if (c.includes('apparel') || c.includes('clothing')) return 5;
  if (c.includes('stationery')) return 12;
  return 12;
};

/** GST contained in a GST-inclusive amount. */
export const gstIncludedIn = (inclusiveAmount: number, rate: number): number =>
  inclusiveAmount - inclusiveAmount / (1 + rate / 100);
