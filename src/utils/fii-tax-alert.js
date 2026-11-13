function getLastBusinessDayOfNextMonth(referenceDate = new Date()) {
    const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 2, 0);
    while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
        lastDay.setDate(lastDay.getDate() - 1);
    }
    return lastDay.toLocaleDateString('pt-BR');
}

export function createFiiProfitTaxAlert({
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
                <p>FIIs não têm a isenção de R$ 20.000,00 aplicável às ações: qualquer venda de cotas com lucro gera DARF.</p>
                <p class="mb-1">Cotas vendidas: <strong>${soldQuantity}</strong></p>
                <p class="mb-1">Lucro apurado: <strong>R$ ${profit.toFixed(2).replace('.', ',')}</strong></p>
                <p>Valor estimado do DARF (20%): <strong class="text-warning">R$ ${tax.toFixed(2).replace('.', ',')}</strong></p>
                <p class="fw-bold mb-1">Como emitir e pagar:</p>
                <ol class="small ps-3 mb-3">
                    <li>Acesse o SicalcWeb.</li>
                    <li>Informe o código 6015 e o valor do imposto.</li>
                    <li>Pague até o último dia útil do mês seguinte (${dueDate}).</li>
                </ol>
                <a class="btn btn-outline-info btn-sm" href="https://sicalc.receita.fazenda.gov.br/" target="_blank" rel="noopener noreferrer">
                    <i class="bi bi-box-arrow-up-right me-1"></i> Abrir SicalcWeb
                </a>
            </div>
        `,
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
        customClass: { popup: 'border border-secondary shadow-lg rounded-4' }
    };
}
