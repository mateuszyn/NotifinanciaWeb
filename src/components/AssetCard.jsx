import React from 'react';
import { BROKERS } from '../utils/brokers.js';
import { TICKER_DATA } from '../utils/ticker-data.js'; // Importando o dicionário enriquecido com segmentos[cite: 3]
import { getSegmentDetails } from '../utils/segment-icon.js';

export default function AssetCard({
    asset,
    broker,
    onEdit,
    onDelete,
    onRetry,
    mode = 'portfolio',
    onAddRecommended
}) {
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
    const paidDividendEvents = asset.paidDividends || asset.paid_dividends;
    const hasDividendEventHistory = Array.isArray(paidDividendEvents);
    const paidDividends = hasDividendEventHistory
        ? paidDividendEvents
        : [];

    // Metadados do ativo (Nome e Segmento do dicionário)[cite: 3]
    const cleanTicker = ticker ? ticker.toUpperCase().replace(/\.SA$/i, '').trim() : '';
    const assetMeta = TICKER_DATA[cleanTicker] || {
        name: asset.name || ticker,
        segment: 'Geral',
        type: asset.type || 'Ação'
    };
    const segmentInfo = getSegmentDetails(assetMeta.segment);
    const corporateName = asset.name || assetMeta.name || ticker;
    const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
    const googleSearchUrl = query => `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    const handleShowSegmentModal = (e) => {
        e.stopPropagation();
        if (window.Swal) {
            window.Swal.fire({
                title: `<i class="bi ${segmentInfo.icon} text-primary me-2"></i>${segmentInfo.title}`,
                html: `
                    <div class="text-start mt-2 mb-1">
                        <p class="mb-2 text-white fw-bold">${escapeHtml(corporateName)} (${escapeHtml(cleanTicker)})</p>
                        <p class="mb-2" style="color: #e2e8f0; font-size: 0.92rem; line-height: 1.5;">
                            ${escapeHtml(segmentInfo.description)}
                        </p>
                        <div class="p-2 rounded bg-black border border-secondary text-secondary mt-3" style="font-size: 0.78rem;">
                            <span class="text-white fw-bold">Atuação:</span> ${escapeHtml(assetMeta.segment)} (${escapeHtml(assetMeta.type || 'Ativo')})
                        </div>
                        <a class="btn btn-outline-info btn-sm mt-3" href="${googleSearchUrl(`${cleanTicker} relatório gerencial canal RI`)}" target="_blank" rel="noopener noreferrer">
                            <i class="bi bi-search me-1"></i> Pesquisar relatório gerencial e canal de RI
                        </a>
                    </div>
                `,
                confirmButtonColor: '#0d6efd',
                confirmButtonText: 'Entendi',
                background: '#212529',
                color: '#fff',
                customClass: {
                    popup: 'border border-secondary shadow-lg rounded-4'
                }
            });
        }
    };

    const handleShowDyInfo = event => {
        event.preventDefault();
        event.stopPropagation();
        window.Swal.fire({
            title: 'Como o Dividend Yield é calculado?',
            html: `
                <div class="text-start">
                    <p>O DY considera a soma dos proventos por cota pagos nos últimos 12 meses dividida pela cotação atual, multiplicada por 100.</p>
                    <p class="mb-3">Os dados de proventos da B3 são consultados via Yahoo Finance; o indicador é histórico e não garante rendimentos futuros.</p>
                    <a class="btn btn-outline-success btn-sm" href="${googleSearchUrl(`${cleanTicker} dividendos proventos status invest`)}" target="_blank" rel="noopener noreferrer">
                        <i class="bi bi-google me-1"></i> Pesquisar histórico de ${escapeHtml(cleanTicker)}
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

    const handleMonthClick = item => {
        const monthEvents = paidDividends.filter(payment => (
            Number(payment.year) === item.year && Number(payment.month) === item.monthIndex
        ));
        const hasPayment = (
            hasDividendEventHistory && monthEvents.length > 0
        ) || paidMonths.includes(item.monthIndex);
        const amountPerShare = monthEvents.reduce(
            (total, event) => total + (Number(event.amount) || 0),
            0
        );
        const dataComDates = monthEvents
            .map(event => event.dateCom)
            .filter(Boolean)
            .map(date => new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR'));
        const searchUrl = googleSearchUrl(
            `${cleanTicker} data com dividendos ${item.full} ${item.year}`
        );
        const dataComRule = isFii
            ? 'Para FIIs, a Data-Com costuma ser o último dia útil do mês definido para a distribuição.'
            : 'Para ações, a Data-Com é definida pelo conselho de administração em cada anúncio.';

        window.Swal.fire({
            title: `${escapeHtml(cleanTicker)} • ${item.full} ${item.year}`,
            html: hasPayment && monthEvents.length > 0
                ? `
                    <div class="text-start">
                        <p class="mb-2">Total histórico pago por cota: <strong class="text-success">R$ ${amountPerShare.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</strong></p>
                        <p class="mb-2">Estimativa para ${quantity} cotas atuais: <strong class="text-white">R$ ${(amountPerShare * quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                        <p class="small text-secondary">${dataComDates.length > 0
                            ? `Data-Com registrada no histórico: ${dataComDates.join(', ')}.`
                            : 'O evento detalhado não informa a Data-Com.'}</p>
                        <p class="small text-secondary">${dataComRule} Confirme sempre a data oficial no comunicado do emissor.</p>
                        <a class="btn btn-outline-info btn-sm" href="${searchUrl}" target="_blank" rel="noopener noreferrer">
                            <i class="bi bi-google me-1"></i> Buscar Data-Com oficial
                        </a>
                    </div>
                `
                : hasPayment
                    ? `
                        <div class="text-start">
                            <p>Este mês tem distribuição histórica registrada na B3. Não há evento unitário disponível na API.</p>
                            <p class="mb-2">Estimativa mensal: <strong class="text-success">~ R$ ${rendaMensalPorCota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</strong> por cota, ou <strong class="text-white">~ R$ ${(rendaMensalPorCota * quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> para ${quantity} cotas atuais.</p>
                            <p class="small text-secondary">${dataComRule} Consulte o link para checar a Data-Com oficial.</p>
                            <a class="btn btn-outline-info btn-sm" href="${searchUrl}" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-google me-1"></i> Buscar Data-Com oficial
                            </a>
                        </div>
                    `
                : `
                    <div class="text-start">
                        <p>Não há registro de distribuição de proventos para este mês no histórico disponível.</p>
                        <a class="btn btn-outline-info btn-sm" href="${searchUrl}" target="_blank" rel="noopener noreferrer">
                            <i class="bi bi-google me-1"></i> Consultar proventos e Data-Com
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

    const handleShowPvpInfo = event => {
        event.stopPropagation();
        window.Swal.fire({
            title: 'Como interpretar o P/VP?',
            html: `
                <div class="text-start">
                    <p><strong>Preço / Valor Patrimonial</strong> indica quanto o mercado paga em relação ao patrimônio contábil do ativo.</p>
                    <p class="mb-1" style="color: #8fe3a7"><strong>&lt; 1,00:</strong> desconto patrimonial</p>
                    <p class="mb-1" style="color: #6edff6"><strong>1,00 - ${isFii ? '1,05' : '2,20'}:</strong> preço justo / paridade</p>
                    <p class="mb-0" style="color: #ffd56b"><strong>&gt; ${isFii ? '1,05' : '2,20'}:</strong> ágio sobre o patrimônio</p>
                </div>
            `,
            confirmButtonText: 'Entendi',
            confirmButtonColor: '#198754',
            background: '#212529',
            color: '#ffffff',
            customClass: {
                popup: 'border border-secondary shadow-lg rounded-4'
            }
        });
    };

    // Cálculo da Bola de Neve (Magic Number)
    const rendaMensalPorCota = currentPrice > 0 && yieldPct > 0 ? (currentPrice * (yieldPct / 100)) / 12 : 0;
    const cotasParaBolaDeNeve = rendaMensalPorCota > 0 && currentPrice > 0 ? Math.ceil(currentPrice / rendaMensalPorCota) : 0;
    const cotasMeta = cotasParaBolaDeNeve > 0 ? cotasParaBolaDeNeve : 1;
    const rendaMensalBolaDeNeve = currentPrice > 0 && yieldPct > 0
        ? (currentPrice * (yieldPct / 100) / 12) * cotasMeta
        : 0;
    const rendaAnualBolaDeNeve = rendaMensalBolaDeNeve * 12;
    const custoBolaDeNeve = cotasParaBolaDeNeve * currentPrice;
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

    // Régua Inteligente de Cores de P/VP
    const isFii = assetMeta.type === 'FII';
    const useSnowballDividendSummary = mode === 'radar';
    const pvpValue = asset.pvp !== undefined && asset.pvp !== null ? Number(asset.pvp) : null;
    let pvpColorClass = 'text-secondary border-secondary';
    let pvpBadgeBg = 'rgba(255, 255, 255, 0.05)';

    if (pvpValue !== null && pvpValue > 0) {
        if (isFii) {
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
            if (pvpValue < 1.00) {
                pvpColorClass = 'text-success border-success';
                pvpBadgeBg = 'rgba(40, 167, 69, 0.12)';
            } else if (pvpValue <= 2.20) {
                pvpColorClass = 'text-info border-info';
                pvpBadgeBg = 'rgba(13, 202, 240, 0.12)';
            } else if (pvpValue <= 3.50) {
                pvpColorClass = 'text-light border-secondary';
                pvpBadgeBg = 'rgba(255, 255, 255, 0.08)';
            } else {
                pvpColorClass = 'text-warning border-warning';
                pvpBadgeBg = 'rgba(255, 193, 7, 0.12)';
            }
        }
    }

    const cardId = `asset-card-${cleanTicker}`;

    return (
        <div id={cardId} className="asset-card-wrapper">
            <div className={`asset-card ${borderClass}`}>
                <div className="d-flex justify-content-between align-items-center mb-3 asset-card-header">
                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <h4 className="m-0 fw-bold">{ticker}</h4>
                        {assetMeta.segment && (
                            <button 
                                type="button"
                                className="badge border d-inline-flex align-items-center gap-1 asset-segment-btn"
                                onClick={handleShowSegmentModal}
                                title={`Clique para ver detalhes: ${assetMeta.segment}`}
                                aria-label={`Informações do segmento: ${assetMeta.segment}`}
                            >
                                <i className={`bi ${segmentInfo.icon}`}></i>
                                <span
                                    className="d-none d-sm-inline ms-1"
                                    style={{
                                        maxWidth: '85px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        verticalAlign: 'middle'
                                    }}
                                >
                                    {assetMeta.segment.split('/')[0].trim()}
                                </span>
                            </button>
                        )}
                    </div>
                    <div className="d-flex gap-3 align-items-center asset-card-actions flex-shrink-0">
                        {mode === 'radar' ? null : (
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
                        {mode === 'radar' ? (
                            <div className="mb-2">
                                <span className="small text-secondary text-uppercase fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                                    Meta Bola de Neve
                                </span>
                                <p className="price-value mb-0 text-success fw-bold">R$ {custoBolaDeNeve.toFixed(2)}</p>
                                <span className="small text-secondary" style={{ fontSize: '0.75rem' }}>
                                    ({cotasParaBolaDeNeve} cotas para gerar 1 nova cota/mês)
                                </span>
                            </div>
                        ) : (
                            <>
                                <p className="price-value mb-0">Total: R$ {(quantity * currentPrice).toFixed(2)}</p>
                                <p className="small text-secondary fw-bold mb-1">QTD: {quantity}</p>
                            </>
                        )}
                        {mode !== 'radar' && cotasParaBolaDeNeve > 0 && (
                            <p className="small mb-0" style={{ fontSize: '0.72rem', color: snowballColor }}>
                                {snowballMessage}
                            </p>
                        )}
                    </div>
                </div>

                <div className="row border-top border-bottom border-secondary py-2 mb-3 text-center">
                    {mode !== 'radar' && (
                        <div className="col-4 border-end border-secondary px-1">
                            <p className="price-label mb-0">P. Médio</p>
                            <p className="price-value mb-0">R$ {(asset.averagePrice || 0).toFixed(2)}</p>
                            <span className={`${profitTextClass} small`} style={{ fontSize: '0.72rem' }}>
                                ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)
                            </span>
                        </div>
                    )}
                    <div className={`${mode === 'radar' ? 'col-6' : 'col-4'} border-end border-secondary px-1`}>
                        <p className="price-label mb-0">P. Atual</p>
                        {mode === 'radar' ? (
                            <p className="price-value mb-0" style={{ fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                                R$ {currentPrice.toFixed(2)}{' '}
                                <span className={`${dailyTextClass} small`} style={{ fontSize: '0.72rem' }}>
                                    ({dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)}%)
                                </span>
                            </p>
                        ) : (
                            <>
                                <p className="price-value mb-0">R$ {currentPrice.toFixed(2)}</p>
                                <span className={`${dailyTextClass} small`} style={{ fontSize: '0.72rem' }}>
                                    ({dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)}%)
                                </span>
                            </>
                        )}
                    </div>
                    <div className={`${mode === 'radar' ? 'col-6' : 'col-4'} px-1 position-relative`}>
                        <p className="price-label mb-0" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            P/VP
                            <span className="asset-pvp-info" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                                <button
                                    type="button"
                                    className="btn btn-link p-0 text-secondary"
                                    style={{ fontSize: '0.75rem', lineHeight: 1 }}
                                    aria-label="Informações sobre P/VP"
                                    onClick={handleShowPvpInfo}
                                >
                                    <i className="bi bi-info-circle-fill"></i>
                                </button>
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
                                <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>—</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Bloco de Dividendos e Meses */}
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
                                        onClick={handleShowDyInfo}
                                    >
                                        <i className="bi bi-info-circle-fill" aria-hidden="true"></i>
                                    </button>
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
                                        <p className="text-secondary dividend-label mb-0">
                                            {useSnowballDividendSummary ? '~ Mensal na Meta' : '~ Mensal'}
                                        </p>
                                        <p className="dividend-amount-val mb-0 text-white">
                                            R$ {(useSnowballDividendSummary ? rendaMensalBolaDeNeve : divMensal).toFixed(2)}
                                        </p>
                                        <p className="dividend-shares-proj mb-0" style={{ color: '#8fe3a7' }}>
                                            {mode === 'radar' ? '+ 1 cota/mês' : `+ ${cotasCompradasPorMes.toFixed(2)} cotas`}
                                        </p>
                                    </div>
                                    <div className="text-center ps-3">
                                        <p className="text-secondary dividend-label mb-0">
                                            {useSnowballDividendSummary ? '~ Anual na Meta' : '~ Anual'}
                                        </p>
                                        <p className="dividend-amount-val mb-0 text-white">
                                            R$ {(useSnowballDividendSummary ? rendaAnualBolaDeNeve : divAnual).toFixed(2)}
                                        </p>
                                        <p className="dividend-shares-proj mb-0" style={{ color: '#8fe3a7' }}>
                                            {mode === 'radar' ? '+ 12 cotas/ano' : `+ ${cotasCompradasPorAno.toFixed(2)} cotas`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex align-items-center gap-1 mt-2 p-1 bg-black rounded border border-secondary months-grid-container">
                                {rollingMonths.map(item => {
                                    const hasPaid = (hasDividendEventHistory && paidDividends.some(payment => (
                                        Number(payment.year) === item.year && Number(payment.month) === item.monthIndex
                                    ))) || paidMonths.includes(item.monthIndex);
                                    const boxBg = hasPaid ? '#28a745' : '#212529';
                                    const textColor = hasPaid ? '#ffffff' : '#555e68';
                                    const monthKey = `${item.monthIndex}-${item.year}`;

                                    return (
                                        <button
                                            key={monthKey}
                                            type="button"
                                            className="month-box"
                                            onClick={() => handleMonthClick(item)}
                                            aria-label={`${item.full} ${item.year}${hasPaid ? ', com proventos' : ', sem proventos registrados'}`}
                                            style={{
                                                height: '22px',
                                                flex: '0 0 calc((100% - 20px) / 6)',
                                                minWidth: 0,
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
                                                border: hasPaid ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.04)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {item.short}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </details>
                </div>

                {mode === 'radar' ? (
                    <button
                        type="button"
                        className="btn btn-success w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                        style={{ height: '45px', borderRadius: '8px' }}
                        onClick={() => onAddRecommended?.(cleanTicker, asset)}
                    >
                        <i className="bi bi-plus-circle-fill"></i> Adicionar à Carteira
                    </button>
                ) : (
                    <a href={brokerInfo.appUrl || brokerInfo.webUrl} target="_blank" rel="noopener noreferrer"
                       className="btn w-100 d-flex align-items-center justify-content-center gap-2 asset-broker-link"
                       style={{ backgroundColor: brokerInfo.color, color: brokerInfo.textColor, border: 'none', fontWeight: 'bold', borderRadius: '8px', height: '45px' }}>
                        <i className="bi bi-box-arrow-up-right"></i> Operar na {brokerName}
                    </a>
                )}
            </div>
        </div>
    );
}