import React from 'react';
import { BROKERS } from '../utils/brokers.js';

export default function AssetCard({ asset, broker, isGuest, onEdit, onDelete, onRetry }) {
    const [isDyInfoOpen, setIsDyInfoOpen] = React.useState(false);
    const [isPvpInfoOpen, setIsPvpInfoOpen] = React.useState(false);
    const [activeMonthKey, setActiveMonthKey] = React.useState(null);
    const pvpInfoRef = React.useRef(null);
    const monthsContainerRef = React.useRef(null);

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

    React.useEffect(() => {
        const handleOutsideClick = (event) => {
            if (pvpInfoRef.current && !pvpInfoRef.current.contains(event.target)) {
                setIsPvpInfoOpen(false);
            }
            if (monthsContainerRef.current && !monthsContainerRef.current.contains(event.target)) {
                setActiveMonthKey(null);
            }
        };

        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    // Cálculo da Bola de Neve (Magic Number: quantas cotas pagam 1 nova cota/mês)
    const rendaMensalPorCota = currentPrice > 0 && yieldPct > 0 ? (currentPrice * (yieldPct / 100)) / 12 : 0;
    const cotasParaBolaDeNeve = rendaMensalPorCota > 0 && currentPrice > 0 ? Math.ceil(currentPrice / rendaMensalPorCota) : 0;
    const cotasFaltantes = Math.max(0, cotasParaBolaDeNeve - quantity);
    const cotasCompradasPorMes = divMensal > 0 && currentPrice > 0 ? Number((divMensal / currentPrice).toFixed(2)) : 0;
    const cotasCompradasPorAno = divAnual > 0 && currentPrice > 0 ? Number((divAnual / currentPrice).toFixed(1)) : 0;
    const isSnowballAchieved = cotasParaBolaDeNeve > 0 && quantity >= cotasParaBolaDeNeve;
    const snowballMessage = isSnowballAchieved 
        ? `[v] Bola de Neve! (${cotasParaBolaDeNeve} Cotas)` 
        : `[+] ${cotasFaltantes} p/ Bola de Neve (${cotasParaBolaDeNeve} cotas)`;
    const snowballColor = isSnowballAchieved ? '#8fe3a7' : '#ff8a8a';


    // Construção dos 12 meses rolantes
    const monthNamesFull = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthNamesShort = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

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

    const selectedMonthData = activeMonthKey 
        ? rollingMonths.find(item => `${item.monthIndex}-${item.year}` === activeMonthKey)
        : null;
    const selectedMonthHasPaid = selectedMonthData 
        ? paidMonths.includes(selectedMonthData.monthIndex) 
        : false;

    React.useEffect(() => {
        if (monthsContainerRef.current) {
            monthsContainerRef.current.scrollLeft = monthsContainerRef.current.scrollWidth;
        }
    }, []);

    // Régua Inteligente de Cores de P/VP: Diferenciando Ações de FIIs
    const isFii = ticker.toUpperCase().replace(/\.SA$/i, '').endsWith('11');
    const pvpValue = asset.pvp !== undefined && asset.pvp !== null ? Number(asset.pvp) : null;
    let pvpColorClass = 'text-secondary border-secondary';
    let pvpBadgeBg = 'rgba(255, 255, 255, 0.05)';

    if (pvpValue !== null && pvpValue > 0) {
        if (isFii) {
            // REGRA FIIs: Ativo físico/imóveis. 1.00 é paridade estrita.
            if (pvpValue < 1.00) {
                pvpColorClass = 'text-success border-success';
                pvpBadgeBg = 'rgba(40, 167, 69, 0.12)';
            } else if (pvpValue <= 1.05) {
                pvpColorClass = 'text-info border-info';
                pvpBadgeBg = 'rgba(13, 202, 240, 0.12)';
            } else {
                pvpColorClass = 'text-warning border-warning';
                pvpBadgeBg = 'rgba(255, 193, 7, 0.12)';
            }
        } else {
            // REGRA AÇÕES: Empresas acumulam caixa, marcas e crescimento. P/VP de 1.0 a 2.5 é muito comum e saudável.
            if (pvpValue < 1.00) {
                pvpColorClass = 'text-success border-success'; // Abaixo do valor contábil dos ativos
                pvpBadgeBg = 'rgba(40, 167, 69, 0.12)';
            } else if (pvpValue <= 2.20) {
                pvpColorClass = 'text-info border-info'; // Faixa saudável para empresas com dividendos (Bancos, Elétricas, Celulose)
                pvpBadgeBg = 'rgba(13, 202, 240, 0.12)';
            } else if (pvpValue <= 3.50) {
                pvpColorClass = 'text-light border-secondary'; // Múltiplo moderado de crescimento
                pvpBadgeBg = 'rgba(255, 255, 255, 0.08)';
            } else {
                pvpColorClass = 'text-warning border-warning'; // Ágio elevado sobre o patrimônio
                pvpBadgeBg = 'rgba(255, 193, 7, 0.12)';
            }
        }
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

                <div className="row border-top border-bottom border-secondary py-2 mb-3 text-center">
                    <div className="col-4 border-end border-secondary px-1">
                        <p className="price-label mb-0">P. Médio</p>
                        <p className="price-value mb-0">R$ {(asset.averagePrice || 0).toFixed(2)}</p>
                        <span className={`${profitTextClass} small`} style={{ fontSize: '0.72rem' }}>
                            ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)
                        </span>
                    </div>
                    <div className="col-4 border-end border-secondary px-1">
                        <p className="price-label mb-0">P. Atual</p>
                        <p className="price-value mb-0">R$ {currentPrice.toFixed(2)}</p>
                        <span className={`${dailyTextClass} small`} style={{ fontSize: '0.72rem' }}>
                            ({dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)}%)
                        </span>
                    </div>
                    <div className="col-4 px-1 position-relative">
                        <p className="price-label mb-0" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            P/VP
                            <span className="asset-pvp-info" ref={pvpInfoRef} style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                                <button
                                    type="button"
                                    className="btn btn-link p-0 text-secondary"
                                    style={{ fontSize: '0.75rem', lineHeight: 1 }}
                                    aria-label="Informações sobre P/VP"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsPvpInfoOpen(prev => !prev);
                                    }}
                                >
                                    <i className="bi bi-info-circle-fill"></i>
                                </button>
                                {isPvpInfoOpen && (
                                    <span
                                        className="position-absolute text-start p-2 shadow-lg"
                                        style={{
                                            bottom: '100%',
                                            right: '0',
                                            width: '210px',
                                            backgroundColor: '#212529',
                                            border: '1px solid #555',
                                            borderRadius: '8px',
                                            fontSize: '0.72rem',
                                            color: '#cbd5e1',
                                            zIndex: 1250,
                                            marginBottom: '6px'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <strong>Preço / Valor Patrimonial:</strong>
                                        <p className="mb-1 mt-1">Mede quanto o mercado paga sobre o patrimônio contábil do ativo:</p>
                                        <p className="mb-0" style={{ color: '#8fe3a7' }}>• <strong>&lt; 1.00:</strong> Desconto patrimonial</p>
                                        <p className="mb-0" style={{ color: '#6edff6' }}>• <strong>1.00 - {isFii ? '1.05' : '2.20'}:</strong> Preço justo / paridade</p>
                                        <p className="mb-0" style={{ color: '#ffd56b' }}>• <strong>&gt; {isFii ? '1.05' : '2.20'}:</strong> Ágio sobre o patrimônio</p>
                                    </span>
                                )}
                            </span>
                        </p>
                        <p className="price-value mb-0" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {pvpValue !== null && pvpValue > 0 ? (
                                <span 
                                    className={`badge border ${pvpColorClass}`} 
                                    style={{ backgroundColor: pvpBadgeBg, fontSize: '0.85rem', fontWeight: 'bold', padding: '1px 6px', lineHeight: 1.25 }}
                                    title={`P/VP: ${pvpValue.toFixed(2)}`}
                                >
                                    {pvpValue.toFixed(2)}
                                </span>
                            ) : (
                                <span 
                                    className="text-secondary" 
                                    style={{ fontSize: '0.85rem', fontWeight: 'bold' }}
                                    title="P/VP indisponível no momento"
                                >
                                    —
                                </span>
                            )}
                        </p>
                        <span className="small text-secondary" style={{ fontSize: '0.72rem', visibility: 'hidden' }}>
                            (0.00%)
                        </span>
                    </div>
                </div>

                <div className="bg-dark rounded p-2 text-center border border-secondary mb-3 mx-0 dividend-box-container position-relative">
                    <details
                        className="asset-dividends-details"
                        onToggle={(event) => {
                            const isOpen = event.currentTarget.open;
                            if (isOpen && monthsContainerRef.current) {
                                setTimeout(() => {
                                    if (monthsContainerRef.current) {
                                        monthsContainerRef.current.scrollLeft = monthsContainerRef.current.scrollWidth;
                                    }
                                }, 50);
                            }
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
                             {yieldPct > 0 ? (
                                 <>
                                     <span className="dy-text-full">Yield Anual: {yieldPct.toFixed(2)}%</span>
                                     <span className="dy-text-short">DY: {yieldPct.toFixed(2)}%</span>
                                 </>
                             ) : (
                                 <>
                                     <span className="dy-text-full">Sem dados de Dividendos</span>
                                     <span className="dy-text-short">Sem dados</span>
                                 </>
                             )}
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
                                        <p className="text-secondary dividend-label mb-0">~ Mensal</p>
                                        <p className="dividend-amount-val mb-0 text-white">R$ {divMensal.toFixed(2)}</p>
                                        <p className="dividend-shares-proj mb-0" style={{ color: '#8fe3a7' }}>
                                            + {cotasCompradasPorMes.toFixed(2)} cotas
                                        </p>
                                    </div>
                                    <div className="text-center ps-3">
                                        <p className="text-secondary dividend-label mb-0">~ Anual</p>
                                        <p className="dividend-amount-val mb-0 text-white">R$ {divAnual.toFixed(2)}</p>
                                        <p className="dividend-shares-proj mb-0" style={{ color: '#8fe3a7' }}>
                                            + {cotasCompradasPorAno.toFixed(2)} cotas
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div 
                                    ref={monthsContainerRef}
                                    className="d-flex align-items-center gap-1 mt-2 p-1 bg-black rounded border border-secondary months-grid-container" 
                                    style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}
                                >
                                {rollingMonths.map((item, idx) => {
                                    const monthKey = `${item.monthIndex}-${item.year}`;
                                    const hasPaid = paidMonths.includes(item.monthIndex);
                                    const boxBg = hasPaid ? '#28a745' : '#212529';
                                    const textColor = hasPaid ? '#ffffff' : '#555e68';
                                    const isYearTurn = idx < rollingMonths.length - 1 && item.year !== rollingMonths[idx + 1].year;
                                    const isSelected = activeMonthKey === monthKey;

                                    return (
                                        <React.Fragment key={monthKey}>
                                            <div
                                                tabIndex={0}
                                                className="month-box flex-shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMonthKey(prev => prev === monthKey ? null : monthKey);
                                                }}
                                                style={{
                                                    height: '22px',
                                                    flex: '0 0 calc((100% - 16px) / 5)',
                                                    maxWidth: 'calc((100% - 16px) / 5)',
                                                    minWidth: '40px',
                                                    backgroundColor: boxBg,
                                                    color: textColor,
                                                    fontSize: '0.68rem',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    border: isSelected 
                                                        ? '2px solid #6dffb8' 
                                                        : (hasPaid ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.04)'),
                                                    boxShadow: isSelected ? '0 0 8px rgba(109, 255, 184, 0.5)' : 'none',
                                                    transform: isSelected ? 'scale(1.05)' : 'none',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {item.short}
                                            </div>
                                            {isYearTurn && (
                                                <div
                                                    className="month-year-divider flex-shrink-0"
                                                    style={{ width: '1px', height: '16px', backgroundColor: '#6c757d', margin: '0 1px' }}
                                                    title="Virada de Ano"
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {selectedMonthData && (
                                <div 
                                    className="mt-2 py-1 px-2 rounded border border-secondary text-center shadow"
                                    style={{ 
                                        backgroundColor: '#1a1d20', 
                                        animation: 'fadeInPopover 0.15s ease-in-out',
                                        fontSize: '0.72rem'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <strong className="text-white">{selectedMonthData.full} / {selectedMonthData.year}</strong>
                                    <span className="mx-1 text-secondary">•</span>
                                    <span style={{ color: selectedMonthHasPaid ? '#8fe3a7' : '#adb5bd', fontWeight: 600 }}>
                                        {selectedMonthHasPaid ? 'Pago nos últimos 12 meses' : 'Sem provento nos últimos 12m'}
                                    </span>
                                </div>
                            )}
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
