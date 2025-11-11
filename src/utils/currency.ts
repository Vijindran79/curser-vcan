// Lightweight currency utilities with on-demand FX retrieval and 24h caching
//
// Base assumption: backend and stored rates/prices default to USD unless specified.
// We cache rates per base in localStorage to avoid repeated network calls.

export type FxTable = {
	updatedAt: string;
	base: string;
	rates: Record<string, number>;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(base: string) {
	return `vcanship_fx_${base.toUpperCase()}`;
}

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

export async function getRate(base: string, target: string): Promise<number> {
	const baseCode = base.toUpperCase();
	const targetCode = target.toUpperCase();
	if (baseCode === targetCode) return 1;
	const cached = getCachedRates(baseCode);
	if (cached && cached.rates[targetCode]) return cached.rates[targetCode];
	const table = await fetchRates(baseCode, [targetCode]);
	return table.rates[targetCode] || 1;
}

export async function convertAmount(amount: number, base: string, target: string): Promise<number> {
	const rate = await getRate(base, target);
	return Math.round((amount * rate + Number.EPSILON) * 100) / 100;
}

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


