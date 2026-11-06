import React, { useState } from 'react';
import AssetCard from './AssetCard.jsx';
import QuickAddModal from './QuickAddModal.jsx';
import RadarSummary from './RadarSummary.jsx';
import { TICKER_DATA } from '../utils/ticker-data.js';

function toCardAsset(recommendation) {
    const data = recommendation.marketData ?? {};
    const currentPrice = Number(data.price ?? data.regularMarketPrice) || 0;
    const yieldPct = Number(data.yieldpct ?? data.yieldPct ?? data.dividendYield ?? data.yield) || 0;

    return {
        ...recommendation,
        ticker: recommendation.ticker,
        quantity: 0,
        averagePrice: 0,
        currentPrice,
        dailyChange: Number(data.changePercent ?? data.regularMarketChangePercent) || 0,
        yieldPct,
        divAnual: currentPrice * (yieldPct / 100),
        divMensal: currentPrice * (yieldPct / 100) / 12,
        pvp: data.priceToBook ?? data.price_to_book ?? null,
        paidMonths: data.paidMonths ?? data.paid_months ?? []
    };
}

export default function RecommendedView({
    onAddAsset,
    assetColumns,
    recommendedAssets,
    loading,
    error,
    refresh,
    toolbar
}) {
    const [assetToAdd, setAssetToAdd] = useState(null);
    const [isAcoesOpen, setIsAcoesOpen] = useState(true);
    const [isFiisOpen, setIsFiisOpen] = useState(true);

    const handleAdd = (_ticker, asset) => setAssetToAdd(asset);

    const recommendedCards = recommendedAssets.map(toCardAsset);
    const getCleanTicker = asset => asset.ticker.replace(/\.SA$/i, '').toUpperCase();
    const isFii = asset => (
        asset.type === 'FII' || TICKER_DATA[getCleanTicker(asset)]?.type === 'FII'
    );
    const acoes = recommendedCards.filter(asset => (
        asset.type === 'Ação'
        || TICKER_DATA[getCleanTicker(asset)]?.type === 'Ação'
        || !isFii(asset)
    ));
    const fiis = recommendedCards.filter(asset => (
        asset.type === 'FII' || TICKER_DATA[getCleanTicker(asset)]?.type === 'FII'
    ));
    const openAssetSection = ticker => {
        const cleanTicker = String(ticker).replace(/\.SA$/i, '').toUpperCase();
        const asset = recommendedAssets.find(item => getCleanTicker(item) === cleanTicker);
        const isAssetFii = asset && (
            asset.type === 'FII' || TICKER_DATA[getCleanTicker(asset)]?.type === 'FII'
        );
        if (isAssetFii) setIsFiisOpen(true);
        else setIsAcoesOpen(true);
    };

    return (
        <section className="recommended-view" aria-label="Oportunidades e radar da B3">
            <RadarSummary recommendedAssets={recommendedAssets} onAssetClick={openAssetSection} />
            {toolbar}

            {error && (
                <div className="alert alert-warning d-flex justify-content-between align-items-center gap-3" role="alert">
                    <span>Não foi possível carregar as oportunidades: {error.message}</span>
                    <button type="button" className="btn btn-sm btn-outline-warning flex-shrink-0" onClick={refresh}>
                        Tentar novamente
                    </button>
                </div>
            )}

            <section aria-labelledby="recommended-stocks-title">
                <div
                    className="d-flex align-items-center justify-content-between mb-3 mt-4 cursor-pointer"
                    onClick={() => setIsAcoesOpen(previous => !previous)}
                >
                    <h3 id="recommended-stocks-title" className="h6 text-uppercase fw-bold text-success m-0">
                        <i className="bi bi-briefcase-fill me-2"></i>Ações Recomendadas (Top 5)
                    </h3>
                    <button
                        type="button"
                        className="btn btn-sm btn-link text-success text-decoration-none p-0"
                        aria-expanded={isAcoesOpen}
                        aria-controls="recommended-stocks-grid"
                        onClick={event => {
                            event.stopPropagation();
                            setIsAcoesOpen(previous => !previous);
                        }}
                    >
                        <i className={`bi bi-chevron-${isAcoesOpen ? 'up' : 'down'} fs-5`}></i>
                    </button>
                </div>
                {isAcoesOpen && (
                    <div
                        id="recommended-stocks-grid"
                        className="asset-cards-grid"
                        style={{ '--asset-columns': assetColumns }}
                        aria-busy={loading}
                    >
                        {acoes.map(asset => (
                            <AssetCard
                                key={asset.ticker}
                                mode="radar"
                                asset={asset}
                                onAddRecommended={handleAdd}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section aria-labelledby="recommended-fiis-title">
                <div
                    className="d-flex align-items-center justify-content-between mb-3 mt-4 cursor-pointer"
                    onClick={() => setIsFiisOpen(previous => !previous)}
                >
                    <h3 id="recommended-fiis-title" className="h6 text-uppercase fw-bold text-info m-0">
                        <i className="bi bi-building me-2"></i>Fundos Imobiliários (Top 5)
                    </h3>
                    <button
                        type="button"
                        className="btn btn-sm btn-link text-info text-decoration-none p-0"
                        aria-expanded={isFiisOpen}
                        aria-controls="recommended-fiis-grid"
                        onClick={event => {
                            event.stopPropagation();
                            setIsFiisOpen(previous => !previous);
                        }}
                    >
                        <i className={`bi bi-chevron-${isFiisOpen ? 'up' : 'down'} fs-5`}></i>
                    </button>
                </div>
                {isFiisOpen && (
                    <div
                        id="recommended-fiis-grid"
                        className="asset-cards-grid"
                        style={{ '--asset-columns': assetColumns }}
                        aria-busy={loading}
                    >
                        {fiis.map(asset => (
                            <AssetCard
                                key={asset.ticker}
                                mode="radar"
                                asset={asset}
                                onAddRecommended={handleAdd}
                            />
                        ))}
                    </div>
                )}
            </section>

            {loading && recommendedAssets.length === 0 && (
                <p className="text-secondary text-center py-4" role="status">
                    Carregando oportunidades da B3...
                </p>
            )}
            {!loading && !error && recommendedAssets.length === 0 && (
                <p className="text-secondary text-center py-4">
                    Nenhuma oportunidade disponível no momento.
                </p>
            )}

            <QuickAddModal
                asset={assetToAdd}
                onClose={() => setAssetToAdd(null)}
                onSave={onAddAsset}
            />
        </section>
    );
}
