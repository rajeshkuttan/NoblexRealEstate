/**
 * Currency Utilities
 * Handles safe currency formatting to prevent NaN values
 */

/**
 * Safely format a number as currency
 * @param amount - The amount to format (can be number, string, null, or undefined)
 * @param currency - The currency code (default: 'AED')
 * @returns Formatted currency string (e.g., "AED 1,234.56")
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency: string = 'AED'
): string => {
  // Convert to number and handle invalid values
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const validAmount = numericAmount && !isNaN(numericAmount) ? numericAmount : 0;

  try {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(validAmount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${currency} ${validAmount.toFixed(2)}`;
  }
};

/**
 * Safely parse a value to a number
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed number or default value
 */
export const safeParseFloat = (
  value: number | string | null | undefined,
  defaultValue: number = 0
): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(parsed) ? parsed : defaultValue;
};

/**
 * Safely parse a value to an integer
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails (default: 0)
 * @returns Parsed integer or default value
 */
export const safeParseInt = (
  value: number | string | null | undefined,
  defaultValue: number = 0
): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = typeof value === 'string' ? parseInt(value, 10) : Math.floor(value);
  return !isNaN(parsed) ? parsed : defaultValue;
};

/**
 * Format a number with thousand separators
 * @param value - The value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number | string | null | undefined,
  decimals: number = 2
): string => {
  const numericValue = safeParseFloat(value, 0);
  return numericValue.toLocaleString('en-AE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Calculate percentage safely
 * @param value - The value
 * @param total - The total
 * @returns Percentage (0-100) or 0 if total is 0
 */
export const calculatePercentage = (
  value: number | string | null | undefined,
  total: number | string | null | undefined
): number => {
  const numValue = safeParseFloat(value, 0);
  const numTotal = safeParseFloat(total, 0);

  if (numTotal === 0) {
    return 0;
  }

  return (numValue / numTotal) * 100;
};

/**
 * Format percentage
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number | string | null | undefined,
  decimals: number = 2
): string => {
  const numericValue = safeParseFloat(value, 0);
  return `${numericValue.toFixed(decimals)}%`;
};
