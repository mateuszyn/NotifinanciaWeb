import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AssetService } from '../services/asset-service.js';

export default function PortfolioSummary({ assets, isAuthenticated: isAuthenticatedProp }) {
    const auth = useAuth();
    const [hoveredTicker, setHoveredTicker] = React.useState(null);
    const longPressTimerRef = React.useRef(null);
    const isLongPressRef = React.useRef(false);

    if (!assets || assets.length === 0) return null;

    const isAuthenticated = isAuthenticatedProp ?? auth.isAuthenticated;
    const summary = AssetService.calculatePortfolioSummary(assets);
    
    const formatCurrency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const profitClass = summary.profit >= 0 ? 'positive' : 'negative';
    const textProfitClass = summary.profit >= 0 ? 'text-profit-pos' : 'text-profit-neg';
    
    let borderClass = 'border-neutral-portfolio';
    if (summary.profit > 0) borderClass = summary.dailyChangePct >= 0 ? 'border-profit-viva-pos' : 'border-profit-dia-neg';
    else if (summary.profit < 0) borderClass = summary.dailyChangePct >= 0 ? 'border-loss-dia-pos' : 'border-loss-viva-neg';

    const annualYieldPct = summary.currentValue > 0
        ? (summary.annualDividends / summary.currentValue) * 100
        : 0;

    const scrollToAsset = (ticker) => {
        const cleanTicker = ticker.replace(/[^a-zA-Z0-9]/g, '');
        const targetEl = document.getElementById(`asset-card-${cleanTicker}`);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Adiciona um leve feedback visual de destaque no card
            targetEl.classList.add('highlight-target');
            setTimeout(() => targetEl.classList.remove('highlight-target'), 1200);
        }
    };

    const handleTouchStart = (ticker) => {
        isLongPressRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            setHoveredTicker(ticker);
            if (navigator.vibrate) {
                try { navigator.vibrate(40); } catch (_) {}
            }
        }, 400); // 400ms para caracterizar o "segurar"
    };

    const handleTouchEnd = (ticker) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (!isLongPressRef.current) {
            // Toque rápido -> leva ao ativo na carteira
            setHoveredTicker(null);
            scrollToAsset(ticker);
        } else {
            // Se segurou, fecha o popover após breve leitura (1.8s) ou no próximo toque fora
            setTimeout(() => setHoveredTicker(null), 1800);
        }
    };

    const handleTouchMove = () => {
        // Se o usuário arrastou/fez scroll na tela, cancela o timer de segurar
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleShowDyInfo = period => {
        const tickers = assets
            .map(asset => String(asset.ticker || '').replace(/\.SA$/i, '').toUpperCase())
            .filter(Boolean);
        const query = `${tickers.join(' OR ')} dividendos proventos status invest`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

        window.Swal.fire({
            title: `Sobre o DY ${period}`,
            html: `
                <div class="text-start">
                    <p>O Dividend Yield considera os proventos dos últimos 12 meses em relação à cotação atual. Neste resumo, o valor é consolidado e ponderado pelos ativos da carteira.</p>
                    <p class="mb-3">Os dados oficiais de proventos da B3 são consultados via Yahoo Finance; o indicador é histórico e não garante rendimentos futuros.</p>
                    <a class="btn btn-outline-success btn-sm" href="${searchUrl}" target="_blank" rel="noopener noreferrer">
                        <i class="bi bi-google me-1"></i> Pesquisar histórico dos ativos no Google
                    </a>
                </div>
            `,
            confirmButtonText: 'Fechar',
            confirmButtonColor: '#198754',
            background: '#212529',
            color: '#ffffff',
            width: 'min(92vw, 560px)',
            customClass: { popup: 'border border-secondary shadow-lg rounded-4' }
        });
    };

    return (
        <section className={`portfolio-summary ${borderClass} mb-4`} aria-label="Resumo consolidado da carteira">
            <div className="portfolio-summary-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                    <span className="summary-eyebrow">Visão consolidada</span>
                    <h2 className="summary-title">Painel da Carteira</h2>
                </div>
                
                <div className="ticker-squares-grid">
                    {assets.map(asset => {
                        const pmVal = asset.variacaoPm || asset.variacaoPM || 0;
                        const dailyVal = asset.dailyChange || 0;
                        const pmClass = pmVal >= 0 ? 'text-profit-pos' : 'text-profit-neg';
                        const dailyClass = dailyVal >= 0 ? 'text-profit-pos' : 'text-profit-neg';
                        const squareBorderClass = pmVal >= 0 ? 'border-success' : 'border-danger';
                        const isVisible = hoveredTicker === asset.ticker;

                        return (
                            <div 
                                key={asset.id || asset.ticker} 
                                className="ticker-square-wrapper"
                                onMouseEnter={() => setHoveredTicker(asset.ticker)}
                                onMouseLeave={() => setHoveredTicker(null)}
                            >
                                <button
                                    type="button"
                                    className={`ticker-square ${squareBorderClass}`} 
                                    title={`${asset.ticker} - Toque para ir ao card, segure para ver variação`}
                                    onClick={() => scrollToAsset(asset.ticker)}
                                    onTouchStart={() => handleTouchStart(asset.ticker)}
                                    onTouchEnd={() => handleTouchEnd(asset.ticker)}
                                    onTouchMove={handleTouchMove}
                                >
                                    <span className="ticker-symbol">{asset.ticker.replace(/\.SA$/i, '')}</span>
                                </button>
                                {isVisible && (
                                    <div className="ticker-popover text-start" role="tooltip">
                                        <div className="ticker-popover-title"><strong>{asset.ticker}</strong></div>
                                        <div className="ticker-popover-row">
                                            <span>P.M.:</span> <strong className={pmClass}>{pmVal >= 0 ? '+' : ''}{pmVal.toFixed(2)}%</strong>
                                        </div>
                                        <div className="ticker-popover-row">
                                            <span>Hoje:</span> <strong className={dailyClass}>{dailyVal >= 0 ? '+' : ''}{dailyVal.toFixed(2)}%</strong>
                                        </div>
                                        <div className="ticker-popover-row">
                                            <span>DY:</span> <strong className="text-success">{asset.yieldPct > 0 ? `${Number(asset.yieldPct).toFixed(2)}%` : '—'}</strong>
                                        </div>
                                        <div className="ticker-popover-row">
                                            <span>P/VP:</span> <strong>{asset.pvp ? Number(asset.pvp).toFixed(2) : '—'}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="portfolio-summary-grid mt-3">
                <div className="summary-metric summary-metric-highlight">
                    <span>Patrimônio atual</span>
                    <strong>{formatCurrency(summary.currentValue)}</strong>
                    <small>Investido: {formatCurrency(summary.investedValue)}</small>
                </div>
                <div className="summary-metric">
                    <span>Variação global</span>
                    {isAuthenticated ? (
                        <>
                            <strong className={textProfitClass}>{formatCurrency(summary.profit)}</strong>
                            <small className={textProfitClass}>{(summary.profitPct || 0) >= 0 ? '+' : ''}{(summary.profitPct || 0).toFixed(2)}%</small>
                        </>
                    ) : (
                        <button type="button" className="btn btn-outline-success btn-sm mt-2" onClick={auth.signInWithGoogle}>
                            <i className="bi bi-google me-1" aria-hidden="true"></i>Entrar com Google
                        </button>
                    )}
                </div>
                <div className="summary-metric position-relative">
                    <span>DY aprox. anual</span>
                    <strong>{formatCurrency(summary.annualDividends)}</strong>
                    <small>{annualYieldPct.toFixed(2)}% ao ano</small>
                    <button
                        type="button"
                        className="dy-info-btn"
                        aria-label="Informações sobre o cálculo do DY anual"
                        onClick={() => handleShowDyInfo('anual')}
                    >
                            <i className="bi bi-info-circle-fill"></i>
                    </button>
                </div>
                <div className="summary-metric position-relative">
                    <span>DY aprox. mensal</span>
                    <strong>{formatCurrency((summary.annualDividends || 0) / 12)}</strong>
                    <small>{(summary.monthlyYieldPct || 0).toFixed(2)}% ao mês</small>
                    <button
                        type="button"
                        className="dy-info-btn"
                        aria-label="Informações sobre o cálculo do DY mensal"
                        onClick={() => handleShowDyInfo('mensal')}
                    >
                            <i className="bi bi-info-circle-fill"></i>
                    </button>
                </div>
            </div>
        </section>
    );
}
