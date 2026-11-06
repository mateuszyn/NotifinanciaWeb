import React, { useEffect, useState } from 'react';

export default function QuickAddModal({ asset, onClose, onSave }) {
    const [quantity, setQuantity] = useState(10);
    const [averagePrice, setAveragePrice] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!asset) return;
        const isFii = asset.type === 'FII';
        setQuantity(isFii ? 1 : 10);
        setAveragePrice(String(Number(asset.currentPrice) || ''));
        setSaving(false);
        setError('');
    }, [asset]);

    if (!asset) return null;

    const quantityValue = Number(quantity || 0);
    const averagePriceValue = Number(averagePrice || 0);
    const totalApprox = quantityValue * averagePriceValue;
    const yieldPct = Number(asset.yieldPct) || 0;
    const magicNumber = yieldPct > 0 ? Math.ceil(1200 / yieldPct) : 0;
    const magicNumberCost = magicNumber * Number(averagePrice || asset.currentPrice || 0);
    const adjustQuantity = delta => {
        setQuantity(current => Math.max(1, Number(current || 0) + delta));
    };

    const handleSubmit = async event => {
        event.preventDefault();
        const cleanQuantity = Number(quantity);
        const cleanAveragePrice = Number(averagePrice);

        if (!Number.isFinite(cleanQuantity) || cleanQuantity <= 0) {
            setError('Informe uma quantidade maior que zero.');
            return;
        }
        if (!Number.isFinite(cleanAveragePrice) || cleanAveragePrice <= 0) {
            setError('Informe um preço médio maior que zero.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            await onSave({
                ticker: asset.ticker,
                quantity: cleanQuantity,
                averagePrice: cleanAveragePrice,
                currentPrice: asset.currentPrice,
                dailyChange: asset.dailyChange,
                yieldPct: asset.yieldPct,
                pvp: asset.pvp,
                type: asset.type,
                paidMonths: asset.paidMonths
            });
            onClose();
            window.Swal.fire({
                icon: 'success',
                title: 'Adicionado!',
                text: `${asset.ticker} já está na sua carteira.`,
                timer: 1800,
                showConfirmButton: false
            });
        } catch (saveError) {
            setError(saveError.message || 'Não foi possível adicionar o ativo à carteira.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="modal-overlay active"
            id="quick-add-modal-overlay"
            onClick={event => event.target.id === 'quick-add-modal-overlay' && !saving && onClose()}
        >
            <div className="custom-modal" role="dialog" aria-modal="true" aria-labelledby="quick-add-modal-title">
                <h2 id="quick-add-modal-title" className="modal-title text-white fs-5 mb-4 border-bottom border-secondary pb-2">
                    Adicionar <span className="text-success fw-bold">{asset.ticker}</span> à Carteira
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group mb-3">
                        <label htmlFor="quick-add-average-price" className="small text-secondary fw-bold mb-1">
                            Preço Médio (R$)
                        </label>
                        <input
                            id="quick-add-average-price"
                            type="number"
                            className="form-control bg-black border-secondary quick-add-suggested-price"
                            style={{ color: '#b8c0cc' }}
                            required
                            min="0.01"
                            step="0.01"
                            value={averagePrice}
                            onChange={event => setAveragePrice(event.target.value)}
                            aria-describedby="quick-add-price-hint"
                        />
                        <small id="quick-add-price-hint" className="text-secondary">Preço atual sugerido; você pode editá-lo.</small>
                    </div>

                    <div className="form-group mb-3">
                        <label htmlFor="quick-add-quantity" className="small text-secondary fw-bold mb-1">
                            Quantidade
                        </label>
                        <input
                            id="quick-add-quantity"
                            type="number"
                            className="form-control bg-black text-white border-secondary"
                            required
                            min="1"
                            step="1"
                            value={quantity}
                            onChange={event => setQuantity(event.target.value)}
                        />
                        <div className="d-flex gap-2 mt-2">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm flex-grow-1"
                                onClick={() => adjustQuantity(-1)}
                            >
                                -1
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm flex-grow-1"
                                onClick={() => adjustQuantity(-10)}
                            >
                                -10
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-success btn-sm flex-grow-1"
                                onClick={() => adjustQuantity(10)}
                            >
                                +10
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-success btn-sm flex-grow-1"
                                onClick={() => adjustQuantity(100)}
                            >
                                +100
                            </button>
                        </div>
                    </div>

                    <div className="small text-secondary mb-3">
                        <div>Total aproximado: <strong className="text-white">R$ {totalApprox.toFixed(2)}</strong></div>
                        {magicNumber > 0 && (
                            <div className="mt-1">
                                Meta Bola de Neve: <strong className="text-success">
                                    {magicNumber} cotas (R$ {magicNumberCost.toFixed(2)})
                                </strong>
                            </div>
                        )}
                    </div>

                    {error && <p className="text-danger small mb-3" role="alert">{error}</p>}

                    <div className="d-flex gap-3">
                        <button
                            type="button"
                            className="btn btn-outline-secondary flex-grow-1 fw-bold py-2"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-success flex-grow-1 fw-bold py-2" disabled={saving}>
                            {saving ? 'Salvando...' : 'Confirmar e Salvar na Carteira'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
