import React from 'react';

export default function PortfolioTabs({
    activeTab,
    onTabChange,
    portfolioCount,
    recommendedCount
}) {
    return (
        <div className="portfolio-tabs-container">
            <div className="portfolio-tabs" role="tablist" aria-label="Visualização da carteira">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'portfolio'}
                    className={`portfolio-tab${activeTab === 'portfolio' ? ' active' : ''}`}
                    onClick={() => onTabChange('portfolio')}
                >
                    <i className="bi bi-wallet2 me-2"></i>
                    Minha Carteira
                    <span className="badge bg-secondary ms-1">{portfolioCount}</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'recommended'}
                    className={`portfolio-tab${activeTab === 'recommended' ? ' active' : ''}`}
                    onClick={() => onTabChange('recommended')}
                >
                    <i className="bi bi-stars me-2 text-warning"></i>
                    Oportunidades &amp; Radar
                    <span className="badge bg-success ms-1">{recommendedCount}</span>
                </button>
            </div>
        </div>
    );
}
