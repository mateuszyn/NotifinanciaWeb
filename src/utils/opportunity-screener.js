import { TICKER_DATA } from './ticker-data.js';
import { ELIGIBLE_UNIVERSE } from './eligible-universe.js';

const STOCK_SECTORS = Object.freeze({
    BBAS3: 'Bancos',
    SANB11: 'Bancos',
    ITUB4: 'Bancos',
    BBDC4: 'Bancos',
    TAEE11: 'Energia elétrica',
    CPLE6: 'Energia elétrica',
    EGIE3: 'Energia elétrica',
    TRPL4: 'Energia elétrica',
    CMIG4: 'Energia elétrica',
    SBSP3: 'Saneamento',
    CSMG3: 'Saneamento',
    SAPR11: 'Saneamento',
    BBSE3: 'Seguros',
    CXSE3: 'Seguros',
    PSSA3: 'Seguros',
    VIVT3: 'Telecomunicações',
    TIMS3: 'Telecomunicações',
    KLBN4: 'Papel e celulose',
    VALE3: 'Mineração'
});

const FII_STRATEGIES = Object.freeze({
    HGLG11: 'Logística',
    BTLG11: 'Logística',
    XPLG11: 'Logística',
    XPML11: 'Shopping centers',
    VISC11: 'Shopping centers',
    HGRU11: 'Renda urbana',
    TRXF11: 'Renda urbana',
    KNCR11: 'CRI pós-fixado',
    KNIP11: 'CRI inflação',
    CPTS11: 'Recebíveis híbridos',
    MXRF11: 'Recebíveis híbridos',
    KNSC11: 'Recebíveis híbridos',
    RBRR11: 'CRI high grade',
    VGIR11: 'CRI pós-fixado'
});

function finiteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function scoreAsset(data) {
    const yieldPct = finiteNumber(data?.yieldpct ?? data?.yieldPct ?? data?.dividendYield ?? data?.yield);
    const priceToBook = finiteNumber(data?.priceToBook ?? data?.price_to_book ?? data?.pvp);
    const changePercent = finiteNumber(data?.changePercent ?? data?.regularMarketChangePercent ?? data?.dailyChange);
    const paidMonths = Array.isArray(data?.paidMonths)
        ? new Set(data.paidMonths).size
        : Array.isArray(data?.paid_months)
            ? new Set(data.paid_months).size
            : 0;

    let score = 0;

    if (yieldPct !== null) {
        if (yieldPct >= 7 && yieldPct <= 15) {
            score += 20 + 20 * (1 - Math.abs(yieldPct - 11) / 4);
        } else if (yieldPct > 15) {
            score -= Math.min(20, (yieldPct - 15) * 2);
        }
    }

    if (priceToBook !== null && priceToBook > 0) {
        if (priceToBook >= 0.7 && priceToBook <= 0.98) {
            score += 15 + 10 * (1 - Math.abs(priceToBook - 0.84) / 0.14);
        } else if (priceToBook > 1) {
            score -= Math.min(25, (priceToBook - 1) * 25);
        }
    }

    if (changePercent !== null && changePercent >= -3.5 && changePercent <= -1) {
        score += 10 + 10 * (1 - Math.abs(changePercent + 2.25) / 1.25);
    }

    score += Math.min(paidMonths, 12) / 12 * 15;
    return Math.round(score * 100) / 100;
}

function marketDataForTicker(marketDataMap, ticker) {
    const results = marketDataMap?.results ?? marketDataMap;
    return results?.[ticker] ?? results?.[`${ticker}.SA`] ?? {};
}

export function rankRecommendedAssets(marketDataMap) {
    const candidates = ELIGIBLE_UNIVERSE.map((ticker, index) => {
        const info = TICKER_DATA[ticker];
        const type = info?.type ?? (ticker.endsWith('11') ? 'FII' : 'Ação');
        const marketData = marketDataForTicker(marketDataMap, ticker);
        const sector = type === 'FII' ? FII_STRATEGIES[ticker] : STOCK_SECTORS[ticker];

        return {
            ticker,
            name: info?.name ?? ticker,
            type,
            sector: sector ?? info?.segment ?? 'Outros',
            strategy: type === 'FII' ? sector ?? info?.segment ?? 'Outros' : undefined,
            score: scoreAsset(marketData),
            marketData,
            index
        };
    });

    const selectDiversified = (type, limit) => {
        const selected = [];
        const usedSectors = new Set();
        const ordered = candidates
            .filter(asset => asset.type === type)
            .sort((a, b) => b.score - a.score || a.index - b.index);

        for (const asset of ordered) {
            if (usedSectors.has(asset.sector)) continue;
            selected.push(asset);
            usedSectors.add(asset.sector);
            if (selected.length === limit) break;
        }

        return selected;
    };

    return [
        ...selectDiversified('Ação', 5),
        ...selectDiversified('FII', 5)
    ].map(({ index, ...asset }) => asset);
}
