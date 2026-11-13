function getLastBusinessDayOfNextMonth(referenceDate = new Date()) {
    const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 2, 0);
    while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
        lastDay.setDate(lastDay.getDate() - 1);
    }
    return lastDay.toLocaleDateString('pt-BR');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function formatCurrency(value) {
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

function fiiAlertHeader(assetName) {
    return `
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <strong class="text-white">${escapeHtml(assetName || 'Fundo Imobiliário')}</strong>
            <span class="badge text-bg-info">Fundo Imobiliário</span>
        </div>
    `;
}

function fiiAlertOptions({
    confirmButtonText,
    cancelButtonText,
    allowOutsideClick,
    showCloseButton
}) {
    return {
        showCancelButton: true,
        showCloseButton,
        allowOutsideClick,
        confirmButtonText,
        cancelButtonText,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        background: '#212529',
        color: '#ffffff',
        width: 'min(92vw, 600px)',
        customClass: {
            container: 'swal-darf-container',
            popup: 'border border-secondary shadow-lg rounded-4 p-3'
        }
    };
}

export function createFiiProfitTaxAlert({
    assetName,
    soldQuantity,
    profit,
    confirmButtonText,
    cancelButtonText,
    allowOutsideClick = true,
    showCloseButton = false
}) {
    const tax = profit * 0.20;
    const dueDate = getLastBusinessDayOfNextMonth();

    return {
        title: '💡 Você sabia? Venda de FII com Lucro',
        icon: 'info',
        html: `
            <div class="text-start">
                ${fiiAlertHeader(assetName)}
                <div class="small text-secondary mb-3">
                    FIIs não têm a isenção de R$ 20.000,00 aplicável às ações. Venda com lucro gera DARF.
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <div class="h-100 bg-black border border-secondary rounded-3 p-2">
                            <span class="d-block text-secondary small mb-1">Cotas vendidas</span>
                            <strong class="d-block text-white mb-2">${escapeHtml(soldQuantity)}</strong>
                            <span class="d-block text-secondary small mb-1">Lucro apurado</span>
                            <strong class="d-block text-white">${formatCurrency(profit)}</strong>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="h-100 bg-black border border-warning rounded-3 p-2 d-flex flex-column justify-content-center">
                            <span class="text-secondary small mb-1">DARF estimado</span>
                            <strong class="text-warning fs-5">${formatCurrency(tax)} (20%)</strong>
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 small bg-black border border-secondary rounded-3 p-2 mb-3">
                    <span>1️⃣ SicalcWeb</span>
                    <span>2️⃣ Cód. 6015</span>
                    <span>3️⃣ Vencimento: último dia útil do mês subsequente (${dueDate})</span>
                </div>
                <a class="btn btn-outline-info w-100 py-2 fw-bold" href="https://sicalc.receita.fazenda.gov.br/" target="_blank" rel="noopener noreferrer">
                    <i class="bi bi-box-arrow-up-right me-1" aria-hidden="true"></i> Abrir SicalcWeb
                </a>
            </div>
        `,
        ...fiiAlertOptions({
            confirmButtonText,
            cancelButtonText,
            allowOutsideClick,
            showCloseButton
        })
    };
}

export function createFiiLossAlert({
    assetName,
    soldQuantity,
    loss,
    confirmButtonText,
    cancelButtonText = 'Revisar edição',
    allowOutsideClick = true,
    showCloseButton = false
}) {
    return {
        title: '💡 Venda de FII com Prejuízo',
        icon: 'info',
        html: `
            <div class="text-start">
                ${fiiAlertHeader(assetName)}
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <div class="h-100 bg-black border border-secondary rounded-3 p-2">
                            <span class="d-block text-secondary small mb-1">Cotas vendidas</span>
                            <strong class="text-white">${escapeHtml(soldQuantity)}</strong>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="h-100 bg-black border border-danger rounded-3 p-2">
                            <span class="d-block text-secondary small mb-1">Prejuízo apurado</span>
                            <strong class="text-danger">${formatCurrency(Math.abs(loss))}</strong>
                        </div>
                    </div>
                </div>
                <div class="small bg-black border border-secondary rounded-3 p-3">
                    <p class="mb-2">Não há imposto nem DARF a pagar sobre esta operação.</p>
                    <p class="mb-0">Anote o prejuízo acumulado de <strong>${formatCurrency(Math.abs(loss))}</strong> para abater de lucros em futuras vendas de FIIs na declaração anual.</p>
                </div>
            </div>
        `,
        ...fiiAlertOptions({
            confirmButtonText,
            cancelButtonText,
            allowOutsideClick,
            showCloseButton
        })
    };
}
