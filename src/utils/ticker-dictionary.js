import { TICKER_DATA } from './ticker-data.js';

const normalize = value => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

export const TickerDictionary = {
    get list() {
        return Object.keys(TICKER_DATA);
    },

    search(query, { type = 'ALL', limit = 8 } = {}) {
        if (!query || query.trim().length < 2) return [];

        const normalizedQuery = normalize(query);

        return Object.entries(TICKER_DATA)
            .filter(([ticker, data]) => {
                const matchesQuery = [
                    ticker,
                    data.name,
                    data.segment
                ].some(value => normalize(value).includes(normalizedQuery));
                const matchesType = type === 'ALL' || data.type === type;

                return matchesQuery && matchesType;
            })
            .slice(0, limit)
            .map(([ticker, data]) => ({ ticker, ...data }));
    }
};
