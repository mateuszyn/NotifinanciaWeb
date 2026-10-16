import React from 'react';
import { BROKERS } from '../utils/brokers.js';

export default function AssetCard({ asset, broker, isGuest, onEdit, onDelete, onRetry }) {
    const [isDyInfoOpen, setIsDyInfoOpen] = React.useState(false);
    const profitPct = asset.variacaoPm || 0;
    const dailyChange = asset.dailyChange || 0;
    const profitTextClass = profitPct >= 0 ? 'text-profit-pos' : 'text-profit-neg';
    const dailyTextClass = dailyChange >= 0 ? 'text-profit-pos' : 'text-profit-neg';
    
    let borderClass = 'border-neutral-portfolio';
    if (profitPct > 0) borderClass = dailyChange >= 0 ? 'border-profit-viva-pos' : 'border-profit-dia-neg';
    else if (profitPct < 0) borderClass = dailyChange >= 0 ? 'border-loss-dia-pos' : 'border-loss-viva-neg';
    
    const ticker = asset.ticker;
    const brokerName = broker || 'Nubank';
    const brokerInfo = BROKERS[brokerName] || BROKERS.Nubank;
    
    const yieldPct = asset.yieldPct || 0;
    const divMensal = asset.divMensal || 0;
    const divAnual = asset.divAnual || 0;
    const currentPrice = Number(asset.currentPrice) || 0;
    const quantity = Number(asset.quantity) || 0;
    const paidMonths = asset.paidMonths || asset.paid_months || [];

    // Cálculo da Bola de Neve (Magic Number: quantas cotas pagam 1 nova cota/mês)
    const rendaMensalPorCota = currentPrice > 0 && yieldPct > 0 ? (currentPrice * (yieldPct / 100)) / 12 : 0;
    const cotasParaBolaDeNeve = rendaMensalPorCota > 0 && currentPrice > 0 ? Math.ceil(currentPrice / rendaMensalPorCota) : 0;
    const cotasFaltantes = Math.max(0, cotasParaBolaDeNeve - quantity);
    const cotasCompradasPorMes = divMensal > 0 && currentPrice > 0 ? Number((divMensal / currentPrice).toFixed(2)) : 0;
    const cotasCompradasPorAno = divAnual > 0 && currentPrice > 0 ? Number((divAnual / currentPrice).toFixed(1)) : 0;
    const isSnowballAchieved = cotasParaBolaDeNeve > 0 && quantity >= cotasParaBolaDeNeve;
    const snowballMessage = isSnowballAchieved 
        ? `[v] Bola de Neve! (${cotasParaBolaDeNeve} Cotas)` 
        : `[+] ${cotasFaltantes} cotas para a Bola de Neve (${cotasParaBolaDeNeve} cotas)`;
    const snowballColor = isSnowballAchieved ? '#8fe3a7' : '#ff8a8a';

    // Construção dos 12 meses rolantes
    const monthNamesFull = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthNamesShort = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const rollingMonths = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const mIdx = d.getMonth() + 1;
        const yr = d.getFullYear();
        rollingMonths.push({
            monthIndex: mIdx,
            year: yr,
            short: monthNamesShort[mIdx - 1],
            full: monthNamesFull[mIdx - 1]
        });
    }

    const cardId = `asset-card-${ticker.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <div id={cardId} className="asset-card-wrapper">
            <div className={`asset-card ${borderClass}`}>
                <div className="d-flex justify-content-between align-items-center mb-3 asset-card-header">
                    <h4 className="m-0 fw-bold">{ticker}</h4>
                    <div className="d-flex gap-3 align-items-center asset-card-actions">
                        {isGuest ? (
                            <span className="badge bg-secondary">Dados de Exemplo</span>
                        ) : (
                            <span className="d-flex align-items-center gap-2">
                                <button className="btn btn-link p-0 btn-edit edit-btn-wrapper" onClick={() => onEdit(asset)} aria-label="Editar / Aporte">
                                    <span className="edit-icon"><i className="bi bi-pencil text-primary"></i></span>
                                </button>
                                <button className="btn btn-link p-0 text-danger btn-delete" onClick={() => onDelete(asset)}>
                                    <i className="bi bi-trash3 text-danger trash-icon"></i>
                                </button>
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="row mb-3">
                    <div className="col-12">
                        <p className="price-value mb-0">Total: R$ {(quantity * currentPrice).toFixed(2)}</p>
                        <p className="small text-secondary fw-bold mb-1">QTD: {quantity}</p>
                        {cotasParaBolaDeNeve > 0 && (
                            <p className="small mb-0" style={{ fontSize: '0.72rem', color: snowballColor }}>
                                {snowballMessage}
                            </p>
                        )}
                    </div>
                </div>

                <div className="row border-top border-bottom border-secondary py-2 mb-3">
                    <div className="col-6 border-end border-secondary">
                        <p className="price-label">P. Médio</p>
                        <p className="price-value">R$ {(asset.averagePrice || 0).toFixed(2)} <span className={`${profitTextClass} small`}>({profitPct.toFixed(2)}%)</span></p>
                    </div>
                    <div className="col-6 ps-3">
                        <p className="price-label">Preço Atual</p>
                        <p className="price-value">R$ {currentPrice.toFixed(2)} <span className={`${dailyTextClass} small`}>({dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)}%)</span></p>
                    </div>
                </div>

                <div className="bg-dark rounded p-2 text-center border border-secondary mb-3 mx-0 dividend-box-container position-relative">
                    <details
                        className="asset-dividends-details"
                        onToggle={(event) => {
                            const isOpen = event.currentTarget.open;
                            document.querySelectorAll('.asset-dividends-details').forEach((details) => {
                                if (details.open !== isOpen) {
                                    details.open = isOpen;
                                }
                            });
                        }}
                    >
                        <summary>
                            {yieldPct > 0 ? (
                                <span className="asset-card-dy-info">
                                    <button
                                        type="button"
                                        className="dy-info-btn"
                                        aria-label="Informações sobre o cálculo do DY"
                                        aria-expanded={isDyInfoOpen}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setIsDyInfoOpen((open) => !open);
                                        }}
                                    >
                                        <i className="bi bi-info-circle-fill" aria-hidden="true"></i>
                                    </button>
                                    {isDyInfoOpen && (
                                        <span className="dy-info-popover text-start" role="tooltip">
                                            O Dividend Yield (DY) é baseado nos proventos pagos nos últimos 12 meses, obtidos via Yahoo Finance. Trata-se de uma base estimada e indicativa, <strong>não constituindo garantia</strong> de rendimentos futuros.
                                        </span>
                                    )}
                                </span>
                            ) : <span aria-hidden="true" />}
                            <span className={`badge ${yieldPct > 0 ? 'bg-success' : 'bg-warning'} m-0`}>
                                {yieldPct > 0 ? `Yield Anual: ${yieldPct.toFixed(2)}%` : 'Sem dados de Dividendos'}
                            </span>
                            <i className="bi bi-chevron-down" aria-hidden="true"></i>
                        </summary>
                        <div className="asset-dividends-content">
                            {asset.dataError ? (
                                <div className="text-center p-2">
                                    <p className="small text-warning mb-2">Não foi possível carregar os dados.</p>
                                    <button className="btn btn-sm btn-outline-warning" onClick={() => onRetry && onRetry(ticker)}>
                                        <i className="bi bi-arrow-clockwise me-1"></i> Tentar novamente
                                    </button>
                                </div>
                            ) : yieldPct === 0 ? (
                                <div className="text-center p-2">
                                    <p className="small text-warning mb-2">Não foi possível calcular dividendos.</p>
                                    <button className="btn btn-sm btn-outline-warning" onClick={() => onRetry && onRetry(ticker)}>
                                        <i className="bi bi-arrow-clockwise me-1"></i> Atualizar
                                    </button>
                                </div>
                            ) : (
                                <div className="d-flex justify-content-around">
                                    <div className="text-center pe-3 border-end border-secondary">
                                        <p className="small text-secondary mb-0">Renda Mensal</p>
                                        <p className="fw-bold mb-0 text-white">R$ {divMensal.toFixed(2)}</p>
                                        <p className="small mt-1 mb-0" style={{ color: '#8fe3a7' }}>
                                            + {cotasCompradasPorMes.toFixed(2)} cotas
                                        </p>
                                    </div>
                                    <div className="text-center ps-3">
                                        <p className="small text-secondary mb-0">Renda Anual</p>
                                        <p className="fw-bold mb-0 text-white">R$ {divAnual.toFixed(2)}</p>
                                        <p className="small mt-1 mb-0" style={{ color: '#8fe3a7' }}>
                                            + {cotasCompradasPorAno.toFixed(2)} cotas
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex align-items-center mt-2 px-1 py-1 bg-black rounded border border-secondary months-grid-container">
                                {rollingMonths.map((item, idx) => {
                                    const hasPaid = paidMonths.includes(item.monthIndex);
                                    const boxBg = hasPaid ? '#28a745' : '#212529';
                                    const textColor = hasPaid ? '#ffffff' : '#495057';
                                    const tooltipText = hasPaid
                                        ? `${item.full}/${item.year}: Pago nos últimos 12 meses`
                                        : `${item.full}/${item.year}: Sem provento nos últimos 12m`;
                                    const isYearTurn = idx < rollingMonths.length - 1 && item.year !== rollingMonths[idx + 1].year;

                                    return (
                                        <React.Fragment key={`${item.monthIndex}-${item.year}`}>
                                            <div
                                                tabIndex={0}
                                                className="month-box"
                                                style={{
                                                    height: '20px',
                                                    backgroundColor: boxBg,
                                                    color: textColor,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    position: 'relative'
                                                }}
                                            >
                                                {item.short}
                                                <span className="month-tooltip">{tooltipText}</span>
                                            </div>
                                            {isYearTurn && (
                                                <div
                                                    className="month-year-divider"
                                                    style={{ width: '1px', height: '16px', backgroundColor: '#6c757d', margin: '0 2px' }}
                                                    title="Virada de Ano"
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </details>
                    </div>

                <a href={brokerInfo.appUrl || brokerInfo.webUrl} target="_blank" rel="noopener noreferrer" 
                   className="btn w-100 d-flex align-items-center justify-content-center gap-2 asset-broker-link"
                   style={{ backgroundColor: brokerInfo.color, color: brokerInfo.textColor, border: 'none', fontWeight: 'bold', borderRadius: '8px', height: '45px' }}>
                   <i className="bi bi-box-arrow-up-right"></i> Operar na {brokerName}
                </a>
            </div>
        </div>
    );
}
