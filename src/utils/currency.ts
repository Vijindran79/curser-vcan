// Lightweight currency utilities with on-demand FX retrieval and 24h caching
//
// Base assumption: backend and stored rates/prices default to USD unless specified.
// We cache rates per base in localStorage to avoid repeated network calls.

export type FxTable = {
	updatedAt: string;
	base: string;
	rates: Record<string, number>;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; /**
 * Builds the storage key used to cache FX rates for a given base currency.
 *
 * @param base - The base currency code (e.g., "usd" or "USD")
 * @returns The cache key string in the form `vcanship_fx_<BASE>` where `<BASE>` is the uppercased currency code
 */

function getCacheKey(base: string) {
	return `vcanship_fx_${base.toUpperCase()}`;
}

/**
 * Retrieves a cached FX table for the given base currency if it is still valid.
 *
 * @param base - Base currency code (case-insensitive)
 * @returns The cached `FxTable` for `base` when present and updated within 24 hours, `null` otherwise
 */
export function getCachedRates(base: string): FxTable | null {
	try {
		const raw = localStorage.getItem(getCacheKey(base));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as FxTable;
		const age = Date.now() - new Date(parsed.updatedAt).getTime();
		return age < CACHE_TTL_MS ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Fetches the latest exchange rates for a given base currency and optional target symbols.
 *
 * @param base - Base currency code (case-insensitive)
 * @param symbols - Optional array of target currency codes to limit the returned rates
 * @returns An FxTable containing `updatedAt` (ISO string), `base` (currency code), and `rates` (mapping of currency code to rate)
 * @throws Error if the HTTP request returns a non-ok response (includes the response status)
 * @remarks The fetched table is stored in localStorage under a per-base cache key; storage failures (e.g., quota) are ignored.
 */
export async function fetchRates(base: string, symbols?: string[]): Promise<FxTable> {
	const baseCode = base.toUpperCase();
	const symbolsParam = symbols && symbols.length > 0 ? `&symbols=${symbols.map((s) => s.toUpperCase()).join(',')}` : '';
	// exchangerate.host is free and reliable; no key required
	const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(baseCode)}${symbolsParam}`;
	const resp = await fetch(url, { method: 'GET' });
	if (!resp.ok) {
		throw new Error(`FX fetch failed (${resp.status})`);
	}
	const data = await resp.json();
	const table: FxTable = {
		updatedAt: new Date().toISOString(),
		base: data.base || baseCode,
		rates: data.rates || {},
	};
	try {
		localStorage.setItem(getCacheKey(table.base), JSON.stringify(table));
	} catch {
		// ignore quota issues
	}
	return table;
}

/**
 * Get the exchange rate from one currency to another.
 *
 * @param base - The base currency code (case-insensitive)
 * @param target - The target currency code (case-insensitive)
 * @returns The numeric exchange rate from `base` to `target`; returns `1` if the codes are identical or if a rate cannot be obtained
 */
export async function getRate(base: string, target: string): Promise<number> {
	const baseCode = base.toUpperCase();
	const targetCode = target.toUpperCase();
	if (baseCode === targetCode) return 1;
	const cached = getCachedRates(baseCode);
	if (cached && cached.rates[targetCode]) return cached.rates[targetCode];
	const table = await fetchRates(baseCode, [targetCode]);
	return table.rates[targetCode] || 1;
}

/**
 * Converts a monetary amount from one currency to another using the latest available exchange rate.
 *
 * @param amount - The numeric amount in the source currency to convert
 * @param base - The source currency code (e.g., "USD")
 * @param target - The target currency code (e.g., "EUR")
 * @returns The converted amount rounded to two decimal places
 */
export async function convertAmount(amount: number, base: string, target: string): Promise<number> {
	const rate = await getRate(base, target);
	return Math.round((amount * rate + Number.EPSILON) * 100) / 100;
}

/**
 * Format a numeric amount as a localized currency string.
 *
 * @param amount - The numeric value to format
 * @param currency - The ISO 4217 currency code (case-insensitive)
 * @param locale - Optional BCP 47 locale identifier to use for formatting; defaults to the runtime locale when omitted
 * @returns The formatted currency string, or a fallback of `"<CURRENCY> <amount with two decimals>"` if formatting fails
 */
export function formatCurrency(amount: number, currency: string, locale?: string): string {
	try {
		return new Intl.NumberFormat(locale || undefined, {
			style: 'currency',
			currency: currency.toUpperCase(),
			maximumFractionDigits: 2,
		}).format(amount);
	} catch {
		return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
	}
}

