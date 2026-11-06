import React, { useRef, useState } from 'react';
import { TICKER_DATA } from '../utils/ticker-data.js';

function cleanTicker(ticker) {
    return String(ticker || '').replace(/\.SA$/i, '').toUpperCase();
}

function getValue(asset, ...keys) {
    for (const source of [asset.marketData, asset]) {
        for (const key of keys) {
            const rawValue = source?.[key];
            if (rawValue === null || rawValue === undefined || rawValue === '') continue;
            const value = Number(rawValue);
            if (Number.isFinite(value)) return value;
        }
    }
    return 0;
}

function getPvpClass(value) {
    if (value <= 0) return 'text-secondary';
    if (value < 1) return 'text-success';
    if (value <= 1.05) return 'text-info';
    return 'text-warning';
}

export default function RadarSummary({ recommendedAssets = [], onAssetClick }) {
    const [visibleTicker, setVisibleTicker] = useState(null);
    const longPressTimerRef = useRef(null);
    const isLongPressRef = useRef(false);

    const isFii = asset => (
        asset.type === 'FII' || TICKER_DATA[cleanTicker(asset.ticker)]?.type === 'FII'
    );
    const acoes = recommendedAssets.filter(asset => !isFii(asset));
    const fiis = recommendedAssets.filter(isFii);

    const scrollToAsset = (ticker, attemptsRemaining = 6) => {
        const element = document.getElementById(`asset-card-${cleanTicker(ticker)}`);
        if (!element) {
            if (attemptsRemaining <= 0) return;
            onAssetClick?.(ticker);
            window.setTimeout(() => scrollToAsset(ticker, attemptsRemaining - 1), 80);
            return;
        }

        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('highlight-target');
        window.setTimeout(() => element.classList.remove('highlight-target'), 1200);
    };

    const handleTouchStart = ticker => {
        isLongPressRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
            isLongPressRef.current = true;
            setVisibleTicker(ticker);
            try {
                navigator.vibrate?.(40);
            } catch (error) {
                console.debug('Feedback tátil indisponível.', error);
            }
        }, 400);
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (isLongPressRef.current) {
            window.setTimeout(() => setVisibleTicker(null), 2200);
        }
    };

    const handleTouchMove = () => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const renderTickerGroup = (assets, label, kind) => (
        <div className="radar-ticker-group">
            <span className={`radar-ticker-group-label text-${kind}`}>{label}</span>
            <div className="ticker-squares-grid radar-ticker-grid">
                {assets.map(asset => {
                    const ticker = cleanTicker(asset.ticker);
                    const name = asset.name ?? TICKER_DATA[ticker]?.name ?? ticker;
                    const dailyChange = getValue(asset, 'changePercent', 'regularMarketChangePercent', 'dailyChange');
                    const yieldPct = getValue(asset, 'yieldpct', 'yieldPct', 'dividendYield', 'yield');
                    const pvp = getValue(asset, 'priceToBook', 'price_to_book', 'pvp');
                    const squareBorder = kind === 'success'
                        ? (dailyChange >= 0 ? 'border-success' : 'border-danger')
                        : (dailyChange >= 0 ? 'border-success' : 'border-info');
                    const isVisible = visibleTicker === asset.ticker;

                    return (
                        <div
                            key={asset.ticker}
                            className="ticker-square-wrapper"
                            onMouseEnter={() => setVisibleTicker(asset.ticker)}
                            onMouseLeave={() => setVisibleTicker(null)}
                        >
                            <button
                                type="button"
                                className={`ticker-square ${squareBorder}`}
                                title={`${ticker} - Clique para localizar o card`}
                                onClick={() => {
                                    if (isLongPressRef.current) {
                                        isLongPressRef.current = false;
                                        return;
                                    }
                                    scrollToAsset(asset.ticker);
                                }}
                                onTouchStart={() => handleTouchStart(asset.ticker)}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchEnd}
                                onTouchMove={handleTouchMove}
                            >
                                <span className="ticker-symbol">{ticker}</span>
                            </button>
                            {isVisible && (
                                <div className="ticker-popover radar-ticker-popover text-start" role="tooltip">
                                    <div className="ticker-popover-title">
                                        <strong>{ticker}</strong>
                                        <small className="d-block text-secondary">{name}</small>
                                    </div>
                                    <div className="ticker-popover-row">
                                        <span>Hoje:</span>
                                        <strong className={dailyChange >= 0 ? 'text-success' : 'text-danger'}>
                                            {dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)}%
                                        </strong>
                                    </div>
                                    <div className="ticker-popover-row">
                                        <span>DY:</span>
                                        <strong className="text-success">{yieldPct > 0 ? `${yieldPct.toFixed(2)}%` : '—'}</strong>
                                    </div>
                                    <div className="ticker-popover-row">
                                        <span>P/VP:</span>
                                        <strong className={getPvpClass(pvp)}>{pvp > 0 ? pvp.toFixed(2) : '—'}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <section className="portfolio-summary radar-summary mb-4" aria-label="Resumo das oportunidades recomendadas">
            <div className="radar-summary-header">
                <div>
                    <span className="summary-eyebrow">Visão consolidada</span>
                    <h2 className="summary-title">Inteligência do Radar B3</h2>
                </div>
                <div className="radar-ticker-groups">
                    {renderTickerGroup(acoes, 'Ações', 'success')}
                    {renderTickerGroup(fiis, 'FIIs', 'info')}
                </div>
            </div>
        </section>
    );
}
