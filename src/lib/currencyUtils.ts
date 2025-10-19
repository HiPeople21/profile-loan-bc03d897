// Currency conversion utilities

export interface ExchangeRates {
  [key: string]: number;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
];

// Cache for exchange rates
let exchangeRatesCache: { rates: ExchangeRates; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetch exchange rates from API
 * Using exchangerate-api.io free tier (no API key required for basic usage)
 */
export async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
  // Check cache first
  if (exchangeRatesCache && Date.now() - exchangeRatesCache.timestamp < CACHE_DURATION) {
    return exchangeRatesCache.rates;
  }

  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rates = data.rates as ExchangeRates;

    // Update cache
    exchangeRatesCache = {
      rates,
      timestamp: Date.now(),
    };

    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return fallback rates if API fails
    return getFallbackRates();
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await fetchExchangeRates(fromCurrency);
  const rate = rates[toCurrency];

  if (!rate) {
    throw new Error(`Exchange rate not found for ${toCurrency}`);
  }

  return amount * rate;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  
  // Format number with appropriate decimal places
  let formattedAmount: string;
  if (currencyCode === 'JPY') {
    // Japanese Yen doesn't use decimal places
    formattedAmount = Math.round(amount).toLocaleString();
  } else {
    formattedAmount = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return `${symbol}${formattedAmount}`;
}

/**
 * Get conversion rate text for display
 */
export async function getConversionRateText(
  fromCurrency: string,
  toCurrency: string,
  amount: number
): Promise<string> {
  if (fromCurrency === toCurrency) {
    return '';
  }

  try {
    const convertedAmount = await convertCurrency(amount, fromCurrency, toCurrency);
    return `≈ ${formatCurrency(convertedAmount, toCurrency)}`;
  } catch (error) {
    console.error('Error getting conversion rate:', error);
    return '';
  }
}

/**
 * Fallback exchange rates in case API fails
 */
function getFallbackRates(): ExchangeRates {
  return {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.5,
    AUD: 1.52,
    CAD: 1.36,
    CHF: 0.88,
    CNY: 7.24,
    INR: 83.12,
    MXN: 17.24,
  };
}
