import React, { useState } from 'react';
import { AssetService } from '../services/asset-service.js';

export default function PromptView({ assets = [], isGuest, mode = 'portfolio' }) {
    const [copyStatus, setCopyStatus] = useState('');

    const currency = value => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
    const percent = value => `${(Number(value) || 0) >= 0 ? '+' : ''}${(Number(value) || 0).toFixed(2)}%`;
    const recommended = mode === 'recommended';
    const summary = recommended ? null : AssetService.calculatePortfolioSummary(assets);
    const assetLines = assets.map(asset => {
        const marketData = asset.marketData ?? {};
        const quantity = Number(asset.quantity) || 0;
        const averagePrice = Number(asset.averagePrice) || 0;
        const currentPrice = Number(asset.currentPrice ?? marketData.price ?? marketData.regularMarketPrice) || 0;
        const yieldPct = Number(asset.yieldPct ?? marketData.yieldpct ?? marketData.yieldPct) || 0;
        const pvp = Number(asset.pvp ?? marketData.priceToBook ?? marketData.price_to_book);
        const snowballTarget = yieldPct > 0 ? Math.ceil(1200 / yieldPct) : 0;

        if (recommended) {
            const snowballStatus = snowballTarget > 0
                ? `${snowballTarget} cotas para gerar 1 nova cota/mês`
                : 'indeterminada (DY indisponível)';
            return `- ${asset.ticker}: ${asset.type ?? 'Ativo'} | preço atual ${currency(currentPrice)} | P/VP ${Number.isFinite(pvp) && pvp > 0 ? pvp.toFixed(2) : 'indisponível'} | DY ${yieldPct.toFixed(2)}% a.a. | bola de neve: ${snowballStatus}`;
        }

        const positionValue = currentPrice * quantity;
        const profit = (currentPrice - averagePrice) * quantity;
        const annualIncome = positionValue * yieldPct / 100;
        const monthlyIncome = annualIncome / 12;
        const snowballStatus = snowballTarget > 0
            ? quantity >= snowballTarget
                ? `atingida (${snowballTarget} cotas)`
                : `faltam ${snowballTarget - quantity} cotas (meta ${snowballTarget})`
            : 'indeterminada (DY indisponível)';
        const dataStatus = asset.dataError ? ' | dados de mercado com erro/possivelmente em cache' : '';

        return `- ${asset.ticker}: ${quantity} cotas | PM ${currency(averagePrice)} | atual ${currency(currentPrice)} | posição ${currency(positionValue)} | resultado ${currency(profit)} (${percent(averagePrice > 0 ? ((currentPrice / averagePrice) - 1) * 100 : 0)}) | hoje ${percent(asset.dailyChange)} | DY ${yieldPct.toFixed(2)}% a.a. | renda est. ${currency(monthlyIncome)}/mês, ${currency(annualIncome)}/ano | bola de neve: ${snowballStatus}${dataStatus}`;
    }).join('\n');
    const totalSnowballs = assets.filter(asset => Number(asset.yieldPct ?? asset.marketData?.yieldpct) > 0).length;
    const achievedSnowballs = assets.filter(asset => {
        const yieldPct = Number(asset.yieldPct ?? asset.marketData?.yieldpct) || 0;
        return yieldPct > 0 && (Number(asset.quantity) || 0) >= Math.ceil(1200 / yieldPct);
    }).length;

    const analysisGuidance = 'Avalie de forma objetiva e educativa, separe fatos de estimativas, não invente informações ausentes e não trate desempenho passado como garantia. Para cada ativo, analise a variação da cotação no mês atual (ou nos últimos 30 dias), notícias recentes e fatores macroeconômicos e específicos do setor; cite fontes e datas, diferencie fatos de hipóteses e informe quando não puder consultar dados atuais. Avalie sustentabilidade dos proventos, fundamentos, valuation, margem de segurança, riscos e perspectivas. Não decida apenas pelo maior DY, não prometa retorno e não apresente a análise como aconselhamento personalizado.';
    const prompt = recommended
        ? `Atue como analista financeiro sênior. Avalie a seguinte seleção de 10 ativos recomendados da B3 (Ações e FIIs) para iniciar uma estratégia de renda passiva com dividendos... ${analysisGuidance}\n\nConsidere os valores de DY, P/VP e preços informados como estimativas que podem estar defasadas. Avalie separadamente ações e FIIs, compare qualidade e riscos, explique a meta Bola de Neve de cada ativo e ordene as alternativas por adequação, sem presumir que maior DY significa melhor oportunidade.\n\nSELEÇÃO RECOMENDADA — ${new Date().toLocaleDateString('pt-BR')}\n${assetLines || 'A lista de recomendações ainda está sendo carregada.'}\n\nOs dados de mercado e as estimativas não garantem rendimentos futuros.`
        : `Atue como analista financeiro sênior, especialista em análise fundamentalista e carteiras previdenciárias de dividendos. ${analysisGuidance}\n\nAo final, apresente uma recomendação fundamentada sobre o que seria mais prudente comprar hoje para acumular dividendos progressivamente. Considere sustentabilidade dos proventos, saúde financeira e operacional, valuation, margem de segurança, riscos e concentração já existente. Leve em conta a meta de Bola de Neve e o equilíbrio da carteira; não invente orçamento ou meta de renda. Use princípios previdenciários associados à abordagem Barsi sem presumir que um ativo seja seguro apenas por pagar dividendos. Avalie FIIs considerando perfil, renda e riscos próprios.\n\nCARTEIRA — ${new Date().toLocaleDateString('pt-BR')}\nPatrimônio atual: ${currency(summary.currentValue)} | Investido: ${currency(summary.investedValue)} | Resultado não realizado: ${currency(summary.profit)} (${percent(summary.profitPct)}) | Variação estimada hoje: ${percent(summary.dailyChangePct)}\nRenda estimada pelo DY dos últimos 12 meses: ${currency(summary.annualDividends)}/ano (${currency(summary.annualDividends / 12)}/mês) | DY da carteira: ${summary.currentValue > 0 ? (summary.annualDividends / summary.currentValue * 100).toFixed(2) : '0.00'}% a.a. | Bola de neve atingida: ${achievedSnowballs}/${totalSnowballs} ativos com DY calculável\n\nATIVOS\n${assetLines || 'Nenhum ativo cadastrado.'}\n\nDY e rendas são estimativas, não garantias.`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopyStatus('Prompt copiado.');
        } catch (error) {
            console.error('Não foi possível copiar o prompt.', error);
            setCopyStatus('Não foi possível copiar. Selecione e copie o texto manualmente.');
        }
    };

    return (
        <section id={recommended ? 'recommended-prompt' : 'portfolio-prompt'} className="prompt-view d-flex flex-column align-items-center mt-5 mb-5" aria-label={recommended ? 'Análise das recomendações da B3 com inteligência artificial' : 'Análise da carteira com inteligência artificial'}>
            <div className="text-start bg-dark border border-secondary rounded p-3 w-100" style={{ maxWidth: '600px' }}>
                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                    <label htmlFor="portfolio-ai-prompt" className="text-secondary small fw-bold mb-0">
                        Copie o prompt e cole no Gemini:
                    </label>
                    <button type="button" onClick={handleCopy} className="btn btn-sm btn-outline-success border-0 px-2 py-1 flex-shrink-0">
                        <i className="bi bi-clipboard me-1" aria-hidden="true"></i>
                        Copiar
                    </button>
                </div>
                <textarea
                    id="portfolio-ai-prompt"
                    readOnly
                    value={prompt}
                    aria-label={recommended ? 'Prompt com análise dos ativos recomendados' : 'Prompt com o resumo atual da carteira'}
                    className="form-control bg-black text-white border-secondary font-monospace"
                    style={{ height: '180px', fontSize: '0.75rem', resize: 'none' }}
                />
                <p className="small text-secondary mb-0 mt-2" role="status" aria-live="polite">
                    {copyStatus}
                </p>
                <div className="d-flex justify-content-center mt-3">
                    <a
                        href="https://gemini.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm"
                    >
                        <i className="bi bi-stars me-2" aria-hidden="true"></i>
                        Pergunte ao Gemini
                    </a>
                </div>
            </div>
        </section>
    );
}
