/**
 * Shared Indian Currency (INR) and Financial Number Formatting Utilities
 */

interface FormatOptions {
  showDecimals?: boolean;
  compact?: boolean;
}

/**
 * Formats a number into Indian Rupee currency format (e.g., ₹1,25,500 or -₹1,25,500.00).
 * Uses Indian digit grouping (Lakhs, Crores) standard.
 */
export function formatINR(amount: number | null | undefined, options?: FormatOptions): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return options?.showDecimals ? '₹0.00' : '₹0';
  }

  const showDecimals = options?.showDecimals ?? false;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 2
  });

  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

/**
 * Returns formatted Indian number string without currency symbol.
 */
export function formatINRAmount(amount: number | null | undefined, options?: FormatOptions): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return options?.showDecimals ? '0.00' : '0';
  }

  const showDecimals = options?.showDecimals ?? false;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 2
  });

  return isNegative ? `-${formatted}` : formatted;
}
