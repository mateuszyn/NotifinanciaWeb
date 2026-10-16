import React, { useState } from 'react';
import { AssetService } from '../services/asset-service.js';

export default function PromptView({ assets, isGuest }) {
    const [copyStatus, setCopyStatus] = useState('');

    if (isGuest) return null;

    const summary = AssetService.calculatePortfolioSummary(assets);
    const currency = value => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
    const percent = value => `${(Number(value) || 0) >= 0 ? '+' : ''}${(Number(value) || 0).toFixed(2)}%`;
    const assetLines = assets.map(asset => {
        const quantity = Number(asset.quantity) || 0;
        const averagePrice = Number(asset.averagePrice) || 0;
        const currentPrice = Number(asset.currentPrice) || 0;
        const yieldPct = Number(asset.yieldPct) || 0;
        const positionValue = currentPrice * quantity;
        const profit = (currentPrice - averagePrice) * quantity;
        const annualIncome = positionValue * yieldPct / 100;
        const monthlyIncome = annualIncome / 12;
        const snowballTarget = yieldPct > 0 ? Math.ceil(1200 / yieldPct) : 0;
        const snowballStatus = snowballTarget > 0
            ? quantity >= snowballTarget
                ? `atingida (${snowballTarget} cotas)`
                : `faltam ${snowballTarget - quantity} cotas (meta ${snowballTarget})`
            : 'indeterminada (DY indisponível)';
        const dataStatus = asset.dataError ? ' | dados de mercado com erro/possivelmente em cache' : '';

        return `- ${asset.ticker}: ${quantity} cotas | PM ${currency(averagePrice)} | atual ${currency(currentPrice)} | posição ${currency(positionValue)} | resultado ${currency(profit)} (${percent(averagePrice > 0 ? ((currentPrice / averagePrice) - 1) * 100 : 0)}) | hoje ${percent(asset.dailyChange)} | DY ${yieldPct.toFixed(2)}% a.a. | renda est. ${currency(monthlyIncome)}/mês, ${currency(annualIncome)}/ano | bola de neve: ${snowballStatus}${dataStatus}`;
    }).join('\n');
    const totalSnowballs = assets.filter(asset => Number(asset.yieldPct) > 0).length;
    const achievedSnowballs = assets.filter(asset => {
        const yieldPct = Number(asset.yieldPct) || 0;
        return yieldPct > 0 && (Number(asset.quantity) || 0) >= Math.ceil(1200 / yieldPct);
    }).length;

    const prompt = `Atue como analista financeiro sênior, especialista em análise fundamentalista e carteiras previdenciárias de dividendos. Analise os dados abaixo de forma objetiva e educativa. Separe fatos de estimativas, aponte concentração, riscos e pontos fortes, e não invente informações ausentes nem trate desempenho passado como garantia.\n\nPara cada ativo, faça também uma análise da variação da cotação no mês atual (ou nos últimos 30 dias, se o mês ainda estiver em andamento), pesquisando notícias recentes e fatores macroeconômicos e específicos da empresa/setor que possam explicar o movimento. Cite fontes e datas, diferencie fatos de hipóteses e informe claramente se não conseguir consultar dados ou notícias atuais. Não atribua causalidade sem evidência.\n\nAo final, apresente uma recomendação fundamentada sobre o que seria mais prudente comprar hoje para acumular dividendos progressivamente. Não decida apenas pelo maior DY: avalie sustentabilidade e qualidade dos proventos, saúde financeira e operacional atual, valuation/preço e margem de segurança, perspectivas e riscos do setor, notícias, situação macroeconômica, variação dos ativos e concentração já existente nesta carteira. Leve em conta a meta de Bola de Neve indicada e o equilíbrio da carteira; se não houver uma meta de renda ou orçamento de aporte informado, diga isso e não invente valores. Use como referência princípios de investimento previdenciário associados à abordagem Barsi — empresas sólidas, geração de caixa e dividendos sustentáveis com disciplina de preço — sem presumir que um ativo seja seguro apenas por pagar dividendos. Avalie os FIIs com os mesmos critérios de qualidade, risco e preço, reconhecendo que podem contribuir para renda mensal, mesmo que tenham perfil diferente de ações. Diga claramente se compraria hoje, esperaria ou não recomendaria cada alternativa mais relevante; ordene as opções, justifique prós e contras e indique quais dados faltam ou que condições mudariam a decisão. Não prometa retorno nem apresente a análise como garantia ou aconselhamento personalizado.\n\nCARTEIRA — ${new Date().toLocaleDateString('pt-BR')}\nPatrimônio atual: ${currency(summary.currentValue)} | Investido: ${currency(summary.investedValue)} | Resultado não realizado: ${currency(summary.profit)} (${percent(summary.profitPct)}) | Variação estimada hoje: ${percent(summary.dailyChangePct)}\nRenda estimada pelo DY dos últimos 12 meses: ${currency(summary.annualDividends)}/ano (${currency(summary.annualDividends / 12)}/mês) | DY da carteira: ${summary.currentValue > 0 ? (summary.annualDividends / summary.currentValue * 100).toFixed(2) : '0.00'}% a.a. | Bola de neve atingida: ${achievedSnowballs}/${totalSnowballs} ativos com DY calculável\n\nATIVOS\n${assetLines || 'Nenhum ativo cadastrado.'}\n\nDY e rendas são estimativas, não garantias.`;

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
        <section id="portfolio-prompt" className="prompt-view d-flex flex-column align-items-center mt-5 mb-5" aria-label="Análise da carteira com inteligência artificial">
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
                    aria-label="Prompt com o resumo atual da carteira"
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
