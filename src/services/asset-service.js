import { supabase } from '../infrastructure/supabase-client.js';
import { Asset } from '../models/asset.js';
import { TICKER_DATA } from '../utils/ticker-data.js';

const RECOMMENDED_CACHE_MAX_AGE_MS = 18 * 60 * 60 * 1000;

function isRecommendedCacheFresh(timestamp, now = new Date()) {
    if (!timestamp) return false;
    const cachedAt = new Date(timestamp);
    if (!Number.isFinite(cachedAt.getTime()) || cachedAt > now) return false;

    return cachedAt.toDateString() === now.toDateString()
        || now.getTime() - cachedAt.getTime() <= RECOMMENDED_CACHE_MAX_AGE_MS;
}

export const AssetService = {
    // --- BLINDAGEM JWT ---
    async _getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            throw new Error('Acesso negado: Usuário não autenticado.');
        }
        
        return {
            Authorization: `Bearer ${session.access_token}`
        };
    },

    // Busca ativos no banco de dados e carrega o cache instantâneo (incluindo os meses pagos)
    async getAssets() {
        const { data, error } = await supabase.from('assets').select('*');
        if (error) return [];
        
        return data.map(item => {
            const asset = new Asset(item.ticker, item.quantity, item.average_price, item.vpa);
            asset.id = item.id;
            
            // CACHE INSTANTÂNEO: Aplica preço, variação, DY, P/VP e os meses pagos salvos
            const cachedPaidMonths = Array.isArray(item.cached_paid_months)
                ? item.cached_paid_months
                : item.cached_paid_months?.months || [];
            asset.applyCache(
                item.cached_price,
                item.cached_change,
                item.cached_yield,
                item.cached_pvp,
                cachedPaidMonths
            );
            
            return asset;
        });
    },

    async getRecommendedFromCache() {
        const { data, error } = await supabase
            .from('recommended_cache')
            .select('*')
            .order('type', { ascending: true });

        if (error) throw error;
        if (!Array.isArray(data) || data.length === 0) return [];

        const now = new Date();
        const freshRows = data.filter(row => isRecommendedCacheFresh(
            row.updated_at ?? row.created_at ?? row.timestamp,
            now
        ));
        if (freshRows.length === 0) return [];

        const latestTimestamp = Math.max(...freshRows.map(row => new Date(
            row.updated_at ?? row.created_at ?? row.timestamp
        ).getTime()));
        const latestBatch = freshRows.filter(row => new Date(
            row.updated_at ?? row.created_at ?? row.timestamp
        ).getTime() === latestTimestamp);
        if (latestBatch.length !== 10) return [];

        return latestBatch.map(row => {
            const paidMonths = row.paid_months ?? row.paidMonths ?? [];
            const marketData = {
                price: row.price ?? row.current_price ?? null,
                yieldpct: row.yield_pct ?? row.yieldPct ?? 0,
                priceToBook: row.price_to_book ?? row.priceToBook ?? null,
                changePercent: row.change_percent ?? row.changePercent ?? null,
                paidMonths: Array.isArray(paidMonths) ? paidMonths : []
            };

            return {
                ticker: row.ticker,
                name: row.name ?? TICKER_DATA[row.ticker]?.name ?? row.ticker,
                type: row.type,
                sector: row.category ?? row.sector ?? TICKER_DATA[row.ticker?.replace(/\.SA$/i, '').toUpperCase()]?.segment ?? 'Outros',
                strategy: row.strategy ?? undefined,
                score: Number(row.score) || 0,
                marketData
            };
        });
    },

    async saveRecommendedCache(assets) {
        const timestamp = new Date().toISOString();
        const rows = assets.map(asset => {
            const marketData = asset.marketData ?? {};
            return {
                ticker: asset.ticker,
                name: asset.name ?? TICKER_DATA[asset.ticker]?.name ?? asset.ticker,
                type: asset.type ?? TICKER_DATA[asset.ticker]?.type ?? 'Ação',
                category: asset.sector ?? asset.category ?? 'Geral',
                score: Number(asset.score) || 0,
                price: marketData.price ?? marketData.regularMarketPrice ?? null,
                yield_pct: marketData.yieldpct ?? marketData.yieldPct ?? marketData.dividendYield ?? 0,
                price_to_book: marketData.priceToBook ?? marketData.price_to_book ?? null,
                change_percent: marketData.changePercent ?? marketData.regularMarketChangePercent ?? null,
                paid_months: marketData.paidMonths ?? marketData.paid_months ?? [],
                updated_at: timestamp
            };
        });

        if (rows.length !== 10) {
            throw new Error(`O cache de recomendações deve conter 10 ativos; recebeu ${rows.length}.`);
        }

        const { error } = await supabase
            .from('recommended_cache')
            .upsert(rows, { onConflict: 'ticker' });
        if (error) throw error;
    },

    calculatePortfolioSummary(assets = []) {
        const summary = assets.reduce((totals, asset) => {
            const quantity = Number(asset.quantity) || 0;
            const averagePrice = Number(asset.averagePrice) || 0;
            const currentPrice = Number(asset.currentPrice) || 0;
            const yieldPct = Number(asset.yieldPct) || 0;
            const dailyChange = Number(asset.dailyChange) || 0;
            const currentValue = currentPrice * quantity;
            const investedValue = averagePrice * quantity;

            totals.currentValue += currentValue;
            totals.investedValue += investedValue;
            totals.annualDividends += currentValue * (yieldPct / 100);
            totals.dailyChangeValue += currentValue * (dailyChange / 100);
            return totals;
        }, {
            currentValue: 0,
            investedValue: 0,
            annualDividends: 0,
            dailyChangeValue: 0
        });

        summary.profit = summary.currentValue - summary.investedValue;
        summary.profitPct = summary.investedValue > 0
            ? (summary.profit / summary.investedValue) * 100
            : 0;
        summary.dailyChangePct = summary.currentValue > 0
            ? (summary.dailyChangeValue / summary.currentValue) * 100
            : 0;
        summary.monthlyYieldPct = summary.currentValue > 0
            ? (summary.annualDividends / 12 / summary.currentValue) * 100
            : 0;

        return summary;
    },

    // Salva o cache de todos os ativos no banco de dados em background (agora salvando os paidMonths também)
    async saveCacheBackground(assets) {
        try {
            const updates = assets.map(asset =>
                supabase.from('assets').update({
                    cached_price: asset.currentPrice,
                    cached_change: asset.dailyChange,
                    cached_yield: asset.yieldPct,
                    cached_pvp: asset.pvp,
                    cached_paid_months: asset.paidMonths
                }).eq('id', asset.id)
            );
            const results = await Promise.all(updates);
            results.forEach(({ error }) => {
                if (error) console.warn("Erro ao salvar cache de ativo:", error);
            });
        } catch (error) {
            console.warn("Erro silencioso ao salvar cache no background:", error);
        }
    },

    async getTickerSuggestions(query) {
        if (!query || query.length < 2) return [];
        try {
            const headers = await this._getAuthHeaders();
            
            const { data, error } = await supabase.functions.invoke('market-data', {
                body: { search: query, endpoint: 'list' },
                headers: headers
            });

            if (error) throw error;
            return data.stocks ? data.stocks.map(s => s.stock) : [];
        } catch (error) {
            console.error('Erro ao buscar sugestões:', error);
            return [];
        }
    },

    async getMarketPrices(tickers) {
        if (!tickers || (Array.isArray(tickers) && tickers.length === 0)) return { results: {} };
        
        try {
            let tickerString = '';
            
            if (Array.isArray(tickers)) {
                tickerString = tickers.join(','); 
            } else if (typeof tickers === 'object' && tickers.ticker) {
                tickerString = String(tickers.ticker);
            } else {
                tickerString = String(tickers);
            }

            const cleanTicker = tickerString.toUpperCase().replace(/\s/g, '');

            const response = await fetch(`/api/market-data?tickers=${cleanTicker}`);

            if (!response.ok) {
                console.warn(`Aviso: Falha ao buscar dados em lote na API Python para: ${cleanTicker}`);
                return { results: {} }; 
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro na chamada da API Python:', error);
            return { results: {} };
        }
    },

    async validateTicker(ticker) {
        if (!ticker) return false;
        try {
            const data = await this.getPrice(ticker);
            return data && data.price > 0;
        } catch (error) {
            return false;
        }
    },

    async getPrice(ticker) {
        try {
            const searchTicker = ticker.toUpperCase().includes('.SA') ? ticker.toUpperCase() : `${ticker.toUpperCase()}.SA`;
            const data = await this.getMarketPrices(searchTicker);
            
            const normalizedTicker = searchTicker;
            const rawTicker = ticker.toUpperCase().replace(/\.SA$/, '');
            
            const apiResults = data.results || {};
            let res;

            if (Array.isArray(apiResults)) {
                res = apiResults.find(i => i.symbol === normalizedTicker || i.symbol === rawTicker) || {};
            } else {
                res = apiResults[normalizedTicker] || apiResults[rawTicker] || {};
            }
            
            return {
                price: Number(res?.price || res?.regularMarketPrice || 0),
                changePercent: Number(res?.changePercent || res?.regularMarketChangePercent || 0),
                yieldPct: Number(res?.yieldpct || res?.yieldPct || res?.dividendYield || res?.yield || 0),
                pvp: Number(res?.priceToBook || res?.price_to_book || res?.pvp || 0) || null
            };
        } catch (error) {
            return { price: 0, changePercent: 0, yieldPct: 0, pvp: null };
        }
    },

    async addAsset(asset) {
        const { error } = await supabase
            .from('assets')
            .insert([{
                ticker: asset.ticker.toUpperCase(),
                quantity: asset.quantity,
                average_price: asset.averagePrice,
                vpa: asset.vpa || null
            }]);
        if (error) throw error;
    },

    async addDiscoveredTicker(ticker) {
        const normalizedTicker = ticker.toUpperCase().replace(/\.SA$/i, '');
        if (TICKER_DATA[normalizedTicker]) return;

        const { error } = await supabase
            .from('tickers_descobertos')
            .insert([{ ticker: normalizedTicker }]);

        if (error && error.code !== '23505') throw error;
    },

    async deleteAsset(id) {
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (error) throw error;
    },

    async updateAsset(id, data) {
        const { error } = await supabase
            .from('assets')
            .update({
                quantity: data.quantity,
                average_price: data.averagePrice,
                vpa: data.vpa !== undefined ? data.vpa : null
            })
            .eq('id', id);
        if (error) throw error;
    }
};